const { classifyInjection, generateAnswer, correlateSME, BudgetExceededError } = require('../services/groqService');
const { embedText } = require('../services/embeddingService');
const { searchChunks } = require('../services/vectorSearch');
const { writeAuditLog } = require('../utils/auditLogger');
const { checkBudget } = require('../utils/groqBudget');
const { applyConfidenceThreshold } = require('../utils/confidence');
const Commit = require('../models/Commit');

// Simple heuristic for detecting performance/SME queries
const PERF_KEYWORDS = ['slow', 'latency', 'regression', 'performance', 'lag', 'timeout', 'bottleneck', 'degraded', 'cause', 'sme', 'who changed', 'responsible'];
const isPerformanceQuery = (q) => PERF_KEYWORDS.some((kw) => q.toLowerCase().includes(kw));

const handleQuery = async (req, res) => {
  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const userId = req.user.id;
  const userRole = req.user.role;

  // Check Groq budget
  try {
    await checkBudget();
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return res.status(429).json({ error: 'Daily AI query limit reached, resets at midnight UTC.' });
    }
    throw err;
  }

  // Safety classifier — FAIL CLOSED
  let safetyResult;
  try {
    safetyResult = await classifyInjection(question);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return res.status(429).json({ error: 'Daily AI query limit reached, resets at midnight UTC.' });
    }
    // Timeout or error → fail closed
    safetyResult = { safe: false };
  }

  if (!safetyResult.safe) {
    await writeAuditLog({
      userId,
      action: 'query_blocked_injection',
      wasBlocked: true,
      metadata: { questionLength: question.length },
    });
    return res.status(403).json({
      blocked: true,
      error: safetyResult.reason
        ? `Blocked: ${safetyResult.reason}`
        : 'Unable to verify this request right now. Please try again in a moment.',
    });
  }

  // Performance/SME query path
  if (isPerformanceQuery(question)) {
    return await handlePerformanceQuery(req, res, question, userId, userRole);
  }

  // Embed the question
  let queryEmbedding;
  try {
    queryEmbedding = await embedText(question);
  } catch (err) {
    await writeAuditLog({ userId, action: 'query_embed_failed', wasBlocked: false, metadata: { error: err.message } });
    return res.status(503).json({ error: "Couldn't search the knowledge base right now — please retry." });
  }

  // Vector search with RBAC filter inside the query
  let sources;
  try {
    sources = await searchChunks(queryEmbedding, userRole);
  } catch (err) {
    await writeAuditLog({ userId, action: 'query_search_failed', wasBlocked: false, metadata: { error: err.message } });
    return res.status(503).json({ error: "Couldn't search the knowledge base right now — please retry." });
  }

  if (!sources || sources.length === 0) {
    await writeAuditLog({ userId, action: 'query_no_results', wasBlocked: false });
    return res.json({ answer: 'No relevant content found in the knowledge base for your query.', sources: [] });
  }

  const context = sources.map((s) => `[${s.filepath}]\n${s.content}`).join('\n\n---\n\n');

  // Generate answer — retry once internally, then return raw sources
  let answer;
  try {
    answer = await generateAnswer(context, question);
  } catch {
    // Both attempts failed — return raw sources with fallback message
    await writeAuditLog({ userId, action: 'query_generation_failed', wasBlocked: false });
    return res.json({
      answer: 'Found relevant sources but couldn\'t generate an answer — here are the raw sources.',
      sources: sources.map((s) => ({ filepath: s.filepath, snippet: s.content.slice(0, 300) })),
      fallback: true,
    });
  }

  await writeAuditLog({ userId, action: 'query', wasBlocked: false, metadata: { sourcesCount: sources.length } });

  return res.json({
    answer,
    sources: sources.map((s) => ({ filepath: s.filepath, snippet: s.content.slice(0, 300) })),
  });
};

const handlePerformanceQuery = async (req, res, question, userId, userRole) => {
  // Fetch recent commits for SME correlation
  let commits;
  try {
    commits = await Commit.find().sort({ mergedAt: -1 }).limit(20).lean();
  } catch {
    return res.status(503).json({ error: "Couldn't retrieve recent commit history right now." });
  }

  if (!commits || commits.length === 0) {
    return res.json({
      answer: 'No commit history available yet. Push code through the GitHub webhook to populate commit data.',
      sources: [],
      insights: null,
    });
  }

  let correlation;
  try {
    correlation = await correlateSME(question, commits);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return res.status(429).json({ error: 'Daily AI query limit reached, resets at midnight UTC.' });
    }
    return res.status(503).json({ error: "Couldn't retrieve recent commit history right now." });
  }

  const { confidence = 0, commitSha, authorId, reason } = correlation;
  const attribution = applyConfidenceThreshold(confidence, commitSha, authorId);

  let answer;
  if (attribution.level === 'high') {
    answer = `PR authored by @${attribution.authorId} (commit \`${attribution.commitSha?.slice(0, 7)}\`) is the likely cause. ${reason}`;
  } else if (attribution.level === 'medium') {
    answer = `Possible cause: commit \`${attribution.commitSha?.slice(0, 7)}\` by @${attribution.authorId}. Could not confirm with high confidence. ${reason}`;
  } else {
    answer = `Unable to confidently identify a responsible commit. Here's what changed recently in this area:\n${commits.slice(0, 5).map((c) => `• \`${c.sha.slice(0, 7)}\` — ${c.message} (${c.mergedAt})`).join('\n')}`;
  }

  await writeAuditLog({ userId, action: 'query_sme', wasBlocked: false, metadata: { confidence, attribution: attribution.level } });

  return res.json({
    answer,
    sources: commits.slice(0, 5).map((c) => ({ filepath: c.filesChanged[0] || 'unknown', snippet: c.message })),
    insights: {
      commitSha: attribution.commitSha,
      authorId: attribution.authorId,
      confidence,
      confidenceLevel: attribution.level,
      confidenceLabel: attribution.label,
    },
  });
};

module.exports = { handleQuery };
