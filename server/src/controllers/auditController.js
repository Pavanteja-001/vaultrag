const AuditLog = require('../models/AuditLog');
const { computeLogHash } = require('../utils/hashChain');

const getAuditLogs = async (req, res) => {
  const { userId, startDate, endDate, actionType, wasBlocked, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (userId) filter.userId = userId;
  if (actionType) filter.action = actionType;
  if (wasBlocked !== undefined) filter.wasBlocked = wasBlocked === 'true';
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await AuditLog.countDocuments(filter);
  // Fetch ascending for hash chain validation, then reverse for newest-first display
  const logsAsc = await AuditLog.find(filter)
    .sort({ timestamp: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Verify hash chain integrity in forward order
  const validated = logsAsc.map((log, idx) => {
    const entryContent = JSON.stringify({
      userId: log.userId,
      action: log.action,
      timestamp: log.timestamp,
      wasBlocked: log.wasBlocked,
      metadata: log.metadata,
    });
    const expectedHash = computeLogHash(log.prevLogHash, entryContent);
    const hashValid = idx === 0
      ? expectedHash === log.logHash
      : expectedHash === log.logHash && log.prevLogHash === logsAsc[idx - 1].logHash;
    return { ...log, hashValid };
  });

  return res.json({
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    logs: validated.reverse(), // newest first for display
  });
};

module.exports = { getAuditLogs };
