const express = require('express');
const router = express.Router();
const { handleQuery } = require('../controllers/queryController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { rateLimitMiddleware } = require('../middleware/rateLimit');

router.post('/', authenticate, requireRole(1), rateLimitMiddleware, handleQuery);

module.exports = router;
