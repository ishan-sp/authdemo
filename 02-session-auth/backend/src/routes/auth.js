import { Router } from 'express';
import bcrypt from 'bcrypt';
import { users, sessions, audit } from '../db.js';
import { COOKIE_NAME, IDLE_MS, createSession, requireSession } from '../middleware/session.js';

const router = Router();

// ── Log in ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await users.findOne({ email: email.toLowerCase() });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    await audit(email, 'login_failed', email, 'Wrong email or password');
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  if (user.status === 'banned') {
    await audit(user.email, 'login_blocked', user.email, 'Account is banned');
    return res.status(403).json({ error: 'This account has been suspended. Please contact support.' });
  }

  // A brand-new id on every login (never reuse one), which prevents
  // "session fixation" attacks.
  const sid = await createSession(user, req);

  res.cookie(COOKIE_NAME, sid, {
    httpOnly: true,     // JavaScript can't read it
    sameSite: 'strict', // never sent on requests from other sites (CSRF)
    // No maxAge: the cookie dies when the browser closes.
    // The SERVER decides when the session actually expires.
  });

  await audit(user.email, 'login', user.email, 'Signed in');
  res.json({ user: { name: user.name, email: user.email, role: user.role } });
});

// ── Log out ──────────────────────────────────────────────────
// Unlike a JWT, logging out really ends the session: the server
// deletes it, so the id is worthless even if someone copied it.
router.post('/logout', async (req, res) => {
  const sid = req.cookies[COOKIE_NAME];
  if (sid) {
    const ended = await sessions.findOneAndDelete({ _id: sid });
    if (ended) {
      const user = await users.findOne({ _id: ended.userId });
      await audit(user?.email ?? '-', 'logout', sid.slice(0, 8), 'Signed out');
    }
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ── Who am I + my session ────────────────────────────────────
router.get('/me', requireSession(), (req, res) => {
  const { _id, createdAt, lastSeenAt, expiresAt, absoluteExpiresAt, device, ip } = req.session;
  res.json({
    user: req.user,
    // Shown here ONLY so the class can see it. The cookie itself is
    // httpOnly, so page scripts normally have no way to read it.
    session: { id: _id, createdAt, lastSeenAt, expiresAt, absoluteExpiresAt, device, ip },
    idleMinutes: IDLE_MS / 60_000,
  });
});

// Background check used by polling. Doesn't reset the idle timer.
router.get('/status', requireSession({ touch: false }), (req, res) => {
  res.json({ active: true, expiresAt: req.session.expiresAt });
});

export default router;
