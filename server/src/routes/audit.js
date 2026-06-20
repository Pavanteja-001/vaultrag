const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getAuditLogs } = require('../controllers/auditController');

router.get('/', authenticate, requireRole(3), getAuditLogs);

module.exports = router;
