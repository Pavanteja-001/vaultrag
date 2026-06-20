const AuditLog = require('../models/AuditLog');
const { computeLogHash } = require('./hashChain');

/**
 * Appends a new entry to the AuditLog with a chained hash.
 * NEVER update or delete AuditLog documents — append only.
 */
const writeAuditLog = async ({ userId, action, wasBlocked = false, metadata = {} }) => {
  try {
    const lastEntry = await AuditLog.findOne().sort({ timestamp: -1 }).lean();
    const prevLogHash = lastEntry ? lastEntry.logHash : '0';
    const timestamp = new Date();
    const entryContent = JSON.stringify({ userId, action, timestamp, wasBlocked, metadata });
    const logHash = computeLogHash(prevLogHash, entryContent);

    await AuditLog.create({
      userId: userId || null,
      action,
      timestamp,
      wasBlocked,
      metadata,
      prevLogHash,
      logHash,
    });
  } catch (err) {
    console.error('AuditLog write failed:', err.message);
    // Never throw — audit logging failure must not break the main request flow
  }
};

module.exports = { writeAuditLog };
