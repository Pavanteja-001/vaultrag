import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react';

const StatusBadge = ({ status }) => {
  if (status === 'active') return <CheckCircle className="w-3.5 h-3.5 text-neon-green" />;
  if (status === 'pending') return <Clock className="w-3.5 h-3.5 text-neon-yellow animate-pulse" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-neon-red" />;
  return null;
};

const UploadedAssetsGrid = ({ prds = [], mockups = [] }) => {
  if (!prds.length && !mockups.length) return null;

  return (
    <div className="mt-6">
      {prds.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Uploaded PRDs</h4>
          <div className="grid grid-cols-2 gap-3">
            {prds.map((prd) => (
              <motion.div
                key={prd._id}
                whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(0,210,255,0.2)' }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-neon-blue flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{prd.filename}</p>
                    <span className="text-xs text-gray-500">{prd.requirements?.length || 0} requirements</span>
                  </div>
                  {prd.fileUrl && (
                    <a
                      href={prd.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-500 hover:text-neon-blue transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {mockups.length > 0 && (
        <div>
          <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Uploaded Mockups</h4>
          <div className="grid grid-cols-3 gap-3">
            {mockups.map((mockup) => (
              <motion.div
                key={mockup._id}
                whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(0,210,255,0.2)' }}
                className="glass-card overflow-hidden cursor-pointer"
              >
                <div className="aspect-video bg-surface-800 relative overflow-hidden">
                  {mockup.imageUrl ? (
                    <img
                      src={mockup.imageUrl}
                      alt={mockup.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 rounded-full p-0.5">
                    <StatusBadge status={mockup.status} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-white truncate">{mockup.filename}</p>
                  <p className="text-[10px] text-gray-500 capitalize mt-0.5">{mockup.status}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadedAssetsGrid;
