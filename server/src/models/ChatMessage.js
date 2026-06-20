const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: [{ filepath: String, snippet: String }],
  blocked: { type: Boolean, default: false },
  fallback: { type: Boolean, default: false },
}, { timestamps: true });

chatMessageSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
