// ─────────────────────────────────────────────────────────────
//  AUTHORIZATION  —  "What are you allowed to do?"
//
//  Always runs AFTER authenticate(), because you can only decide
//  what someone may do once you know who they are (req.user).
//
//  Fails with 403 Forbidden: "I know who you are, but no."
//
//  Three common strategies are shown below.
// ─────────────────────────────────────────────────────────────

// Strategy 1 — ROLE-BASED (RBAC)
// "Only these roles may pass." Simple, but every route has to list roles.
//   router.get('/coach', allowRoles('elite'), handler)
export function allowRoles(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({
      error: `This needs the ${roles.join(' or ')} plan. You are on ${req.user.role}.`,
    });
  };
}

// Strategy 2 — PERMISSION-BASED
// Roles map to permissions; routes only ask for a permission.
// To change what "pro" can do, edit this table — not every route.
export const PERMISSIONS = {
  basic: ['workouts:read'],
  pro:   ['workouts:read', 'plans:read', 'analytics:read'],
  elite: ['workouts:read', 'plans:read', 'analytics:read', 'coach:chat'],
};

export function requirePermission(permission) {
  return (req, res, next) => {
    const granted = PERMISSIONS[req.user.role] ?? [];
    if (granted.includes(permission)) return next();
    return res.status(403).json({
      error: `Your ${req.user.role} plan does not include "${permission}".`,
    });
  };
}

// Strategy 3 — OWNERSHIP (resource-based)
// Role doesn't matter here: you may only touch YOUR OWN data.
//   router.get('/members/:id', requireOwnership('id'), handler)
export function requireOwnership(param) {
  return (req, res, next) => {
    if (Number(req.params[param]) === req.user.id) return next();
    return res.status(403).json({
      error: `You can only view your own profile (you are #${req.user.id}).`,
    });
  };
}
