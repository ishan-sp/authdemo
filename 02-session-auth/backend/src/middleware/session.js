// ─────────────────────────────────────────────────────────────
//  SESSION-BASED AUTHENTICATION
//
//  The browser holds only a random, meaningless id in a cookie.
//  Everything else (who you are, when it expires, whether it was
//  revoked) lives in the `sessions` collection on the server.
//
//  So on every request the server LOOKS UP the session.
//  That lookup is what makes instant revocation possible.
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import { sessions, users } from '../db.js';

export const COOKIE_NAME = 'sid';
export const IDLE_MS = Number(process.env.IDLE_MINUTES ?? 10) * 60_000;
export const ABSOLUTE_MS = Number(process.env.ABSOLUTE_HOURS ?? 8) * 3_600_000;

// The session can't outlive either limit: idle timeout or absolute timeout.
const nextExpiry = (now, createdAt) =>
  new Date(Math.min(now.getTime() + IDLE_MS, createdAt.getTime() + ABSOLUTE_MS));

// ── Create (on login) ────────────────────────────────────────
export async function createSession(user, req) {
  // 32 random bytes = 256 bits. Impossible to guess, and it means nothing
  // on its own; it's just a key into the sessions collection.
  const id = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const userAgent = req.get('user-agent') ?? '';

  await sessions.insertOne({
    _id: id,
    userId: user._id,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: nextExpiry(now, now),
    absoluteExpiresAt: new Date(now.getTime() + ABSOLUTE_MS),
    ip: req.ip,
    device: describeDevice(userAgent),
    revokedAt: null,
    revokedBy: null,
    revokedReason: null,
  });
  return id;
}

// ── Check (on every request) ─────────────────────────────────
// touch: false is for background polling, which shouldn't count as
// "activity" and keep an idle session alive forever.
export function requireSession({ touch = true } = {}) {
  return async (req, res, next) => {
    const sid = req.cookies[COOKIE_NAME];
    if (!sid) return deny(res, 'NO_SESSION', 'Please sign in.');

    // 1. Look the id up. No document = not a valid session.
    const session = await sessions.findOne({ _id: sid });
    if (!session) {
      return deny(res, 'ENDED', 'Your session has ended. Please sign in again.');
    }

    // 2. Revoked by an admin or by the user from another device?
    if (session.revokedAt) {
      return deny(res, 'REVOKED', session.revokedReason ?? 'Your session was revoked.');
    }

    // 3. Expired? (The TTL index deletes it eventually, but not instantly.)
    if (session.expiresAt <= new Date()) {
      return deny(res, 'EXPIRED', 'You were signed out after a period of inactivity.');
    }

    // 4. Load the user. A banned account is rejected even with a live session.
    const user = await users.findOne(
      { _id: session.userId },
      { projection: { passwordHash: 0 } }
    );
    if (!user) return deny(res, 'ENDED', 'This account no longer exists.');
    if (user.status === 'banned') {
      return deny(res, 'BANNED', 'This account has been suspended. Please contact support.');
    }

    // 5. Sliding expiration: activity pushes the idle deadline forward.
    if (touch) {
      const now = new Date();
      session.lastSeenAt = now;
      session.expiresAt = nextExpiry(now, session.createdAt);
      await sessions.updateOne(
        { _id: sid },
        { $set: { lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt } }
      );
    }

    req.user = user;
    req.session = session;
    next();
  };
}

// ── Authorization helper ─────────────────────────────────────
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role === role) return next();
    return res.status(403).json({ error: 'You do not have access to this area.' });
  };
}

function deny(res, code, error) {
  res.clearCookie(COOKIE_NAME);
  return res.status(401).json({ code, error });
}

// "Chrome on Windows" from a user-agent string. Good enough for a demo.
function describeDevice(ua) {
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Firefox\//.test(ua) ? 'Firefox' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' :
    /curl\//.test(ua) ? 'curl' : 'Browser';
  const os =
    /Windows/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' :
    /iPhone|iPad/.test(ua) ? 'iOS' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return browser === 'curl' ? 'curl (terminal)' : `${browser} on ${os}`;
}
