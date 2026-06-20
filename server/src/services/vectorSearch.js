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

  const results = await collection.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: limit * 20,
        limit,
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
        'metadata.sourceType': 1,
        'metadata.astNodeType': 1,
        'metadata.commitHash': 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]).toArray();

  return results.map((r) => ({
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
