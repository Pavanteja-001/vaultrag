import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Send, Loader2 } from 'lucide-react';

const EmailPasswordForm = ({ onSubmit, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourteam.dev"
          required
          className="w-full bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 input-glow transition-all duration-200"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-surface-700 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 input-glow transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-neon-red"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={loading || !email || !password}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="w-full py-3 rounded-xl font-heading font-semibold text-sm text-white bg-gradient-ai hover:shadow-glow-ai disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Authenticating...
          </>
        ) : (
          <>
            Access Vault
            <Send className="w-3.5 h-3.5" />
          </>
        )}
      </motion.button>
    </form>
  );
};

export default EmailPasswordForm;
