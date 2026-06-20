import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

const ROLE_LABELS = { 1: 'Junior Dev', 2: 'Senior Dev', 3: 'PM / Admin' };
const ROLE_COLORS = { 1: 'text-neon-blue', 2: 'text-neon-purple', 3: 'text-neon-red' };

const NavItem = ({ item, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

  if (collapsed) {
    return (
      <NavLink
        to={item.path}
        title={item.label}
        onClick={onClick}
        className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 group ${
          isActive
            ? 'bg-white/[0.07] text-neon-blue'
            : 'text-gray-500 hover:text-white hover:bg-white/[0.05]'
        }`}
      >
        <item.icon className="w-[18px] h-[18px]" />
      </NavLink>
    );
  }

  return (
    <div className="relative">
      <NavLink
        to={item.path}
        onClick={onClick}
        className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
          isActive
            ? 'bg-white/[0.06] text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        <item.icon
          className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${
            isActive ? 'text-neon-blue' : 'group-hover:text-neon-blue'
          }`}
        />
        <span className="font-medium leading-none">{item.label}</span>
      </NavLink>
    </div>
  );
};

const SidebarNav = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRole = user?.role || 1;
  const visibleItems = NAV_ITEMS.filter((item) => userRole >= item.minRole);

  const SidebarContent = ({ collapsed }) => (
    <>
      {/* Logo */}
      {collapsed ? (
        <div className="h-14 flex items-center justify-center border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center shadow-glow-ai">
            <span className="text-xs font-bold text-white">V</span>
          </div>
        </div>
      ) : (
        <div className="h-14 flex items-center px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-ai flex items-center justify-center shadow-glow-ai flex-shrink-0">
              <span className="text-[11px] font-bold text-white">V</span>
            </div>
            <div>
              <h1 className="font-heading text-[15px] font-bold gradient-text leading-tight tracking-tight">VaultRAG</h1>
              <p className="text-[10px] text-gray-500 leading-tight">AI Knowledge Assistant</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* User footer */}
      {collapsed ? (
        <div className="h-14 flex items-center justify-center border-t border-white/[0.06]">
          <div
            className="w-7 h-7 rounded-full bg-gradient-ai flex items-center justify-center text-xs font-bold text-white"
            title={user?.email}
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-ai flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-300 truncate font-medium">{user?.email}</p>
              <p className={`text-[10px] font-semibold ${ROLE_COLORS[userRole]}`}>
                L{userRole} — {ROLE_LABELS[userRole]}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
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

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="md:hidden w-60 h-screen flex flex-col bg-surface-800 border-r border-white/[0.06] fixed left-0 top-0 z-50 pt-10"
          >
            <SidebarContent collapsed={false} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Tablet sidebar — icon only */}
      <aside className="hidden md:flex lg:hidden w-16 h-screen flex-col bg-surface-800 border-r border-white/[0.06] fixed left-0 top-0 z-40">
        <SidebarContent collapsed={true} />
      </aside>

      {/* Desktop sidebar — full */}
      <aside className="hidden lg:flex w-60 h-screen flex-col bg-surface-800 border-r border-white/[0.06] fixed left-0 top-0 z-40">
        <SidebarContent collapsed={false} />
      </aside>
    </>
  );
};

export default SidebarNav;
