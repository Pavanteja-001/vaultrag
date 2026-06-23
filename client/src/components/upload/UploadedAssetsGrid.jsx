import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, CheckCircle, Clock, XCircle, Trash2, Eye, RefreshCw } from 'lucide-react';
import FileViewerModal from './FileViewerModal';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  if (status === 'active') return <CheckCircle className="w-3.5 h-3.5 text-neon-green" />;
  if (status === 'pending') return <Clock className="w-3.5 h-3.5 text-neon-yellow animate-pulse" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-neon-red" />;
  return null;
};

const UploadedAssetsGrid = ({ prds = [], mockups = [], onDeletePRD, onDeleteMockup, onMockupStatusChange }) => {
  const [viewing, setViewing] = useState(null);
  const [retrying, setRetrying] = useState({});

  const handleReanalyze = async (e, mockupId) => {
    e.stopPropagation();
    setRetrying((prev) => ({ ...prev, [mockupId]: true }));
    try {
      await axiosClient.post(`/api/uploads/mockups/${mockupId}/reanalyze`);
      toast.success('Re-analysis started — polling for result...');
      onMockupStatusChange?.(mockupId, 'pending');
      // Poll until done
      const poll = setInterval(async () => {
        const res = await axiosClient.get(`/api/uploads/mockups/${mockupId}/status`);
        if (res.data.status !== 'pending') {
          clearInterval(poll);
          setRetrying((prev) => ({ ...prev, [mockupId]: false }));
          onMockupStatusChange?.(mockupId, res.data.status);
          if (res.data.status === 'active') toast.success(`Mockup analyzed: ${res.data.filename}`);
          else toast.error(`Re-analysis failed: ${res.data.filename}`);
        }
      }, 4000);
    } catch {
      setRetrying((prev) => ({ ...prev, [mockupId]: false }));
      toast.error('Could not start re-analysis');
    }
  };

  if (!prds.length && !mockups.length) return null;

  return (
    <>
      <div className="mt-6">
        {prds.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Uploaded PRDs ({prds.length})</h4>
            <div className="grid grid-cols-2 gap-3">
              {prds.map((prd) => (
                <motion.div
                  key={prd._id}
                  whileHover={{ scale: 1.01, boxShadow: '0 0 15px rgba(0,210,255,0.15)' }}
                  className="glass-card p-4 group cursor-pointer"
                  onClick={() => prd.fileUrl && setViewing({ type: 'prd', id: prd._id, filename: prd.filename })}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-neon-blue flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate font-medium">{prd.filename}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{prd.requirements?.length || 0} requirements</p>
                      <div className="flex items-center gap-3 mt-2">
                        {prd.fileUrl && (
                          <span className="flex items-center gap-1 text-[11px] text-neon-blue font-medium">
                            <Eye className="w-3 h-3" />
                            Click to view
                          </span>
                        )}
                        {onDeletePRD && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePRD(prd._id); }}
                            className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-neon-red transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {mockups.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Uploaded Mockups ({mockups.length})</h4>
            <div className="grid grid-cols-3 gap-3">
              {mockups.map((mockup) => (
                <motion.div
                  key={mockup._id}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(0,210,255,0.15)' }}
                  className="glass-card overflow-hidden group cursor-pointer"
                  onClick={() => mockup.imageUrl && setViewing({ type: 'mockup', id: mockup._id, filename: mockup.filename })}
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
                    {mockup.imageUrl && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{mockup.filename}</p>
                      <p className="text-[10px] text-gray-500 capitalize mt-0.5">{mockup.status}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {mockup.status === 'failed' && (
                        <button
                          onClick={(e) => handleReanalyze(e, mockup._id)}
                          disabled={retrying[mockup._id]}
                          title="Retry analysis"
                          className="p-1 rounded hover:bg-neon-blue/10 text-neon-blue transition-all opacity-0 group-hover:opacity-100"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${retrying[mockup._id] ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      {onDeleteMockup && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteMockup(mockup._id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neon-red/10 text-gray-600 hover:text-neon-red transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewing && (
        <FileViewerModal
          file={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
};

export default UploadedAssetsGrid;
