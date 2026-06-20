const pdfParse = require('pdf-parse');
const { embedText } = require('../services/embeddingService');
const { parseMockup, VisionProcessingError } = require('../services/visionService');
const { chunkFile } = require('../services/chunkingService');
const { processChunks } = require('../workers/embeddingWorker');
const { writeAuditLog } = require('../utils/auditLogger');
const PRD = require('../models/PRD');
const Mockup = require('../models/Mockup');
const KnowledgeChunk = require('../models/KnowledgeChunk');

const uploadPRD = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, buffer, mimetype } = req.file;
  let text;

  // Extract text
  try {
    if (mimetype === 'application/pdf' || originalname.endsWith('.pdf')) {
      const parsed = await pdfParse(buffer);
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

  // Extract requirements — split by common PRD patterns
  const requirementPatterns = [
    /^\d+\.\s+.+/m,  // 1. Requirement
    /^[-*•]\s+.+/m,  // - Requirement
    /^#+\s+.+/m,     // ## Section header
    /^REQ-\d+/m,     // REQ-001 format
  ];

  const lines = text.split('\n').filter((l) => l.trim().length > 10);
  const requirements = lines
    .filter((line) => requirementPatterns.some((p) => p.test(line.trim())))
    .map((text) => ({ text: text.trim(), status: 'not_started', manualOverride: false }))
    .slice(0, 200);

  if (requirements.length === 0) {
    // Fall back: treat every paragraph as a requirement
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 20);
    requirements.push(...paragraphs.slice(0, 100).map((text) => ({
      text: text.trim().slice(0, 500),
      status: 'not_started',
      manualOverride: false,
    })));
  }

  const prd = await PRD.create({
    uploadedBy: req.user.id,
    filename: originalname,
    requirements,
    uploadedAt: new Date(),
  });

  // Chunk and embed asynchronously
  setImmediate(async () => {
    const chunks = chunkFile(`prd/${originalname}`, text);
    await processChunks({ chunks, commitHash: null, sourceType: 'prd' });

    // Also embed each chunk with requiredRole: 3 (PRDs are L3 content)
    for (const chunk of chunks) {
      chunk.requiredRole = 3;
    }
  });

  await writeAuditLog({
    userId: req.user.id,
    action: 'prd_upload',
    wasBlocked: false,
    metadata: { filename: originalname, requirementsCount: requirements.length },
  });

  return res.json({
    prdId: prd._id,
    requirementsCount: requirements.length,
    requirements: requirements.map((r) => ({ text: r.text })),
  });
};

const uploadMockup = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const { originalname, buffer, mimetype } = req.file;

  // Create mockup record as "pending" immediately — return fast
  const mockup = await Mockup.create({
    uploadedBy: req.user.id,
    filename: originalname,
    status: 'pending',
    uploadedAt: new Date(),
  });

  res.json({ mockupId: mockup._id, status: 'pending' });

  // Async: process with Gemini Vision
  setImmediate(async () => {
    try {
      const description = await parseMockup(buffer, mimetype);
      mockup.description = description;
      mockup.status = 'active';
      await mockup.save();

      // Embed the description and write to KnowledgeChunks
      try {
        const embedding = await embedText(description);
        await KnowledgeChunk.findOneAndUpdate(
          { 'metadata.filepath': `mockup/${originalname}`, 'metadata.astNodeType': 'description' },
          {
            content: description,
            embedding,
            metadata: {
              filepath: `mockup/${originalname}`,
              requiredRole: 1, // Mockup descriptions are accessible to all devs
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

      console.error(`Mockup vision processing failed: ${originalname} — ${err.message}`);
    }
  });
};

module.exports = { uploadPRD, uploadMockup };
