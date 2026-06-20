const User = require('../models/User');
const { writeAuditLog } = require('../utils/auditLogger');

const changeRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (![1, 2, 3].includes(Number(role))) {
    return res.status(400).json({ error: 'Role must be 1, 2, or 3' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const oldRole = user.role;
  user.role = Number(role);
  await user.save();

  await writeAuditLog({
    userId: req.user.id,
    action: 'role_change',
    wasBlocked: false,
    metadata: { targetUserId: userId, oldRole, newRole: user.role },
  });

  return res.json({ success: true });
};

const getUsers = async (req, res) => {
  const users = await User.find().select('-passwordHash').lean();
  return res.json({ users });
};

module.exports = { changeRole, getUsers };
