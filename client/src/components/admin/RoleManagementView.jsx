import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';

const ROLE_LABELS = { 1: 'L1 — Junior Dev', 2: 'L2 — Senior Engineer', 3: 'L3 — PM / Admin' };
const ROLE_COLORS = { 1: 'text-neon-blue', 2: 'text-neon-purple', 3: 'text-neon-red' };

const RoleSelectDropdown = ({ user, onRoleChange }) => {
  const [changing, setChanging] = useState(false);

  const handleChange = async (e) => {
    const newRole = Number(e.target.value);
    if (newRole === user.role) return;
    const confirmed = window.confirm(`Change @${user.email} to ${ROLE_LABELS[newRole]}? This takes effect immediately.`);
    if (!confirmed) return;

    setChanging(true);
    try {
      await axiosClient.patch(`/api/admin/role/${user._id}`, { role: newRole });
      onRoleChange(user._id, newRole);
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`, {
        style: { background: '#18181B', color: '#00FF87', border: '1px solid #00FF8740' },
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Role change failed');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {changing && <Loader2 className="w-3.5 h-3.5 text-neon-blue animate-spin" />}
      <select
        value={user.role}
        onChange={handleChange}
        disabled={changing}
        className="bg-surface-700 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white input-glow disabled:opacity-50"
      >
        <option value={1}>L1 — Junior Dev</option>
        <option value={2}>L2 — Senior Engineer</option>
        <option value={3}>L3 — PM / Admin</option>
      </select>
    </div>
  );
};

const RoleManagementView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get('/api/admin/users')
      .then((res) => setUsers(res.data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = (userId, newRole) => {
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-6 h-6 text-neon-blue" />
        <div>
          <h1 className="font-heading text-2xl font-bold gradient-text">Role Management</h1>
          <p className="text-sm text-gray-500">Manage user access levels — changes take effect immediately</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="glass-card h-14 skeleton" />)}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-mono-code">Email</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-mono-code">Current Role</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-mono-code">Status</th>
                <th className="text-left px-5 py-3 text-xs text-gray-500 font-mono-code">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <motion.tr
                  key={user._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-surface-800/30'}`}
                >
                  <td className="px-5 py-3 text-white font-mono-code text-xs">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-mono-code ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-mono-code ${user.isActive ? 'text-neon-green' : 'text-gray-600'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <RoleSelectDropdown user={user} onRoleChange={handleRoleChange} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoleManagementView;
