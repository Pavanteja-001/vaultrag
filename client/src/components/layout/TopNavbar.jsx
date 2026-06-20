import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NeuralSyncPill from './NeuralSyncPill';

const ROLE_COLORS = {
  1: 'border-neon-blue text-neon-blue',
  2: 'border-neon-purple text-neon-purple',
  3: 'border-neon-red text-neon-red',
};
const ROLE_LABELS = { 1: 'L1 — Junior Dev', 2: 'L2 — Backend Engineer', 3: 'L3 — PM / Admin' };

const TopNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-surface-800 border-b border-white/5 fixed top-0 left-0 md:left-16 lg:left-60 right-0 z-30 pl-14 md:pl-6">
      {/* Sync pill on left side of top bar */}
      <NeuralSyncPill />

      {/* Right side: role badge + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <span className={`text-xs px-2.5 py-1 rounded-full border font-mono-code ${ROLE_COLORS[user.role] || ROLE_COLORS[1]}`}>
            {ROLE_LABELS[user.role]}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors group"
        >
          <LogOut className="w-3.5 h-3.5 group-hover:text-neon-red transition-colors" />
          Logout
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
