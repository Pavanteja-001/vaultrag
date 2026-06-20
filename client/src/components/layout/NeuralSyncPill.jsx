import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStatus } from '../../hooks/useSyncStatus';
import IngestionFlyout from './IngestionFlyout';

const NeuralSyncPill = () => {
  const { syncStatus } = useSyncStatus();
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const isActive = syncStatus.status === 'syncing';
  const isIncomplete = syncStatus.status === 'incomplete';

  return (
    <div className="relative">
      <button
        onClick={() => setFlyoutOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card hover:shadow-glow-ai transition-all duration-300"
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
            className={`w-2.5 h-2.5 rounded-full ${
              isIncomplete ? 'bg-neon-yellow' : 'bg-gray-500'
            }`}
          />
        )}

        <span className="text-xs font-mono-code text-gray-300">
          {isActive
            ? 'Syncing Vault...'
            : isIncomplete
            ? '⚠ Sync Incomplete'
            : syncStatus.lastSyncedAt
            ? `Vault Synced`
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
