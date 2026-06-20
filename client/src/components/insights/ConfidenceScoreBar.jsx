import React from 'react';
import { motion } from 'framer-motion';

const ConfidenceScoreBar = ({ confidence = 0 }) => {
  const percent = Math.round(confidence * 100);

  const getColor = () => {
    if (percent >= 70) return { bar: '#00FF87', glow: 'rgba(0,255,135,0.4)', label: 'text-neon-green' };
    if (percent >= 40) return { bar: '#FFB800', glow: 'rgba(255,184,0,0.4)', label: 'text-neon-yellow' };
    return { bar: '#FF003C', glow: 'rgba(255,0,60,0.4)', label: 'text-neon-red' };
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Match Confidence</span>
        <span className={`text-sm font-heading font-bold ${colors.label}`}>{percent}%</span>
      </div>

      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: colors.bar, boxShadow: `0 0 8px ${colors.glow}` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default ConfidenceScoreBar;
