const mongoose = require('mongoose');

// APPEND-ONLY — never update or delete documents in this collection.
// logHash = sha256(prevLogHash + JSON.stringify(entry)) for tamper detection.
const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // null for system-generated entries (e.g., invalid webhook)
  },
  action: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  wasBlocked: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  prevLogHash: {
    type: String,
    required: true,
  },
  logHash: {
    type: String,
    required: true,
  },
});

auditLogSchema.index({ timestamp: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ wasBlocked: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
