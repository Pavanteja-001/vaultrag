import React from 'react';
import { motion } from 'framer-motion';
import { GitCommit, Clock } from 'lucide-react';
import ConfidenceScoreBar from './ConfidenceScoreBar';

const BORDER_COLORS = {
  high: 'border-neon-green shadow-glow-success',
  medium: 'border-neon-yellow shadow-glow-warning',
  low: 'border-transparent',
};

const DeveloperAvatarCard = ({ authorId, commitSha, confidence, confidenceLevel, confidenceLabel }) => {
  // Never show author attribution at low confidence (< 40%)
  const showAttribution = confidenceLevel !== 'low';

  const initials = authorId
    ? authorId.slice(0, 2).toUpperCase()
    : '??';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-5 border-2 ${BORDER_COLORS[confidenceLevel] || 'border-transparent'}`}
    >
      {showAttribution && authorId ? (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-ai flex items-center justify-center text-lg font-bold text-white">
              {initials}
            </div>
            <div>
              <p className="font-heading font-semibold text-white">@{authorId}</p>
              <p className={`text-xs font-mono-code ${
                confidenceLevel === 'high' ? 'text-neon-green' : 'text-neon-yellow'
              }`}>
                {confidenceLabel}
              </p>
            </div>
          </div>

          {commitSha && (
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
              <GitCommit className="w-3.5 h-3.5 text-neon-blue" />
              <code className="font-mono-code text-neon-blue">{commitSha.slice(0, 7)}</code>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-700 flex items-center justify-center">
            <span className="text-gray-600 text-lg">?</span>
          </div>
          <div>
            <p className="font-heading font-semibold text-gray-400">Low Confidence</p>
            <p className="text-xs text-gray-600">Unable to attribute to a specific commit</p>
          </div>
        </div>
      )}

      <ConfidenceScoreBar confidence={confidence} />
    </motion.div>
  );
};

export default DeveloperAvatarCard;
