import React, { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axiosClient from '../../api/axiosClient';

const FileViewerModal = ({ file, onClose }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!file?.id) return;
    let objectUrl;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    const apiPath = file.type === 'prd'
      ? `/api/uploads/prds/${file.id}/file`
      : `/api/uploads/mockups/${file.id}/file`;

    // Fetch through VaultRAG API (JWT auth handled by axiosClient interceptor)
    axiosClient.get(apiPath, { responseType: 'blob' })
      .then((res) => {
        const mime = file.type === 'prd' ? 'application/pdf' : (res.data.type || 'image/jpeg');
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: mime }));
        setBlobUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file?.id]);

  if (!file) return null;
  const isPDF = file.type === 'prd';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0 bg-surface-800">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.filename}</p>
          <p className="text-xs text-gray-500">{isPDF ? 'PDF Document' : 'UI Mockup'}</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {blobUrl && (
            <a
              href={blobUrl}
              download={file.filename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-neon-blue animate-spin" />
            <p className="text-sm text-gray-400">Loading {isPDF ? 'document' : 'image'}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-gray-400">Failed to load file.</p>
            <p className="text-xs text-gray-600">Check the server console for details.</p>
          </div>
        )}

        {blobUrl && !loading && (
          isPDF ? (
            <iframe
              src={blobUrl}
              title={file.filename}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <img
                src={blobUrl}
                alt={file.filename}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          )
        )}
      </div>
    </motion.div>
  );
};

export default FileViewerModal;
