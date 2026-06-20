const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getScopeStatus, updateRequirementStatus } = require('../controllers/scopeController');

router.get('/:prdId', authenticate, requireRole(2), getScopeStatus);
router.patch('/:prdId/requirements/:reqId', authenticate, requireRole(3), updateRequirementStatus);

module.exports = router;
