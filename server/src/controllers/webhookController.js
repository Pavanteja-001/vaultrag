const crypto = require('crypto');
const https = require('https');
const { chunkFile } = require('../services/chunkingService');
const { processChunks } = require('../workers/embeddingWorker');
const { writeAuditLog } = require('../utils/auditLogger');
const Commit = require('../models/Commit');

const fetchFileContent = (repoFullName, filepath, ref) =>
  new Promise((resolve) => {
    const url = `https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(filepath)}?ref=${ref}`;
    const headers = { 'User-Agent': 'VaultRAG', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.content && json.encoding === 'base64') {
            resolve(Buffer.from(json.content, 'base64').toString('utf-8'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });

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
  process.stdout.write('\n🔔 WEBHOOK HIT\n');
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
  console.log(`📦 Webhook received — delivery: ${deliveryId}`);

  // Step 4: Process asynchronously
  setImmediate(async () => {
    try {
      const payload = JSON.parse(req.rawBody);
      const commits = payload.commits || [];
      const headCommit = payload.head_commit || commits[0];

      if (!headCommit) {
        console.log('⚠️  Webhook: no head commit found — skipping');
        return;
      }

      const sha = headCommit.id;
      const message = headCommit.message;
      const authorGithubId = headCommit.author?.username || headCommit.author?.name || 'unknown';
      const filesChanged = [
        ...(headCommit.added || []),
        ...(headCommit.modified || []),
        ...(headCommit.removed || []),
      ];
      const mergedAt = new Date(headCommit.timestamp || Date.now());

      console.log(`🔀 Commit: ${sha.slice(0, 7)} by ${authorGithubId} — "${message}" (${filesChanged.length} files)`);

      // Store commit record
      await Commit.findOneAndUpdate(
        { sha },
        { sha, message, authorGithubId, filesChanged, mergedAt },
        { upsert: true }
      );

      // Chunk changed files — fetch real content from GitHub API
      const repoFullName = payload.repository?.full_name;
      const allChunks = [];
      for (const filepath of [...(headCommit.added || []), ...(headCommit.modified || [])]) {
        let content = null;
        if (repoFullName) {
          content = await fetchFileContent(repoFullName, filepath, sha);
        }
        if (!content) {
          // Fallback to metadata-only if GitHub API unavailable
          content = `// File: ${filepath}\n// Commit: ${sha}\n// Author: ${authorGithubId}`;
        }
        const chunks = chunkFile(filepath, content);
        console.log(`  📄 ${filepath} → ${chunks.length} chunk(s) (${content.length} bytes)`);
        allChunks.push(...chunks);
      }

      if (allChunks.length > 0) {
        console.log(`🧠 Embedding ${allChunks.length} chunk(s)...`);
        const result = await processChunks({ chunks: allChunks, commitHash: sha, sourceType: 'code' });
        console.log(`✅ Webhook processed: ${result.total} chunks, ${result.failed} failed`);
      } else {
        console.log('⚠️  Webhook: 0 chunks to embed (no added/modified files in payload)');
      }

      await writeAuditLog({
        userId: null,
        action: 'webhook_processed',
        wasBlocked: false,
        metadata: { sha, filesChanged: filesChanged.length },
      });
    } catch (err) {
      console.error('❌ Webhook processing error:', err.message);
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
