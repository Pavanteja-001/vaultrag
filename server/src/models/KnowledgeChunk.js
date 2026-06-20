const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: (v) => v.length === 768,
      message: 'Embedding must be exactly 768 dimensions',
    },
  },
  metadata: {
    filepath: { type: String, required: true },
    requiredRole: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
    },
    commitHash: { type: String, default: null },
    sourceType: {
      type: String,
      required: true,
      enum: ['code', 'prd', 'mockup'],
    },
    astNodeType: { type: String, default: null },
    startLine: { type: Number, default: 0 },
    version: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: ['active', 'pending', 'failed'],
      default: 'pending',
    },
  },
}, { timestamps: true });

knowledgeChunkSchema.index({ 'metadata.requiredRole': 1 });
knowledgeChunkSchema.index({ 'metadata.status': 1 });
knowledgeChunkSchema.index({ 'metadata.filepath': 1, 'metadata.astNodeType': 1, 'metadata.startLine': 1 });

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
