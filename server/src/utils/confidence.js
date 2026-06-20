/**
 * Applies confidence score thresholds for SME attribution.
 * Exact rules from the PRD — never deviate.
 */
const applyConfidenceThreshold = (confidence, commitSha, authorId) => {
  if (confidence >= 0.70) {
    return {
      level: 'high',
      commitSha,
      authorId,
      label: 'High Match',
    };
  } else if (confidence >= 0.40) {
    return {
      level: 'medium',
      commitSha,
      authorId,
      label: 'Possible Match',
    };
  } else {
    return {
      level: 'low',
      commitSha: null,
      authorId: null,
      label: 'Low Confidence',
    };
  }
};

module.exports = { applyConfidenceThreshold };
