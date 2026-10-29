// ─────────────────────────────────────────────────────────────
//  ADMIN: session revocation and banning.
//
//  Each action returns the equivalent mongosh command, so the class
//  can see exactly what changes in the database. Paste any of them
//  into Compass's shell (the >_ button) and they'll work.
// ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { users, sessions, auditLog, audit } from '../db.js';
import { requireSession, requireRole } from '../middleware/session.js';

const router = Router();

// Polling the dashboard isn't "activity"; clicking a button is.
const watching = [requireSession({ touch: false }), requireRole('admin')];
const acting = [requireSession(), requireRole('admin')];

const revokeFields = (admin, reason) => ({
  revokedAt: new Date(),
  revokedBy: admin.email,
  revokedReason: reason,
});

const shell = {
  revokeOne: (sid, admin, reason) =>
    `db.sessions.updateOne(\n  { _id: "${sid}" },\n  { $set: { revokedAt: new Date(), revokedBy: "${admin}", revokedReason: "${reason}" } }\n)`,
  revokeAll: (userId, admin, reason) =>
    `db.sessions.updateMany(\n  { userId: ObjectId("${userId}"), revokedAt: null },\n  { $set: { revokedAt: new Date(), revokedBy: "${admin}", revokedReason: "${reason}" } }\n)`,
  setStatus: (userId, status) =>
    `db.users.updateOne(\n  { _id: ObjectId("${userId}") },\n  { $set: { status: "${status}" } }\n)`,
};

// ── Everything the dashboard shows, in one call ──────────────
router.get('/overview', ...watching, async (req, res) => {
  const now = new Date();

  // Active sessions joined with their user ($lookup is Mongo's JOIN).
  const activeSessions = await sessions
    .aggregate([
      { $match: { revokedAt: null, expiresAt: { $gt: now } } },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $sort: { lastSeenAt: -1 } },
      {
        $project: {
          device: 1, ip: 1, createdAt: 1, lastSeenAt: 1, expiresAt: 1,
          'user._id': 1, 'user.name': 1, 'user.email': 1, 'user.role': 1,
        },
      },
    ])
    .toArray();

  const allUsers = await users
    .find({}, { projection: { name: 1, email: 1, role: 1, status: 1 } })
    .sort({ role: 1, name: 1 })
    .toArray();

  const counts = {};
  for (const s of activeSessions) counts[s.user._id] = (counts[s.user._id] ?? 0) + 1;

  const recent = await auditLog.find().sort({ at: -1 }).limit(30).toArray();

  res.json({
    me: { email: req.user.email, sessionId: req.session._id },
    sessions: activeSessions.map((s) => ({ ...s, id: s._id })),
    users: allUsers.map((u) => ({ ...u, activeSessions: counts[u._id] ?? 0 })),
    audit: recent,
  });
});

// ── Revoke ONE session ───────────────────────────────────────
router.post('/sessions/:id/revoke', ...acting, async (req, res) => {
  const reason = 'Your session was ended by the Harbor security team.';
  const result = await sessions.updateOne(
    { _id: req.params.id, revokedAt: null },
    { $set: revokeFields(req.user, reason) }
  );
  await audit(req.user.email, 'session_revoked', req.params.id.slice(0, 8), 'By admin');
  res.json({
    commands: [shell.revokeOne(req.params.id, req.user.email, reason)],
    result: { matched: result.matchedCount, modified: result.modifiedCount },
  });
});

// ── Revoke ALL sessions of a user ("sign out everywhere") ────
router.post('/users/:id/revoke-all', ...acting, async (req, res) => {
  const userId = new ObjectId(req.params.id);
  const target = await users.findOne({ _id: userId });
  if (!target) return res.status(404).json({ error: 'User not found.' });

  const reason = 'You were signed out of all devices by the Harbor security team.';
  const result = await sessions.updateMany(
    { userId, revokedAt: null },
    { $set: revokeFields(req.user, reason) }
  );
  await audit(req.user.email, 'sessions_revoked', target.email, `${result.modifiedCount} session(s) by admin`);
  res.json({
    commands: [shell.revokeAll(req.params.id, req.user.email, reason)],
    result: { matched: result.matchedCount, modified: result.modifiedCount },
  });
});

// ── Ban: block future logins AND kill current sessions ───────
router.post('/users/:id/ban', ...acting, async (req, res) => {
  const userId = new ObjectId(req.params.id);
  if (userId.equals(req.user._id)) {
    return res.status(400).json({ error: "You can't ban your own account." });
  }
  const target = await users.findOne({ _id: userId });
  if (!target) return res.status(404).json({ error: 'User not found.' });

  const reason = 'This account has been suspended. Please contact support.';
  await users.updateOne({ _id: userId }, { $set: { status: 'banned' } });
  const result = await sessions.updateMany(
    { userId, revokedAt: null },
    { $set: revokeFields(req.user, reason) }
  );
  await audit(req.user.email, 'user_banned', target.email, `${result.modifiedCount} session(s) ended`);
  res.json({
    commands: [
      shell.setStatus(req.params.id, 'banned'),
      shell.revokeAll(req.params.id, req.user.email, reason),
    ],
    result: { sessionsEnded: result.modifiedCount },
  });
});

router.post('/users/:id/unban', ...acting, async (req, res) => {
  const userId = new ObjectId(req.params.id);
  const target = await users.findOne({ _id: userId });
  if (!target) return res.status(404).json({ error: 'User not found.' });

  await users.updateOne({ _id: userId }, { $set: { status: 'active' } });
  await audit(req.user.email, 'user_unbanned', target.email, 'Can sign in again');
  res.json({ commands: [shell.setStatus(req.params.id, 'active')], result: { ok: true } });
});

export default router;
