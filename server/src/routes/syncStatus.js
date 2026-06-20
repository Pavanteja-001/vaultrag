const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Config = require('../models/Config');

router.get('/', authenticate, async (req, res) => {
  const config = await Config.findById('daily_budget').lean();
  return res.json({
    status: config?.syncStatus || 'synced',
    lastSyncedAt: config?.lastSyncedAt || null,
    failedFiles: config?.failedFiles || [],
  });
});

module.exports = router;
