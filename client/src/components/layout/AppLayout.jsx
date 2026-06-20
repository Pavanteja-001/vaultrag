import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import TopNavbar from './TopNavbar';
import { useSyncStatus } from '../../hooks/useSyncStatus';

const SyncIncompleteBanner = ({ failedFiles }) => (
  <div className="fixed bottom-0 left-0 md:left-16 lg:left-60 right-0 z-50 px-6 py-2.5 bg-neon-yellow/10 border-t border-neon-yellow/30">
    <p className="text-xs text-neon-yellow font-mono-code text-center">
      ⚠ Sync Incomplete — some files could not be indexed
      {failedFiles?.length > 0 && ` (${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''})`}
    </p>
  </div>
);

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { syncStatus } = useSyncStatus();

  return (
    <div className="min-h-screen bg-base-900">
      <SidebarNav />
      <TopNavbar />

      <main className="ml-0 md:ml-16 lg:ml-60 pt-14 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {syncStatus.status === 'incomplete' && (
        <SyncIncompleteBanner failedFiles={syncStatus.failedFiles} />
      )}
    </div>
  );
};

export default AppLayout;
