const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const SmeTrace = require('../models/SmeTrace');

// ── Conversations ─────────────────────────────────────────────────────────────

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();
    return res.json({ conversations });
  } catch {
    return res.status(500).json({ error: 'Failed to load conversations' });
  }
});

router.post('/conversations', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.create({ userId: req.user.id });
    return res.status(201).json({ conversation });
  } catch {
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.get('/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const convo = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });

    const messages = await ChatMessage.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    return res.json({ messages });
  } catch {
    return res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.delete('/conversations/:id', authenticate, async (req, res) => {
  try {
    const convo = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!convo) return res.status(404).json({ error: 'Conversation not found' });
    await ChatMessage.deleteMany({ conversationId: req.params.id });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ── SME Trace History ─────────────────────────────────────────────────────────

router.get('/sme/history', authenticate, async (req, res) => {
  try {
    const traces = await SmeTrace.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ traces });
  } catch {
    return res.status(500).json({ error: 'Failed to load SME history' });
  }
});

module.exports = router;
