// ─────────────────────────────────────────────────────────────
//  AUTHENTICATION  —  "Who are you?"
//
//  Runs before any protected route. It answers ONE question:
//  is this request coming from a known, logged-in user?
//
//  Fails with 401 Unauthorized (which really means "unauthenticated").
// ─────────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const COOKIE_NAME = 'session';

export async function authenticate(req, res, next) {
  // 1. The browser sends the JWT automatically in an httpOnly cookie.
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not logged in.' });
  }

  // 2. Verify the signature. If anyone tampered with the token,
  //    or it has expired, this throws.
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session is invalid or expired.' });
  }

  // 3. Load the user fresh from the database. The token only stores the
  //    user id, so a role change in the DB takes effect on the next request.
  const { rows } = await pool.query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [payload.sub]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'User no longer exists.' });
  }

  // 4. Attach the identity to the request for the next middleware / handler.
  req.user = rows[0];
  req.session = { issuedAt: payload.iat, expiresAt: payload.exp };
  next();
}
