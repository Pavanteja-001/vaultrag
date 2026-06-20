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
});

commitSchema.index({ mergedAt: -1 });

module.exports = mongoose.model('Commit', commitSchema);
