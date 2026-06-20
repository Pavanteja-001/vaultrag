import React, { useState, useEffect } from 'react';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import HashChainIndicator from './HashChainIndicator';

const ACTION_TYPES = ['query', 'query_blocked_injection', 'prd_upload', 'mockup_upload_success', 'mockup_upload_failed', 'role_change', 'webhook_invalid_signature', 'webhook_processed', 'sync_incomplete'];

const LogFilterBar = ({ filters, onChange }) => (
  <div className="glass-card p-4 mb-4 flex flex-wrap gap-3 items-end">
    <div>
      <label className="block text-xs text-gray-500 mb-1">Action Type</label>
      <select
        value={filters.actionType}
        onChange={(e) => onChange({ ...filters, actionType: e.target.value })}
        className="bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white input-glow"
      >
        <option value="">All Actions</option>
        {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">Blocked Only</label>
      <select
        value={filters.wasBlocked}
        onChange={(e) => onChange({ ...filters, wasBlocked: e.target.value })}
        className="bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white input-glow"
      >
        <option value="">All</option>
        <option value="true">Blocked Only</option>
        <option value="false">Allowed Only</option>
      </select>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">Start Date</label>
      <input
        type="date"
        value={filters.startDate}
        onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
        className="bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white input-glow"
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">End Date</label>
      <input
        type="date"
        value={filters.endDate}
        onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
        className="bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-xs text-white input-glow"
      />
    </div>
  </div>
);

const AuditLogView = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ actionType: '', wasBlocked: '', startDate: '', endDate: '' });

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 20 };
        if (filters.actionType) params.actionType = filters.actionType;
        if (filters.wasBlocked) params.wasBlocked = filters.wasBlocked;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;

        const res = await axiosClient.get('/api/audit-logs', { params });
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setPages(res.data.pages);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, filters]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-neon-blue" />
        <div>
          <h1 className="font-heading text-2xl font-bold gradient-text">Audit Log</h1>
          <p className="text-sm text-gray-500">Append-only tamper-evident log of all system activity</p>
        </div>
        <span className="ml-auto text-xs text-gray-500 font-mono-code">{total} entries</span>
      </div>

      <LogFilterBar filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="glass-card h-12 skeleton" />)}
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-gray-500 font-mono-code">Timestamp</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-mono-code">User</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-mono-code">Action</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-mono-code">Blocked</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-mono-code">Hash</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr
                    key={log._id}
                    className={`border-b border-white/5 ${
                      log.wasBlocked ? 'bg-neon-red/5' : i % 2 === 0 ? 'bg-surface-800/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono-code text-gray-400">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)} UTC
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono-code">
                      {log.userId ? log.userId.toString().slice(-6) : 'system'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono-code ${log.wasBlocked ? 'text-neon-red' : 'text-gray-300'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.wasBlocked ? (
                        <span className="text-neon-red font-bold">✗</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <HashChainIndicator hashValid={log.hashValid} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 glass-card disabled:opacity-30 hover:shadow-glow-ai transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400 font-mono-code">Page {page} of {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 glass-card disabled:opacity-30 hover:shadow-glow-ai transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogView;
