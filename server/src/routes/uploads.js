const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { uploadPRD, uploadMockup } = require('../controllers/uploadsController');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not supported'));
  },
});

router.post('/prd', authenticate, requireRole(3), upload.single('file'), uploadPRD);
router.post('/mockup', authenticate, requireRole(3), upload.single('image'), uploadMockup);

// List all PRDs (for scope tracker selector)
const PRD = require('../models/PRD');
const Mockup = require('../models/Mockup');
router.get('/prds', authenticate, requireRole(2), async (req, res) => {
  const prds = await PRD.find().select('filename requirements uploadedAt').lean();
  return res.json({ prds });
});
router.get('/mockups', authenticate, requireRole(1), async (req, res) => {
  const mockups = await Mockup.find().select('filename status uploadedAt').lean();
  return res.json({ mockups });
});

module.exports = router;
