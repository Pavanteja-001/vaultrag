import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, GitCommit, AlertTriangle, Lock } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  not_started: { label: 'Not Started', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
  in_progress: { label: 'In Progress', color: 'text-neon-yellow', bg: 'bg-neon-yellow/10 border-neon-yellow/20' },
  done: { label: 'Done', color: 'text-neon-green', bg: 'bg-neon-green/10 border-neon-green/20' },
};

const RequirementAccordion = ({ prdId, requirements, onUpdate }) => {
  const [expanded, setExpanded] = useState(null);
  const { user } = useAuth();
  const isL3 = user?.role === 3;

  const handleOverride = async (req, newStatus) => {
    try {
      await axiosClient.patch(`/api/scope/${prdId}/requirements/${req._id}`, { status: newStatus });
      onUpdate?.(req._id, newStatus);
    } catch {}
  };

  return (
    <div className="space-y-2">
      {requirements.map((req, i) => {
        const style = STATUS_STYLES[req.status] || STATUS_STYLES.not_started;
        const isOpen = expanded === i;

        return (
          <div key={req._id || i} className="glass-card overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/2 transition-colors"
            >
              <span className={`px-2 py-0.5 rounded-md border text-xs font-mono-code flex-shrink-0 ${style.bg} ${style.color}`}>
                {style.label}
              </span>
              <span className="flex-1 text-sm text-gray-200 line-clamp-2">{req.text}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-600">AI-estimated</span>
                {req.manualOverride && <Lock className="w-3 h-3 text-neon-yellow" />}
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                    {req.conflictWarning && (
                      <div className="flex items-center gap-2 text-neon-yellow text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {req.conflictWarning}
                      </div>
                    )}

                    {req.relatedCommits?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Related commits:</p>
                        <div className="space-y-1">
                          {req.relatedCommits.map((c) => (
                            <div key={c.sha} className="flex items-center gap-2 text-xs">
                              <GitCommit className="w-3 h-3 text-neon-blue flex-shrink-0" />
                              <code className="text-neon-blue font-mono-code">{c.sha?.slice(0, 7)}</code>
                              <span className="text-gray-400">{c.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isL3 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-gray-500">Override status:</span>
                        {['not_started', 'in_progress', 'done'].map((s) => (
                          <button
                            key={s}
                            onClick={() => handleOverride(req, s)}
                            className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                              req.status === s
                                ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].color}`
                                : 'border-white/10 text-gray-500 hover:text-white'
                            }`}
                          >
                            {STATUS_STYLES[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default RequirementAccordion;
