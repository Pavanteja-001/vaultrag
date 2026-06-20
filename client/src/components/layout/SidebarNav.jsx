import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckSquare, BarChart2, Upload, FileText, Shield, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/chat', label: 'Knowledge Chat', icon: MessageSquare, minRole: 1 },
  { path: '/todos', label: 'My To-Dos', icon: CheckSquare, minRole: 1 },
  { path: '/insights', label: 'SME Insights', icon: BarChart2, minRole: 2 },
  { path: '/pm/scope', label: 'Scope Tracker', icon: FileText, minRole: 2 },
  { path: '/pm/upload', label: 'Upload Center', icon: Upload, minRole: 3 },
  { path: '/admin/audit', label: 'Audit Log', icon: Shield, minRole: 3 },
  { path: '/admin/roles', label: 'Role Management', icon: Users, minRole: 3 },
];

const ROLE_LABELS = { 1: 'Junior Dev', 2: 'Senior Engineer', 3: 'PM / Admin' };

const SidebarNav = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = user?.role || 1;
  const visibleItems = NAV_ITEMS.filter((item) => userRole >= item.minRole);

  const NavItem = ({ item, collapsed }) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={() => setMobileOpen(false)}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl text-sm transition-all duration-200 group relative ${
          collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-white/5 text-white shadow-glow-ai'
            : 'text-gray-400 hover:text-white hover:bg-surface-700'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <motion.div
              layoutId="nav-active"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-ai"
            />
          )}
          <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-neon-blue' : 'group-hover:text-neon-blue transition-colors'}`} />
          {!collapsed && <span className="font-medium">{item.label}</span>}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Mobile hamburger button — shown only below md */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 glass-card rounded-xl text-gray-400 hover:text-white transition-colors"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar (full-width drawer) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="md:hidden w-60 h-screen flex flex-col bg-surface-800 border-r border-white/5 fixed left-0 top-0 z-50"
          >
            <div className="p-5 pt-16 border-b border-white/5">
              <h1 className="font-heading text-xl font-bold gradient-text tracking-tight">VaultRAG</h1>
              <p className="text-xs text-gray-500 mt-0.5">AI Knowledge Assistant</p>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {visibleItems.map((item) => <NavItem key={item.path} item={item} collapsed={false} />)}
            </nav>
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-ai flex items-center justify-center text-xs font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{user?.email}</p>
                  <p className={`text-xs font-medium ${userRole === 3 ? 'text-neon-red' : userRole === 2 ? 'text-neon-purple' : 'text-neon-blue'}`}>
                    L{userRole} — {ROLE_LABELS[userRole]}
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Tablet sidebar — icon-only, visible md to lg */}
      <aside className="hidden md:flex lg:hidden w-16 h-screen flex-col bg-surface-800 border-r border-white/5 fixed left-0 top-0 z-40">
        <div className="p-3 border-b border-white/5 flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center">
            <span className="text-xs font-bold text-white">V</span>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => <NavItem key={item.path} item={item} collapsed={true} />)}
        </nav>
        <div className="p-3 border-t border-white/5 flex justify-center">
          <div className="w-7 h-7 rounded-full bg-gradient-ai flex items-center justify-center text-xs font-bold text-white" title={user?.email}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </aside>

      {/* Desktop sidebar — full, visible lg+ */}
      <aside className="hidden lg:flex w-60 h-screen flex-col bg-surface-800 border-r border-white/5 fixed left-0 top-0 z-40">
        <div className="p-5 border-b border-white/5">
          <h1 className="font-heading text-xl font-bold gradient-text tracking-tight">VaultRAG</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI Knowledge Assistant</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => <NavItem key={item.path} item={item} collapsed={false} />)}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-ai flex items-center justify-center text-xs font-bold text-white">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white truncate">{user?.email}</p>
              <p className={`text-xs font-medium ${userRole === 3 ? 'text-neon-red' : userRole === 2 ? 'text-neon-purple' : 'text-neon-blue'}`}>
                L{userRole} — {ROLE_LABELS[userRole]}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarNav;
