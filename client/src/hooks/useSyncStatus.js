import { useState, useEffect, useRef } from 'react';
import axiosClient from '../api/axiosClient';

const IDLE_INTERVAL = 8000;    // 8s when synced/incomplete — short enough to catch a new push
const ACTIVE_INTERVAL = 2000;  // 2s when syncing — fast live updates

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
