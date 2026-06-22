import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import DragDropZone from './DragDropZone';
import UploadQueue from './UploadQueue';
import UploadedAssetsGrid from './UploadedAssetsGrid';
import axiosClient from '../../api/axiosClient';

let itemId = 0;

const UploadCenterView = () => {
  const [queue, setQueue] = useState([]);
  const [uploadedPRDs, setUploadedPRDs] = useState([]);
  const [uploadedMockups, setUploadedMockups] = useState([]);
  const pendingMockupIds = useRef(new Set());
  const pollRef = useRef(null);

  useEffect(() => {
    axiosClient.get('/api/uploads/prds').then((res) => setUploadedPRDs(res.data?.prds || [])).catch(() => {});
    axiosClient.get('/api/uploads/mockups').then((res) => {
      const mockups = res.data?.mockups || [];
      setUploadedMockups(mockups);
      mockups.forEach((m) => { if (m.status === 'pending') pendingMockupIds.current.add(m._id); });
      if (pendingMockupIds.current.size > 0) startPolling();
    }).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (pendingMockupIds.current.size === 0) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      await Promise.all([...pendingMockupIds.current].map(async (id) => {
        try {
          const res = await axiosClient.get(`/api/uploads/mockups/${id}/status`);
          if (res.data.status !== 'pending') {
            pendingMockupIds.current.delete(id);
            setUploadedMockups((prev) =>
              prev.map((m) => m._id === id ? { ...m, status: res.data.status } : m)
            );
            if (res.data.status === 'active') toast.success(`Mockup analyzed: ${res.data.filename}`);
            if (res.data.status === 'failed') toast.error(`Mockup analysis failed: ${res.data.filename}`);
          }
        } catch {}
      }));
    }, 4000);
  };

  const addQueueItem = (item) => {
    const id = ++itemId;
    setQueue((prev) => [...prev, { id, ...item }]);
    return id;
  };

  const updateQueueItem = (id, updates) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handlePRDDrop = async (file) => {
    const id = addQueueItem({ filename: file.name, type: 'prd', status: 'uploading' });
    const formData = new FormData();
    formData.append('file', file);
    try {
      updateQueueItem(id, { statusText: 'Parsing requirements...' });
      const res = await axiosClient.post('/api/uploads/prd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateQueueItem(id, { status: 'done' });
      setUploadedPRDs((prev) => [res.data, ...prev]);
      toast.success(`PRD uploaded: ${res.data.requirementsCount} requirements extracted`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      updateQueueItem(id, { status: 'error', error: msg });
      toast.error(msg);
    }
  };

  const handleMockupDrop = async (file) => {
    const id = addQueueItem({ filename: file.name, type: 'mockup', status: 'uploading' });
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await axiosClient.post('/api/uploads/mockup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateQueueItem(id, { status: 'processing', statusText: 'Analyzing with Gemini Vision...' });
      setUploadedMockups((prev) => [{
        _id: res.data.mockupId,
        filename: file.name,
        imageUrl: res.data.imageUrl || null,
        status: 'pending',
      }, ...prev]);
      pendingMockupIds.current.add(res.data.mockupId);
      startPolling();
      setTimeout(() => updateQueueItem(id, { status: 'done' }), 3000);
    } catch (err) {
      const msg = err.response?.data?.error || "Couldn't process this image — please retry or try a clearer version.";
      updateQueueItem(id, { status: 'error', error: msg });
      toast.error(msg);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold gradient-text mb-1">PM Upload Center</h1>
        <p className="text-sm text-gray-500">Upload PRDs and mockups to power the Knowledge Vault</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-heading font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-blue inline-block" />
            PRD / Requirements
          </h3>
          <DragDropZone type="prd" onDrop={handlePRDDrop} />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-purple inline-block" />
            UI Mockups
          </h3>
          <DragDropZone type="mockup" onDrop={handleMockupDrop} />
        </div>
      </div>

      <UploadQueue items={queue} />
      <UploadedAssetsGrid prds={uploadedPRDs} mockups={uploadedMockups} />
    </div>
  );
};

export default UploadCenterView;
