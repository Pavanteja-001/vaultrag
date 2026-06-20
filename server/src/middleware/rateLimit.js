// Simple in-memory per-user rate limiter (no Redis needed at free-tier scale)
const requestCounts = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;

const rateLimitMiddleware = (req, res, next) => {
  const userId = req.user?.id || req.ip;
  const now = Date.now();
  const entry = requestCounts.get(userId);

  if (!entry || now - entry.start > WINDOW_MS) {
    requestCounts.set(userId, { count: 1, start: now });
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests — please slow down.' });
  }

  next();
};

module.exports = { rateLimitMiddleware };
