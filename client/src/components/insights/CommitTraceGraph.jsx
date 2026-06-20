import React from 'react';
import { motion } from 'framer-motion';

const CommitTraceGraph = ({ commits = [], flaggedSha }) => {
  if (!commits.length) return null;

  return (
    <div className="relative py-4">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />

      <div className="space-y-3">
        {commits.slice(0, 8).map((commit, i) => {
          const isFlagged = commit.sha === flaggedSha || commit.filepath === flaggedSha;

          return (
            <motion.div
              key={commit.sha || i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-4"
            >
              {/* Node */}
              <div className={`relative z-10 w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                isFlagged
                  ? 'bg-neon-red shadow-glow-danger animate-pulse-neon'
                  : 'bg-surface-700 border border-white/20'
              }`} />

              {/* Content */}
              <div className={`flex-1 glass-card px-3 py-2 ${
                isFlagged ? 'border border-neon-red/40' : ''
              }`}>
                <div className="flex items-center gap-2">
                  <code className={`text-xs font-mono-code ${isFlagged ? 'text-neon-red' : 'text-neon-blue'}`}>
                    {(commit.sha || commit.filepath || '').slice(0, 7)}
                  </code>
                  {isFlagged && (
                    <span className="text-xs text-neon-red font-semibold">FLAGGED</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{commit.snippet || commit.message}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CommitTraceGraph;
