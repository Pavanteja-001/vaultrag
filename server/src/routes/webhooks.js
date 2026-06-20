const express = require('express');
const router = express.Router();
const { handleGithubWebhook } = require('../controllers/webhookController');

// Raw body is required for HMAC signature verification
// Attached in index.js before json() middleware for this route
router.post('/github', handleGithubWebhook);

module.exports = router;
