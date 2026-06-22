const path = require('path');
const { PDFParse } = require('pdf-parse');
const { embedText } = require('../services/embeddingService');
const { parseMockup } = require('../services/visionService');
const { uploadImage, uploadFile, getSignedUrl, proxyCloudinaryFile } = require('../services/cloudinaryService');
const { chunkFile } = require('../services/chunkingService');
const { processChunks } = require('../workers/embeddingWorker');
const { writeAuditLog } = require('../utils/auditLogger');
const PRD = require('../models/PRD');
const Mockup = require('../models/Mockup');
const KnowledgeChunk = require('../models/KnowledgeChunk');

const uploadPRD = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { originalname, buffer, mimetype } = req.file;
  let text;

  try {
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      text = parsed.text;
    } else {
      text = buffer.toString('utf-8');
    }
  } catch (err) {
    return res.status(422).json({ error: `PRD text extraction failed: ${err.message}. Please upload a valid PDF or text file.` });
  }

  if (!text || text.trim().length < 50) {
    return res.status(422).json({ error: 'PRD file appears to be empty or corrupted. Please check the file and retry.' });
  }

  // Extract requirements
  const requirementPatterns = [/^\d+\.\s+.+/m, /^[-*•]\s+.+/m, /^#+\s+.+/m, /^REQ-\d+/m];
  const lines = text.split('\n').filter((l) => l.trim().length > 10);
  let requirements = lines
    .filter((line) => requirementPatterns.some((p) => p.test(line.trim())))
    .map((t) => ({ text: t.trim(), status: 'not_started', manualOverride: false }))
    .slice(0, 200);

  if (requirements.length === 0) {
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 20);
    requirements = paragraphs.slice(0, 100).map((t) => ({
      text: t.trim().slice(0, 500),
      status: 'not_started',
      manualOverride: false,
    }));
  }

  // Upload to Cloudinary (Vercel-compatible — no local disk)
  let fileUrl = null;
  try {
    fileUrl = await uploadFile(buffer, originalname);
  } catch (err) {
    console.warn('Cloudinary PRD upload skipped:', err.message);
  }

  const prd = await PRD.create({
    uploadedBy: req.user.id,
    filename: originalname,
    requirements,
    fileUrl,
    uploadedAt: new Date(),
  });

  // Chunk and embed async
  setImmediate(async () => {
    const chunks = chunkFile(`prd/${originalname}`, text);
    chunks.forEach((c) => { c.requiredRole = 3; });
    await processChunks({ chunks, commitHash: null, sourceType: 'prd' });
  });

  await writeAuditLog({
    userId: req.user.id,
    action: 'prd_upload',
    wasBlocked: false,
    metadata: { filename: originalname, requirementsCount: requirements.length },
  });

  return res.json({
    _id: prd._id,
    filename: prd.filename,
    fileUrl,
    requirementsCount: requirements.length,
    requirements: requirements.map((r) => ({ text: r.text })),
    uploadedAt: prd.uploadedAt,
  });
};

const uploadMockup = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const { originalname, buffer, mimetype } = req.file;

  let imageUrl = null;
  try {
    imageUrl = await uploadImage(buffer, originalname);
  } catch (err) {
    console.warn('Cloudinary mockup upload skipped:', err.message);
  }

  const mockup = await Mockup.create({
    uploadedBy: req.user.id,
    filename: originalname,
    imageUrl,
    status: 'pending',
    uploadedAt: new Date(),
  });

  res.json({
    mockupId: mockup._id,
    filename: mockup.filename,
    imageUrl,
    status: 'pending',
    uploadedAt: mockup.uploadedAt,
  });

  setImmediate(async () => {
    try {
      const description = await parseMockup(buffer, mimetype);
      mockup.description = description;
      mockup.status = 'active';
      await mockup.save();

      try {
        const embedding = await embedText(description);
        await KnowledgeChunk.findOneAndUpdate(
          { 'metadata.filepath': `mockup/${originalname}`, 'metadata.astNodeType': 'description' },
          {
            content: description,
            embedding,
            metadata: {
              filepath: `mockup/${originalname}`,
              requiredRole: 1,
              commitHash: null,
              sourceType: 'mockup',
              astNodeType: 'description',
              version: null,
              status: 'active',
            },
          },
          { upsert: true }
        );
      } catch (embedErr) {
        console.error('Mockup embed failed:', embedErr.message);
      }

      await writeAuditLog({
        userId: req.user.id,
        action: 'mockup_upload_success',
        wasBlocked: false,
        metadata: { filename: originalname, mockupId: mockup._id },
      });
    } catch (err) {
      mockup.status = 'failed';
      await mockup.save();
      await writeAuditLog({
        userId: req.user.id,
        action: 'mockup_upload_failed',
        wasBlocked: false,
        metadata: { filename: originalname, error: err.message },
      });
    }
  });
};

const getMockupStatus = async (req, res) => {
  const mockup = await Mockup.findById(req.params.id).select('status description imageUrl filename').lean();
  if (!mockup) return res.status(404).json({ error: 'Mockup not found' });
  return res.json(mockup);
};

// Serve PDF — proxied through server so JWT auth applies and Cloudinary signed URL handles delivery
const servePRDFile = async (req, res) => {
  try {
    const prd = await PRD.findById(req.params.id).select('filename fileUrl').lean();
    if (!prd?.fileUrl) return res.status(404).json({ error: 'File not found' });
    const signedUrl = getSignedUrl(prd.fileUrl, 'raw');
    await proxyCloudinaryFile(signedUrl, res, 'application/pdf', prd.filename);
  } catch (err) {
    console.error('[servePRDFile]', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Could not serve file' });
  }
};

const serveMockupFile = async (req, res) => {
  try {
    const mockup = await Mockup.findById(req.params.id).select('filename imageUrl').lean();
    if (!mockup?.imageUrl) return res.status(404).json({ error: 'File not found' });
    const signedUrl = getSignedUrl(mockup.imageUrl, 'image');
    await proxyCloudinaryFile(signedUrl, res, 'image/jpeg', mockup.filename);
  } catch (err) {
    console.error('[serveMockupFile]', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Could not serve file' });
  }
};

const deletePRD = async (req, res) => {
  const prd = await PRD.findById(req.params.id).lean();
  if (!prd) return res.status(404).json({ error: 'PRD not found' });
  await PRD.findByIdAndDelete(req.params.id);
  await KnowledgeChunk.deleteMany({ 'metadata.filepath': `prd/${prd.filename}` });
  await writeAuditLog({ userId: req.user.id, action: 'prd_delete', wasBlocked: false, metadata: { filename: prd.filename } });
  return res.json({ success: true });
};

const deleteMockup = async (req, res) => {
  const mockup = await Mockup.findById(req.params.id).lean();
  if (!mockup) return res.status(404).json({ error: 'Mockup not found' });
  await Mockup.findByIdAndDelete(req.params.id);
  await KnowledgeChunk.deleteMany({ 'metadata.filepath': `mockup/${mockup.filename}` });
  await writeAuditLog({ userId: req.user.id, action: 'mockup_delete', wasBlocked: false, metadata: { filename: mockup.filename } });
  return res.json({ success: true });
};

module.exports = { uploadPRD, uploadMockup, getMockupStatus, deletePRD, deleteMockup, servePRDFile, serveMockupFile };
