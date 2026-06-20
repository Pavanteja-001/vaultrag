import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X, FileText, Image } from 'lucide-react';

const UploadQueue = ({ items }) => {
  if (!items.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Upload Queue</h4>
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-3 glass-card px-4 py-3"
          >
            {item.type === 'prd' ? (
              <FileText className="w-4 h-4 text-neon-blue flex-shrink-0" />
            ) : (
              <Image className="w-4 h-4 text-neon-purple flex-shrink-0" />
            )}

            <span className="text-sm text-white flex-1 truncate">{item.filename}</span>

            <div className="flex items-center gap-2">
              {item.status === 'uploading' && (
                <>
                  <Loader2 className="w-4 h-4 text-neon-blue animate-spin" />
                  <span className="text-xs text-gray-400">{item.statusText || 'Uploading...'}</span>
                </>
              )}
              {item.status === 'processing' && (
                <>
                  <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
                  <span className="text-xs text-gray-400">{item.statusText || 'Parsing with Gemini Vision...'}</span>
                </>
              )}
              {item.status === 'done' && (
                <>
                  <Check className="w-4 h-4 text-neon-green" />
                  <span className="text-xs text-neon-green">Ready</span>
                </>
              )}
              {item.status === 'error' && (
                <>
                  <X className="w-4 h-4 text-neon-red" />
                  <span className="text-xs text-neon-red">{item.error || 'Failed'}</span>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default UploadQueue;
