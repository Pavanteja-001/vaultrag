import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import DeveloperAvatarCard from './DeveloperAvatarCard';
import CommitTraceGraph from './CommitTraceGraph';
import CodeSnippetRenderer from '../chat/CodeSnippetRenderer';

const InsightsView = () => {
  const [symptom, setSymptom] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTrace = async () => {
    if (!symptom.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axiosClient.post('/api/query', { question: symptom });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't retrieve recent commit history right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold gradient-text mb-1">SME & Performance Insights</h1>
        <p className="text-sm text-gray-500">Trace regressions to the responsible commit and author</p>
      </div>

      {/* Symptom search bar */}
      <div className="glass-card p-6 mb-6">
        <label className="block text-xs text-gray-500 mb-3 uppercase tracking-wider">Describe the Symptom</label>
        <div className="flex gap-3">
          <input
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrace()}
            placeholder="Describe the performance symptom... e.g. 'checkout page is slow since yesterday'"
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
            Trace Regression
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 border border-neon-red/30 mb-6">
          <p className="text-sm text-neon-red">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="glass-card p-5 h-28 skeleton rounded-2xl" />
          <div className="glass-card p-5 h-24 skeleton rounded-2xl" />
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
            {/* Developer avatar card */}
            {result.insights && (
              <DeveloperAvatarCard
                authorId={result.insights.authorId}
                commitSha={result.insights.commitSha}
                confidence={result.insights.confidence}
                confidenceLevel={result.insights.confidenceLevel}
                confidenceLabel={result.insights.confidenceLabel}
              />
            )}

            {/* AI answer */}
            <div className="glass-card p-5">
              <h3 className="font-heading font-semibold text-white mb-3 text-sm">Analysis</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{result.answer}</p>
            </div>

            {/* Commit trace */}
            {result.sources?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-heading font-semibold text-white mb-3 text-sm">Commit Timeline</h3>
                <CommitTraceGraph commits={result.sources} flaggedSha={result.insights?.commitSha} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InsightsView;
