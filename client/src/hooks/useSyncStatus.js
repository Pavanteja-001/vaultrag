import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';

export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({ status: 'synced', lastSyncedAt: null, failedFiles: [] });
  const intervalRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await axiosClient.get('/api/sync-status');
      setSyncStatus(res.data);
    } catch {}
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(fetchStatus, 5000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, []);

  // Auto-start polling when syncing
  useEffect(() => {
    if (syncStatus.status === 'syncing') {
      startPolling();
    } else {
      stopPolling();
    }
  }, [syncStatus.status]);

  return { syncStatus, fetchStatus };
};
