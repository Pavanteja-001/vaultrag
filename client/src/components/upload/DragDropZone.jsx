import React from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image } from 'lucide-react';

const DragDropZone = ({ type = 'prd', onDrop }) => {
  const isPRD = type === 'prd';
  const accept = isPRD
    ? { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }
    : { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.length && onDrop(files[0]),
    accept,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300 ${
        isDragActive
          ? 'border-neon-blue bg-neon-blue/5 shadow-glow-ai'
          : 'border-white/10 hover:border-white/20 hover:bg-white/2'
      }`}
    >
      <input {...getInputProps()} />

      <motion.div
        animate={{ scale: isDragActive ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {isPRD ? (
          <FileText className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-neon-blue' : 'text-gray-600'}`} />
        ) : (
          <Image className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-neon-blue' : 'text-gray-600'}`} />
        )}
      </motion.div>

      <h3 className="font-heading font-semibold text-white mb-1">
        {isDragActive ? 'Drop it here' : isPRD ? 'Drop PRD File' : 'Drop Mockup Image'}
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        {isPRD ? 'PDF or TXT files, max 20MB' : 'JPG, PNG, or WebP images, max 20MB'}
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white transition-colors">
        <Upload className="w-4 h-4" />
        Browse files
      </div>
    </div>
  );
};

export default DragDropZone;
