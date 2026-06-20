const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  devId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mockupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mockup',
    required: false,
  },
  task: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'done'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

todoSchema.index({ devId: 1 });
todoSchema.index({ mockupId: 1 });

module.exports = mongoose.model('ToDo', todoSchema);
