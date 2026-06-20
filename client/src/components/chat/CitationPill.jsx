import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, ChevronDown, ChevronUp } from 'lucide-react';

const CitationPill = ({ filepath, snippet }) => {
  const [expanded, setExpanded] = useState(false);
  const filename = filepath?.split('/').pop() || filepath;

  return (
    <div className="inline-block">
      <motion.button
        onClick={() => setExpanded((v) => !v)}
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-neon-blue hover:border-neon-blue/30 hover:shadow-glow-ai transition-all duration-200"
      >
        <FileCode className="w-3 h-3" />
        <span className="font-mono-code">{filename}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </motion.button>

      <AnimatePresence>
        {expanded && snippet && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="glass-card p-3 border border-neon-blue/20">
              <p className="text-xs text-gray-400 font-mono-code mb-1">{filepath}</p>
              <pre className="text-xs text-gray-300 font-mono-code whitespace-pre-wrap leading-relaxed overflow-auto max-h-40">
                {snippet}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CitationPill;
