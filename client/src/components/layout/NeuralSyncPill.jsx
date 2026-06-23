import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import IngestionFlyout from './IngestionFlyout';

const NeuralSyncPill = () => {
  const { syncStatus } = useSyncStatus();
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const isActive = syncStatus.status === 'syncing';
  const isIncomplete = syncStatus.status === 'incomplete';

  const hoverShadowClass = isActive 
    ? 'hover:shadow-glow-ai' 
    : isIncomplete 
    ? 'hover:shadow-glow-warning' 
    : 'hover:shadow-glow-success';

  return (
    <div className="relative">
      <button
        onClick={() => setFlyoutOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass-card transition-all duration-300 ${hoverShadowClass}`}
      >
        {/* Status dot */}
        {isActive ? (
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: 'linear-gradient(to right, #00D2FF, #3A7BD5)',
            }}
            animate={{
              boxShadow: [
                '0 0 4px rgba(0,210,255,0.4)',
                '0 0 12px rgba(0,210,255,0.9)',
                '0 0 4px rgba(0,210,255,0.4)',
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ) : (
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              isIncomplete 
                ? 'bg-neon-yellow shadow-[0_0_10px_rgba(255,184,0,0.5)]' 
                : 'bg-neon-green shadow-[0_0_10px_rgba(0,255,135,0.5)]'
            }`}
          />
        )}

        <span className={`text-xs font-mono-code transition-colors duration-300 ${
          isActive
            ? 'text-neon-blue'
            : isIncomplete
            ? 'text-neon-yellow'
            : 'text-neon-green'
        }`}>
          {isActive
            ? 'Syncing Vault...'
            : isIncomplete
            ? '⚠ Sync Incomplete'
            : 'Vault Synced'}
        </span>
      </button>

      <AnimatePresence>
        {flyoutOpen && (
          <IngestionFlyout syncStatus={syncStatus} onClose={() => setFlyoutOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NeuralSyncPill;
