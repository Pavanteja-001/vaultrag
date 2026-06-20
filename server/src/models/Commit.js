const mongoose = require('mongoose');

const commitSchema = new mongoose.Schema({
  sha: {
    type: String,
    required: true,
    unique: true,
  },
  message: {
    type: String,
    required: true,
  },
  authorGithubId: {
    type: String,
    required: true,
  },
  filesChanged: {
    type: [String],
    default: [],
  },
  mergedAt: {
    type: Date,
    required: true,
  },
  fileDiffs: {
    type: [
      {
        filepath: String,
        status: String,       // added | modified | removed
        additions: Number,
        deletions: Number,
        patch: String,        // unified diff patch text
      },
    ],
    default: [],
  },
});

commitSchema.index({ mergedAt: -1 });

module.exports = mongoose.model('Commit', commitSchema);
