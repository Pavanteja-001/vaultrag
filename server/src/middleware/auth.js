const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies Bearer JWT, then re-resolves the user's role from DB on every request.
 * Security rule: role is NEVER trusted from the JWT claim — always re-read from DB.
 * If DB is unreachable, defaults to role 1 (most restrictive) — fail closed.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(decoded.id).select('role isActive').lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }
    req.user = { id: decoded.id, role: user.role };
  } catch {
    // DB unreachable — fail closed with most restrictive role
    req.user = { id: decoded.id, role: 1 };
  }

  next();
};

module.exports = { authenticate };
