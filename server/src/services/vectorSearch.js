const mongoose = require('mongoose');
const KnowledgeChunk = require('../models/KnowledgeChunk');

/**
 * Performs Atlas Vector Search with RBAC filter baked inside the query.
 * Role filter is INSIDE $vectorSearch — restricted content is structurally excluded, never post-filtered.
 * Returns top-k chunks with filepath and content for citation pills.
 */
const searchChunks = async (queryEmbedding, userRole, limit = 5) => {
  const db = mongoose.connection.db;
  const collection = db.collection('knowledgechunks');

  // Request more candidates than needed so the post-filter still returns `limit` results
  const candidateMultiplier = 40;

  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * candidateMultiplier,
        limit: limit * candidateMultiplier,
        filter: {
          'metadata.requiredRole': { $lte: userRole },
          'metadata.status': 'active',
        },
      },
    },
    {
      $project: {
        content: 1,
        'metadata.filepath': 1,
        'metadata.requiredRole': 1,
        'metadata.sourceType': 1,
        'metadata.astNodeType': 1,
        'metadata.commitHash': 1,
        'metadata.status': 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]).toArray();

  // MANDATORY post-filter — enforces RBAC even if Atlas filter misfires.
  // This is the last line of defense: a chunk never reaches the LLM unless
  // its requiredRole is explicitly <= the authenticated user's role.
  const filtered = results.filter((r) => {
    const chunkRole = r.metadata?.requiredRole;
    const chunkStatus = r.metadata?.status;
    if (chunkStatus !== 'active') return false;
    if (typeof chunkRole !== 'number') return false;
    return chunkRole <= userRole;
  });
  console.log(`[RBAC] vectorSearch: Atlas returned ${results.length}, post-filter kept ${filtered.length} for role=${userRole}`);

  return filtered.slice(0, limit).map((r) => ({
    id: r._id.toString(),
    content: r.content,
    filepath: r.metadata.filepath,
    sourceType: r.metadata.sourceType,
    astNodeType: r.metadata.astNodeType,
    commitHash: r.metadata.commitHash,
    score: r.score,
  }));
};

module.exports = { searchChunks };
