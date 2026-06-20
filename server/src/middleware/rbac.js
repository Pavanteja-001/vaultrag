/**
 * Factory: returns middleware that enforces a minimum role requirement.
 * Real enforcement — never rely on client-side nav hiding alone.
 */
const requireRole = (minRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role < minRole) {
    return res.status(403).json({ error: `Role ${minRole}+ required for this action` });
  }
  next();
};

/**
 * Exact role match — for L3-only endpoints (e.g., admin routes).
 */
const requireExactRole = (exactRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== exactRole) {
    return res.status(403).json({ error: `Role ${exactRole} required for this action` });
  }
  next();
};

module.exports = { requireRole, requireExactRole };
