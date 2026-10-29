// The "app" itself. Every route is: authenticate → authorize → handler.
import { Router } from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { allowRoles, requirePermission, requireOwnership } from '../middleware/authorize.js';

const router = Router();

// Every route in this file needs a logged-in user.
router.use(authenticate);

// basic, pro, elite
router.get('/workouts', requirePermission('workouts:read'), (req, res) => {
  res.json({
    items: [
      { day: 'Mon', name: 'Upper body strength', minutes: 45 },
      { day: 'Tue', name: 'Easy run · 5 km', minutes: 32 },
      { day: 'Wed', name: 'Mobility and core', minutes: 25 },
      { day: 'Thu', name: 'Lower body strength', minutes: 50 },
    ],
  });
});

// pro, elite
router.get('/plans', requirePermission('plans:read'), (req, res) => {
  res.json({
    items: [
      { name: '10K in 8 weeks', week: 3, of: 8 },
      { name: 'Hypertrophy block', week: 5, of: 12 },
    ],
  });
});

// pro, elite
router.get('/analytics', requirePermission('analytics:read'), (req, res) => {
  res.json({
    restingHeartRate: 58,
    vo2max: 47.2,
    weeklyMinutes: [32, 45, 0, 50, 38, 60, 25],
  });
});

// elite only — uses the role-based strategy instead of permissions
router.get('/coach', allowRoles('elite'), (req, res) => {
  res.json({
    coach: 'Maya Fernandes',
    nextSession: 'Thursday, 7:00 AM',
    message: `Great consistency this week, ${req.user.name.split(' ')[0]}. Let's add one tempo run.`,
  });
});

// Any role — but only for your own id (ownership check)
router.get('/members/:id', requireOwnership('id'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.params.id]
  );
  res.json({ member: rows[0] });
});

export default router;
