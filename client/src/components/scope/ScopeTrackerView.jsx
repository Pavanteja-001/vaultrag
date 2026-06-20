import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import SegmentedProgressBar from './SegmentedProgressBar';
import RequirementAccordion from './RequirementAccordion';

const ScopeTrackerView = () => {
  const [prds, setPrds] = useState([]);
  const [selectedPrdId, setSelectedPrdId] = useState('');
  const [scopeData, setScopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    axiosClient.get('/api/uploads/prds').then((res) => setPrds(res.data?.prds || [])).catch(() => {});
  }, []);

  const loadScope = async (prdId) => {
    if (!prdId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/api/scope/${prdId}`);
      setScopeData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || `Unable to refresh completion status — last known status as of ${new Date().toISOString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePRDSelect = (e) => {
    const id = e.target.value;
    setSelectedPrdId(id);
    setScopeData(null);
    if (id) loadScope(id);
  };

  const handleRequirementUpdate = (reqId, newStatus) => {
    setScopeData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) =>
        r._id === reqId ? { ...r, status: newStatus, manualOverride: true } : r
      ),
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold gradient-text mb-1">Scope & Completion Tracker</h1>
        <p className="text-sm text-gray-500">Track PRD requirements against actual committed code</p>
      </div>

      {/* PRD Selector */}
      <div className="glass-card p-4 mb-6">
        <label className="block text-xs text-gray-500 mb-2">Select PRD</label>
        <select
          value={selectedPrdId}
          onChange={handlePRDSelect}
          className="w-full bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-sm text-white input-glow"
        >
          <option value="">Choose a PRD to analyze...</option>
          {prds.map((prd) => (
            <option key={prd._id} value={prd._id}>{prd.filename}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="glass-card p-6 h-28 skeleton rounded-2xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 h-14 skeleton rounded-xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="glass-card p-4 border border-neon-yellow/30">
          <p className="text-sm text-neon-yellow">{error}</p>
        </div>
      )}

      {scopeData && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Progress bar */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-neon-blue" />
              <span className="font-heading font-semibold text-white">{scopeData.filename}</span>
            </div>
            <SegmentedProgressBar percent={scopeData.completionPercent} />
          </div>

          {/* Requirements */}
          <div>
            <h3 className="font-heading font-semibold text-white mb-4">
              Requirements ({scopeData.requirements.length})
            </h3>
            <RequirementAccordion
              prdId={selectedPrdId}
              requirements={scopeData.requirements}
              onUpdate={handleRequirementUpdate}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScopeTrackerView;
