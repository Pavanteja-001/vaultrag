const crypto = require('crypto');

/**
 * Computes sha256(prevHash + entryJSON) for tamper detection in the AuditLog chain.
 * Both inputs must be strings — prevHash is '0' for the first entry.
 */
const computeLogHash = (prevLogHash, entryContent) => {
  return crypto
    .createHash('sha256')
    .update(prevLogHash + entryContent)
    .digest('hex');
};

module.exports = { computeLogHash };
