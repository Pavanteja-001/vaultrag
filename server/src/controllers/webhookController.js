const crypto = require('crypto');
const { chunkFile } = require('../services/chunkingService');
const { processChunks } = require('../workers/embeddingWorker');
const { writeAuditLog } = require('../utils/auditLogger');
const Commit = require('../models/Commit');

// In-memory deduplication set (last 1000 delivery IDs)
const seenDeliveryIds = new Set();
const MAX_SEEN = 1000;

const verifyWebhookSignature = (payload, signature) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};

const handleGithubWebhook = async (req, res) => {
  // Step 1: Verify HMAC-SHA256 signature before anything else
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !verifyWebhookSignature(req.rawBody, signature)) {
    await writeAuditLog({
      userId: null,
      action: 'webhook_invalid_signature',
      wasBlocked: true,
      metadata: { ip: req.ip },
    });
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Step 2: Idempotency — skip duplicate deliveries
  const deliveryId = req.headers['x-github-delivery'];
  if (deliveryId && seenDeliveryIds.has(deliveryId)) {
    return res.status(200).json({ status: 'duplicate, skipped' });
  }
  if (deliveryId) {
    seenDeliveryIds.add(deliveryId);
    if (seenDeliveryIds.size > MAX_SEEN) {
      const first = seenDeliveryIds.values().next().value;
      seenDeliveryIds.delete(first);
    }
  }

  // Step 3: Respond 200 immediately — never block on processing
  res.status(200).json({ status: 'received' });

  // Step 4: Process asynchronously
  setImmediate(async () => {
    try {
      const payload = JSON.parse(req.rawBody);
      const commits = payload.commits || [];
      const headCommit = payload.head_commit || commits[0];

      if (!headCommit) return;

      const sha = headCommit.id;
      const message = headCommit.message;
      const authorGithubId = headCommit.author?.username || headCommit.author?.name || 'unknown';
      const filesChanged = [
        ...(headCommit.added || []),
        ...(headCommit.modified || []),
        ...(headCommit.removed || []),
      ];
      const mergedAt = new Date(headCommit.timestamp || Date.now());

      // Store commit record
      await Commit.findOneAndUpdate(
        { sha },
        { sha, message, authorGithubId, filesChanged, mergedAt },
        { upsert: true }
      );

      // Chunk changed files (using content from payload if available, or just file path)
      const allChunks = [];
      for (const filepath of [...(headCommit.added || []), ...(headCommit.modified || [])]) {
        // In a real scenario, you'd fetch file content from GitHub API.
        // For webhook-based sync, we use the commit data we have.
        // The filepath itself creates metadata entries for role-tagging.
        const content = `// File: ${filepath}\n// Commit: ${sha}\n// Author: ${authorGithubId}`;
        const chunks = chunkFile(filepath, content);
        allChunks.push(...chunks);
      }

      if (allChunks.length > 0) {
        const result = await processChunks({ chunks: allChunks, commitHash: sha, sourceType: 'code' });
        console.log(`✅ Webhook processed: ${result.total} chunks, ${result.failed} failed`);
      }

      await writeAuditLog({
        userId: null,
        action: 'webhook_processed',
        wasBlocked: false,
        metadata: { sha, filesChanged: filesChanged.length },
      });
    } catch (err) {
      console.error('Webhook processing error:', err.message);
      await writeAuditLog({
        userId: null,
        action: 'webhook_processing_error',
        wasBlocked: false,
        metadata: { error: err.message },
      });
    }
  });
};

module.exports = { handleGithubWebhook };
