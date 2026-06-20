import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';

const IDLE_INTERVAL = 30000;   // 30s when synced/incomplete — just to catch new pushes
const ACTIVE_INTERVAL = 3000;  // 3s when syncing — fast live updates

export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({ status: 'synced', lastSyncedAt: null, failedFiles: [] });
  const intervalRef = useRef(null);
  const statusRef = useRef('synced');

  const fetchStatus = async () => {
    try {
      const res = await axiosClient.get('/api/sync-status');
      setSyncStatus(res.data);
      statusRef.current = res.data.status;
    } catch {}
  };

  const scheduleNext = () => {
    clearInterval(intervalRef.current);
    const delay = statusRef.current === 'syncing' ? ACTIVE_INTERVAL : IDLE_INTERVAL;
    intervalRef.current = setInterval(async () => {
      await fetchStatus();
      scheduleNext(); // re-schedule after each fetch to adapt to new status
    }, delay);
  };

  useEffect(() => {
    fetchStatus().then(scheduleNext);
    return () => clearInterval(intervalRef.current);
  }, []);

  return { syncStatus, fetchStatus };
};
