const crypto = require('crypto');
const https = require('https');
const { chunkFile } = require('../services/chunkingService');
const { processChunks } = require('../workers/embeddingWorker');
const { writeAuditLog } = require('../utils/auditLogger');
const Commit = require('../models/Commit');

const githubGet = (url) =>
  new Promise((resolve) => {
    const headers = { 'User-Agent': 'VaultRAG', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });

const fetchFileContent = async (repoFullName, filepath, ref) => {
  const json = await githubGet(`https://api.github.com/repos/${repoFullName}/contents/${encodeURIComponent(filepath)}?ref=${ref}`);
  if (json?.content && json?.encoding === 'base64') {
    return Buffer.from(json.content, 'base64').toString('utf-8');
  }
  return null;
};

const fetchCommitDiff = async (repoFullName, sha) => {
  const json = await githubGet(`https://api.github.com/repos/${repoFullName}/commits/${sha}`);
  if (!json?.files) return [];
  return json.files.map((f) => ({
    filepath: f.filename,
    status: f.status,
    additions: f.additions || 0,
    deletions: f.deletions || 0,
    patch: f.patch || '',  // unified diff — may be empty for binary files
  }));
};

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

  // Step 4: Process asynchronously — ALL commits in the push, oldest first
  setImmediate(async () => {
    try {
      const payload = JSON.parse(req.rawBody);
      const commits = payload.commits || [];
      if (payload.head_commit && !commits.find((c) => c.id === payload.head_commit.id)) {
        commits.push(payload.head_commit);
      }

      if (commits.length === 0) {
        console.log('⚠️  Webhook: no commits found — skipping');
        return;
      }

      const repoFullName = payload.repository?.full_name;
      console.log(`📦 Processing ${commits.length} commit(s) from push`);

      const allChunks = [];
      let lastSha = null;

      for (const commit of commits) {
        const sha = commit.id;
        const message = commit.message;
        const authorGithubId = commit.author?.username || commit.author?.name || 'unknown';
        const filesChanged = [
          ...(commit.added || []),
          ...(commit.modified || []),
          ...(commit.removed || []),
        ];
        const mergedAt = new Date(commit.timestamp || Date.now());

        console.log(`🔀 Commit: ${sha.slice(0, 7)} by ${authorGithubId} — "${message}" (${filesChanged.length} files)`);

        // Fetch diff from GitHub API
        const fileDiffs = repoFullName ? await fetchCommitDiff(repoFullName, sha) : [];
        if (fileDiffs.length > 0) {
          console.log(`  📊 Diff: ${fileDiffs.length} file(s) — ${fileDiffs.reduce((a, f) => a + f.additions, 0)}+ ${fileDiffs.reduce((a, f) => a + f.deletions, 0)}-`);
        }

        // Store commit record
        await Commit.findOneAndUpdate(
          { sha },
          { sha, message, authorGithubId, filesChanged, mergedAt, fileDiffs },
          { upsert: true }
        );

        // Chunk all added/modified files
        for (const filepath of [...(commit.added || []), ...(commit.modified || [])]) {
          let content = null;
          if (repoFullName) {
            content = await fetchFileContent(repoFullName, filepath, sha);
          }
          if (!content) {
            content = `// File: ${filepath}\n// Commit: ${sha}\n// Author: ${authorGithubId}`;
          }
          const chunks = chunkFile(filepath, content).map((c) => ({ ...c, _commitHash: sha }));
          console.log(`  📄 ${filepath} → ${chunks.length} chunk(s)`);
          allChunks.push(...chunks);
        }

        lastSha = sha;
      }

      if (allChunks.length > 0) {
        console.log(`🧠 Embedding ${allChunks.length} total chunk(s)...`);
        // Group chunks by their commit hash for proper metadata
        const chunksByCommit = allChunks.reduce((acc, c) => {
          const hash = c._commitHash;
          if (!acc[hash]) acc[hash] = [];
          acc[hash].push(c);
          return acc;
        }, {});
        let totalFailed = 0;
        for (const [hash, chunks] of Object.entries(chunksByCommit)) {
          const result = await processChunks({ chunks, commitHash: hash, sourceType: 'code' });
          totalFailed += result.failed;
        }
        console.log(`✅ Push processed: ${allChunks.length} chunks, ${totalFailed} failed`);
      } else {
        console.log('⚠️  Webhook: 0 chunks to embed');
      }

      await writeAuditLog({
        userId: null,
        action: 'webhook_processed',
        wasBlocked: false,
        metadata: { commits: commits.length, chunks: allChunks.length },
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
