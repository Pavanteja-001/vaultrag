const KnowledgeChunk = require('../models/KnowledgeChunk');
const { embedText } = require('../services/embeddingService');
const { writeAuditLog } = require('../utils/auditLogger');
const Config = require('../models/Config');

const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embeds a single chunk with up to 3 retries and exponential backoff.
 * Failure is isolated per chunk — one bad chunk never blocks the others.
 * Returns true on success, false on all retries exhausted.
 */
const embedChunkWithRetry = async (chunk, commitHash, sourceType) => {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const embedding = await embedText(chunk.text);

      await KnowledgeChunk.findOneAndUpdate(
        {
          'metadata.filepath': chunk.filepath,
          'metadata.astNodeType': chunk.nodeType,
          'metadata.startLine': chunk.startLine ?? 0,
        },
        {
          content: chunk.text,
          embedding,
          metadata: {
            filepath: chunk.filepath,
            requiredRole: chunk.requiredRole,
            commitHash: commitHash || null,
            sourceType: sourceType || 'code',
            astNodeType: chunk.nodeType,
            startLine: chunk.startLine ?? 0,
            version: commitHash || null,
            status: 'active',
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      return true;
    } catch (err) {
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
      } else {
        // All retries exhausted — mark as failed
        try {
          await KnowledgeChunk.findOneAndUpdate(
            {
              'metadata.filepath': chunk.filepath,
              'metadata.astNodeType': chunk.nodeType,
              'metadata.startLine': chunk.startLine ?? 0,
            },
            {
              $set: {
                'metadata.status': 'failed',
                'metadata.filepath': chunk.filepath,
              },
            },
            { upsert: true }
          );
        } catch {}
        console.error(`❌ Chunk failed after retries: ${chunk.filepath} [${chunk.nodeType}] — ${err.message}`);
        return false;
      }
    }
  }
  return false;
};

/**
 * Processes an array of chunks: embeds each, tracks failures, updates sync status.
 * chunks: [{ text, filepath, nodeType, requiredRole }]
 */
const processChunks = async ({ chunks, commitHash, sourceType = 'code' }) => {
  const failedFiles = new Set();

  // Update sync status to "syncing"
  await Config.findByIdAndUpdate(
    'daily_budget',
    { $set: { syncStatus: 'syncing' } },
    { upsert: true }
  );

  for (const chunk of chunks) {
    const success = await embedChunkWithRetry(chunk, commitHash, sourceType);
    if (!success) {
      failedFiles.add(chunk.filepath);
    }
  }

  const hasFailed = failedFiles.size > 0;

  // Hold 'syncing' for 12s so the frontend 8s poll always catches it at least once
  await sleep(12000);

  // Update sync status
  await Config.findByIdAndUpdate(
    'daily_budget',
    {
      $set: {
        syncStatus: hasFailed ? 'incomplete' : 'synced',
        lastSyncedAt: new Date(),
        failedFiles: hasFailed ? Array.from(failedFiles) : [],
      },
    },
    { upsert: true }
  );

  if (hasFailed) {
    await writeAuditLog({
      userId: null,
      action: 'sync_incomplete',
      wasBlocked: false,
      metadata: { failedFiles: Array.from(failedFiles) },
    });

    // Schedule L3 notification check after 15 minutes
    setTimeout(async () => {
      const failedChunks = await KnowledgeChunk.find({ 'metadata.status': 'failed' }).lean();
      if (failedChunks.length > 0) {
        await writeAuditLog({
          userId: null,
          action: 'sync_pending_15min_alert',
          wasBlocked: false,
          metadata: {
            pendingCount: failedChunks.length,
            files: failedChunks.map((c) => c.metadata.filepath),
          },
        });
        console.warn(`⚠️  L3 ALERT: ${failedChunks.length} chunks still failed after 15 minutes`);
      }
    }, 15 * 60 * 1000);
  }

  return { total: chunks.length, failed: failedFiles.size };
};

module.exports = { processChunks };
