import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import EmailPasswordForm from './EmailPasswordForm';
import DocumentationView from './DocumentationView';

const ParticleBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-neon-blue/20"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: 3 + Math.random() * 4,
          repeat: Infinity,
          delay: Math.random() * 3,
        }}
      />
    ))}
    {/* Gradient mesh blobs */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neon-blue/5 blur-3xl" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-neon-purple/5 blur-3xl" />
  </div>
);

const LoginView = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-900 flex items-center justify-center relative">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold gradient-text mb-2">VaultRAG</h1>
            <p className="text-gray-400 text-sm">AI Knowledge Assistant for Engineering Teams</p>
          </div>

          <EmailPasswordForm onSubmit={handleLogin} loading={loading} error={error} />

          <div className="mt-4 flex items-center justify-center gap-4">
            {/* <button
              onClick={() => setShowDocs(true)}
              className="text-xs text-neon-blue hover:text-neon-blue/80 underline cursor-pointer transition-colors duration-200"
            >
              Documentation & Walkthrough
            </button> */}
            <span className="text-gray-700 text-xs">·</span>
            <a
              href="/showcase"
              className="text-xs text-neon-blue hover:text-neon-blue/80 underline transition-colors duration-200"
            >
              See how it works →
            </a>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-600">
              Role-based access · All queries are audited · Secured with RBAC
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDocs && (
          <DocumentationView onClose={() => setShowDocs(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginView;
