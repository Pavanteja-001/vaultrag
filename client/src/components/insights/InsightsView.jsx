import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, BarChart2, Clock, ChevronRight } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import DeveloperAvatarCard from './DeveloperAvatarCard';
import CommitTraceGraph from './CommitTraceGraph';

const InsightsView = () => {
  const [symptom, setSymptom] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/api/chat/sme/history')
      .then((res) => setHistory(res.data.traces || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleTrace = async () => {
    if (!symptom.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axiosClient.post('/api/query', { question: symptom });
      const data = res.data;
      setResult(data);
      // Prepend to local history
      setHistory((prev) => [{ _id: Date.now(), symptom, answer: data.answer, insights: data.insights, createdAt: new Date() }, ...prev.slice(0, 19)]);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't retrieve recent commit history right now.");
    } finally {
      setLoading(false);
    }
  };

  const loadTrace = (trace) => {
    setSymptom(trace.symptom);
    setResult({ answer: trace.answer, insights: trace.insights, sources: trace.sources || [] });
    setError(null);
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* History panel */}
      <div className="w-56 flex-shrink-0 border-r border-white/5 bg-surface-800/40 flex flex-col">
        <div className="px-4 py-3.5 border-b border-white/5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Previous Traces
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {historyLoading && (
            <div className="space-y-1.5 pt-1">
              {[65, 80, 50].map((w, i) => (
                <div key={i} className="h-10 skeleton rounded-lg" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="text-center py-10 text-gray-600">
              <BarChart2 className="w-7 h-7 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No traces yet</p>
            </div>
          )}

          {history.map((t) => (
            <div
              key={t._id}
              onClick={() => loadTrace(t)}
              className="group px-2 py-2.5 rounded-lg cursor-pointer hover:bg-white/[0.05] transition-all mb-0.5"
            >
              <div className="flex items-start gap-1.5">
                <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-gray-600 group-hover:text-neon-blue transition-colors" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 group-hover:text-white truncate leading-tight transition-colors">{t.symptom}</p>
                  {t.insights?.authorId && (
                    <p className="text-[10px] text-neon-blue mt-0.5">@{t.insights.authorId}</p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold gradient-text mb-1">SME & Performance Insights</h1>
            <p className="text-sm text-gray-500">Trace regressions to the responsible commit and author</p>
          </div>

          {/* Symptom input */}
          <div className="glass-card p-5 mb-5">
            <label className="block text-xs text-gray-500 mb-3 uppercase tracking-wider">Describe the Symptom</label>
            <div className="flex gap-3">
              <input
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
                placeholder="e.g. 'login is slow since yesterday' or 'who changed auth?'"
                className="flex-1 bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 input-glow transition-all duration-200"
              />
              <motion.button
                onClick={handleTrace}
                disabled={!symptom.trim() || loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-ai text-white font-heading font-semibold text-sm hover:shadow-glow-ai disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Trace
              </motion.button>
            </div>
          </div>

          {error && (
            <div className="glass-card p-4 border border-neon-red/30 mb-5">
              <p className="text-sm text-neon-red">{error}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              <div className="glass-card p-5 h-28 skeleton rounded-2xl" />
              <div className="glass-card p-5 h-20 skeleton rounded-2xl" />
            </div>
          )}

          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {result.insights && (
                  <DeveloperAvatarCard
                    authorId={result.insights.authorId}
                    commitSha={result.insights.commitSha}
                    confidence={result.insights.confidence}
                    confidenceLevel={result.insights.confidenceLevel}
                    confidenceLabel={result.insights.confidenceLabel}
                  />
                )}
                <div className="glass-card p-5">
                  <h3 className="font-heading font-semibold text-white mb-3 text-sm">Analysis</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.answer}</p>
                </div>
                {result.insights && result.sources?.length > 0 && (
                  <div className="glass-card p-5">
                    <h3 className="font-heading font-semibold text-white mb-3 text-sm">Commit Timeline</h3>
                    <CommitTraceGraph commits={result.sources} flaggedSha={result.insights?.commitSha} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default InsightsView;
