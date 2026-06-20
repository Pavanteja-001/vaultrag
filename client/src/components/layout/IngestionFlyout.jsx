import React from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, X, AlertTriangle } from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 'webhook', label: 'Webhook Received' },
  { id: 'ast', label: 'Parsing AST' },
  { id: 'slice', label: 'Slicing Nodes' },
  { id: 'embed', label: 'Embedding Matrix' },
  { id: 'write', label: 'Writing Vault' },
];

const StepIcon = ({ status }) => {
  if (status === 'done') return <Check className="w-3 h-3 text-neon-green" />;
  if (status === 'active') return <Loader2 className="w-3 h-3 text-neon-blue animate-spin" />;
  if (status === 'failed') return <X className="w-3 h-3 text-neon-red" />;
  return <span className="w-3 h-3 rounded-full border border-gray-600" />;
};

const IngestionFlyout = ({ syncStatus, onClose }) => {
  const getStepStatus = (stepId) => {
    if (syncStatus.status === 'synced') return 'done';
    if (syncStatus.status === 'incomplete') {
      if (stepId === 'write') return 'failed';
      return 'done';
    }
    if (syncStatus.status === 'syncing') {
      const order = ['webhook', 'ast', 'slice', 'embed', 'write'];
      const idx = order.indexOf(stepId);
      // Simulate progress — first two steps done, rest pending
      if (idx <= 1) return 'done';
      if (idx === 2) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full right-0 mt-2 w-80 z-50"
    >
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-heading text-gray-400 uppercase tracking-wider">Neural Sync Pipeline</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {PIPELINE_STEPS.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-4 h-4">
                  <StepIcon status={status} />
                </div>
                <span className={`text-xs font-mono-code ${
                  status === 'done' ? 'text-neon-green' :
                  status === 'active' ? 'text-neon-blue' :
                  status === 'failed' ? 'text-neon-red' :
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {status === 'active' && (
                  <span className="text-xs text-gray-500 ml-auto">processing...</span>
                )}
              </div>
            );
          })}
        </div>

        {syncStatus.lastSyncedAt && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <span className="text-xs text-gray-600 font-mono-code">
              Last sync: {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {syncStatus.failedFiles?.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5 text-neon-yellow">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs">{syncStatus.failedFiles.length} file(s) failed</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default IngestionFlyout;
