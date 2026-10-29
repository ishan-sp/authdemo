import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authenticate, COOKIE_NAME } from '../middleware/authenticate.js';
import { PERMISSIONS } from '../middleware/authorize.js';

const router = Router();
const SALT_ROUNDS = 10;
const SESSION_HOURS = 2;

// ── Sign up ──────────────────────────────────────────────────
// We NEVER store the raw password. bcrypt adds a random salt and
// hashes it, so two users with the same password get different hashes.
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    // New accounts get the default role ('basic') from the table definition.
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role`,
      [name, email.toLowerCase(), passwordHash]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    throw err;
  }
});

// ── Log in  (this is AUTHENTICATION) ─────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // 1. Find the user by email.
  const { rows } = await pool.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = rows[0];

  // 2. Compare the typed password against the stored hash.
  //    Same error for "no such email" and "wrong password", so attackers
  //    can't find out which emails are registered.
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // 3. Issue a signed token that proves who they are on future requests.
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: `${SESSION_HOURS}h`,
  });

  // 4. Store it in an httpOnly cookie — JavaScript on the page can't read it.
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  });

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ── Who am I? ────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: req.user,
    permissions: PERMISSIONS[req.user.role] ?? [],
    session: req.session,
  });
});

export default router;
