// Customer-facing routes. Every one needs a valid session.
import { Router } from 'express';
import { sessions, audit } from '../db.js';
import { requireSession } from '../middleware/session.js';

const router = Router();

const activeFilter = () => ({ revokedAt: null, expiresAt: { $gt: new Date() } });

router.get('/account', requireSession(), (req, res) => {
  res.json({ accounts: req.user.accounts, transactions: req.user.transactions });
});

// "Where you're signed in": every live session for this user.
// The page polls this, so it doesn't reset the idle timer.
router.get('/my-sessions', requireSession({ touch: false }), async (req, res) => {
  const list = await sessions
    .find({ userId: req.user._id, ...activeFilter() })
    .sort({ lastSeenAt: -1 })
    .toArray();

  res.json({
    sessions: list.map((s) => ({
      id: s._id,
      device: s.device,
      ip: s.ip,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: s._id === req.session._id,
    })),
  });
});

// Sign out one of MY sessions (e.g. a lost phone).
// The userId condition is the ownership check: you can't revoke someone else's.
router.post('/my-sessions/:id/revoke', requireSession(), async (req, res) => {
  const { matchedCount } = await sessions.updateOne(
    { _id: req.params.id, userId: req.user._id, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedBy: req.user.email,
        revokedReason: 'You signed this device out from another session.',
      },
    }
  );
  if (!matchedCount) return res.status(404).json({ error: 'Session not found.' });
  await audit(req.user.email, 'session_revoked', req.params.id.slice(0, 8), 'By the account owner');
  res.json({ ok: true });
});

// "Sign out everywhere else".
router.post('/my-sessions/revoke-others', requireSession(), async (req, res) => {
  const { modifiedCount } = await sessions.updateMany(
    { userId: req.user._id, _id: { $ne: req.session._id }, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedBy: req.user.email,
        revokedReason: 'You signed out of all other sessions.',
      },
    }
  );
  await audit(req.user.email, 'sessions_revoked', req.user.email, `${modifiedCount} other session(s)`);
  res.json({ revoked: modifiedCount });
});

export default router;
