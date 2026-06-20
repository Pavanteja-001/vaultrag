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
  const logs = await AuditLog.find(filter)
    .sort({ timestamp: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Verify hash chain on read
  const logsWithValidation = logs.map((log, idx) => {
    if (idx === 0) {
      const entryContent = JSON.stringify({
        userId: log.userId,
        action: log.action,
        timestamp: log.timestamp,
        wasBlocked: log.wasBlocked,
        metadata: log.metadata,
      });
      const expectedHash = computeLogHash(log.prevLogHash, entryContent);
      return { ...log, hashValid: expectedHash === log.logHash };
    }
    const prev = logs[idx - 1];
    const entryContent = JSON.stringify({
      userId: log.userId,
      action: log.action,
      timestamp: log.timestamp,
      wasBlocked: log.wasBlocked,
      metadata: log.metadata,
    });
    const expectedHash = computeLogHash(log.prevLogHash, entryContent);
    return { ...log, hashValid: expectedHash === log.logHash && log.prevLogHash === prev.logHash };
  });

  return res.json({
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    logs: logsWithValidation,
  });
};

module.exports = { getAuditLogs };
