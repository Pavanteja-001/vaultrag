import React from 'react';
import { motion } from 'framer-motion';

const SegmentedProgressBar = ({ percent = 0, segments = 15 }) => {
  const filled = Math.round((percent / 100) * segments);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {Array.from({ length: segments }).map((_, i) => {
          const isDone = i < filled;
          const isPartial = i === filled && percent % (100 / segments) > 0;

          return (
            <motion.div
              key={i}
              className={`h-6 flex-1 rounded-sm transition-all duration-500 ${
                isDone
                  ? 'bg-neon-green shadow-[0_0_6px_rgba(0,255,135,0.4)]'
                  : 'bg-surface-700'
              }`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            />
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <span className="font-heading text-4xl font-bold gradient-text">{percent}%</span>
        <span className="text-gray-500 text-sm mb-1.5">complete</span>
      </div>
    </div>
  );
};

export default SegmentedProgressBar;
