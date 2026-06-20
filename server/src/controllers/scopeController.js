const PRD = require('../models/PRD');
const Commit = require('../models/Commit');
const KnowledgeChunk = require('../models/KnowledgeChunk');

/**
 * Implements the exact scope status rules from the PRD:
 * - not_started: zero commits reference any file/function/keyword tied to this requirement
 * - in_progress: at least one commit touches a related area BUT the artifact is NOT in current KnowledgeChunks
 * - done: the specific artifact IS present in CURRENT, LATEST-SYNCED KnowledgeChunks (not just historically touched)
 */
const getScopeStatus = async (req, res) => {
  const { prdId } = req.params;

  let prd;
  try {
    prd = await PRD.findById(prdId).lean();
  } catch {
    return res.status(404).json({ error: 'PRD not found' });
  }

  if (!prd) {
    return res.status(404).json({ error: 'PRD not found' });
  }

  let commits;
  let lastKnownAt;
  try {
    commits = await Commit.find({ mergedAt: { $gte: prd.uploadedAt } })
      .sort({ mergedAt: -1 })
      .limit(100)
      .lean();
    lastKnownAt = new Date().toISOString();
  } catch {
    return res.status(503).json({
      error: `Unable to refresh completion status — last known status as of ${new Date().toISOString()}`,
      requirements: prd.requirements,
    });
  }

  const updatedRequirements = await Promise.all(
    prd.requirements.map(async (req_item) => {
      // Manual override takes precedence
      if (req_item.manualOverride) {
        // Check if any new commit might conflict
        const reqKeywords = extractKeywords(req_item.text);
        const conflictingCommit = commits.find((c) =>
          reqKeywords.some((kw) => c.message.toLowerCase().includes(kw) || c.filesChanged.some((f) => f.toLowerCase().includes(kw)))
        );

        return {
          ...req_item,
          conflictWarning: conflictingCommit
            ? 'A recent commit may affect this — re-check?'
            : null,
          relatedCommits: [],
        };
      }

      const reqKeywords = extractKeywords(req_item.text);

      // Find commits that touch this requirement's area
      const relatedCommits = commits.filter((c) =>
        reqKeywords.some((kw) =>
          c.message.toLowerCase().includes(kw) ||
          c.filesChanged.some((f) => f.toLowerCase().includes(kw))
        )
      );

      if (relatedCommits.length === 0) {
        return { ...req_item, status: 'not_started', relatedCommits: [] };
      }

      // Check if the implied artifact exists in CURRENT KnowledgeChunks
      let artifactExists = false;
      try {
        const existing = await KnowledgeChunk.findOne({
          'metadata.status': 'active',
          content: { $regex: reqKeywords.join('|'), $options: 'i' },
        }).lean();
        artifactExists = !!existing;
      } catch {}

      const status = artifactExists ? 'done' : 'in_progress';

      return {
        ...req_item,
        status,
        relatedCommits: relatedCommits.slice(0, 3).map((c) => ({
          sha: c.sha,
          message: c.message,
          mergedAt: c.mergedAt,
        })),
      };
    })
  );

  // Compute overall completion %
  const done = updatedRequirements.filter((r) => r.status === 'done').length;
  const total = updatedRequirements.length;
  const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  // Persist updated statuses (for non-manual-override items)
  try {
    for (const req_item of updatedRequirements) {
      if (!req_item.manualOverride) {
        await PRD.updateOne(
          { _id: prdId, 'requirements._id': req_item._id },
          { $set: { 'requirements.$.status': req_item.status } }
        );
      }
    }
  } catch {}

  return res.json({
    prdId,
    filename: prd.filename,
    completionPercent,
    lastCheckedAt: lastKnownAt,
    requirements: updatedRequirements,
  });
};

const updateRequirementStatus = async (req, res) => {
  const { prdId, reqId } = req.params;
  const { status } = req.body;

  if (!['not_started', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  await PRD.updateOne(
    { _id: prdId, 'requirements._id': reqId },
    {
      $set: {
        'requirements.$.status': status,
        'requirements.$.manualOverride': true,
        'requirements.$.overriddenAt': new Date(),
      },
    }
  );

  return res.json({ success: true });
};

const extractKeywords = (text) => {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'be', 'as', 'it', 'its', 'that', 'this', 'should', 'must', 'will', 'can', 'may']);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 10);
};

module.exports = { getScopeStatus, updateRequirementStatus };
