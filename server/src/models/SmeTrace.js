const mongoose = require('mongoose');

const smeTraceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symptom: { type: String, required: true },
  answer: { type: String, default: '' },
  insights: { type: mongoose.Schema.Types.Mixed, default: null },
  sources: [{ sha: String, filepath: String, snippet: String }],
}, { timestamps: true });

smeTraceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SmeTrace', smeTraceSchema);
