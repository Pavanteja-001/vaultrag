const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  text: { type: String, required: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'done'],
    default: 'not_started',
  },
  manualOverride: { type: Boolean, default: false },
  overriddenAt: { type: Date, default: null },
}, { _id: true });

const prdSchema = new mongoose.Schema({
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  requirements: [requirementSchema],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PRD', prdSchema);
