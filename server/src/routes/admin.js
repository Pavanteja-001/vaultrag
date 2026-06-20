const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { changeRole, getUsers } = require('../controllers/adminController');

router.get('/users', authenticate, requireRole(3), getUsers);
router.patch('/role/:userId', authenticate, requireRole(3), changeRole);

module.exports = router;
