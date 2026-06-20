const mongoose = require('mongoose');

// Single-document config store — used for Groq daily budget tracking.
// _id is always "daily_budget" for the budget document.
const configSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true },
  syncStatus: {
    type: String,
    enum: ['synced', 'syncing', 'incomplete'],
    default: 'synced',
  },
  lastSyncedAt: { type: Date, default: null },
  failedFiles: { type: [String], default: [] },
});

module.exports = mongoose.model('Config', configSchema);
