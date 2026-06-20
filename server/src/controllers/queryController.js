const { classifyInjection, generateAnswer, correlateSME, BudgetExceededError } = require('../services/groqService');
const { embedText } = require('../services/embeddingService');
const { searchChunks } = require('../services/vectorSearch');
const { writeAuditLog } = require('../utils/auditLogger');
const { checkBudget } = require('../utils/groqBudget');
const { applyConfidenceThreshold } = require('../utils/confidence');
const Commit = require('../models/Commit');
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const SmeTrace = require('../models/SmeTrace');

const saveChatPair = async (userId, question, assistantMsg, conversationId) => {
  try {
    await ChatMessage.insertMany([
      { userId, conversationId: conversationId || null, role: 'user', content: question },
      { userId, conversationId: conversationId || null, role: 'assistant', ...assistantMsg },
    ]);
    if (conversationId) {
      const convo = await Conversation.findById(conversationId).lean();
      if (convo) {
        const update = { lastMessageAt: new Date() };
        if (convo.title === 'New Chat') update.title = question.slice(0, 60);
        await Conversation.findByIdAndUpdate(conversationId, update);
      }
    }
  } catch {}
};

// Simple heuristic for detecting performance/SME queries
const PERF_KEYWORDS = ['slow', 'latency', 'regression', 'performance', 'lag', 'timeout', 'bottleneck', 'degraded', 'cause', 'sme', 'who changed', 'responsible'];
const isPerformanceQuery = (q) => PERF_KEYWORDS.some((kw) => q.toLowerCase().includes(kw));

// Detect queries about recent/last commit history
const COMMIT_KEYWORDS = ['last commit', 'latest commit', 'recent commit', 'last push', 'latest push', 'what was committed', 'what was pushed', 'recent changes', 'latest changes'];
const isCommitHistoryQuery = (q) => COMMIT_KEYWORDS.some((kw) => q.toLowerCase().includes(kw));

const handleQuery = async (req, res) => {
  const { question, conversationId } = req.body;
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
    const blockedMsg = safetyResult.reason ? `Blocked: ${safetyResult.reason}` : 'Unable to verify this request right now. Please try again in a moment.';
    await saveChatPair(userId, question, { content: blockedMsg, blocked: true }, conversationId);
    return res.status(403).json({ blocked: true, error: blockedMsg });
  }

  // Performance/SME query path
  if (isPerformanceQuery(question)) {
    return await handlePerformanceQuery(req, res, question, userId, userRole, conversationId);
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

  // Enrich context with commit author info for each chunk
  const commitMap = {};
  const commitHashes = [...new Set(sources.map((s) => s.commitHash).filter(Boolean))];
  if (commitHashes.length > 0) {
    const commits = await Commit.find({ sha: { $in: commitHashes } }).lean();
    commits.forEach((c) => { commitMap[c.sha] = c; });
  }

  // For commit-history queries, prepend the actual latest commits from DB so the LLM has ground truth
  let recentCommitHeader = '';
  if (isCommitHistoryQuery(question)) {
    const recentCommits = await Commit.find().sort({ mergedAt: -1 }).limit(5).lean();
    if (recentCommits.length > 0) {
      const lines = recentCommits.map((c, i) =>
        `${i === 0 ? '// LATEST COMMIT:' : `// COMMIT ${i + 1}:`} ${c.sha.slice(0, 7)} by ${c.authorGithubId} on ${new Date(c.mergedAt).toISOString().slice(0, 10)} — "${c.message}" (files: ${c.filesChanged.slice(0, 3).join(', ')})`
      ).join('\n');
      recentCommitHeader = `// === RECENT COMMIT HISTORY (authoritative, sorted newest first) ===\n${lines}\n\n`;
    }
  }

  const context = recentCommitHeader + sources.map((s) => {
    const commit = s.commitHash ? commitMap[s.commitHash] : null;
    const meta = commit
      ? `// File: ${s.filepath} | Last commit: ${s.commitHash?.slice(0, 7)} by ${commit.authorGithubId} on ${new Date(commit.mergedAt).toISOString().slice(0, 10)} — "${commit.message}"`
      : `// File: ${s.filepath}`;

    // Include the diff patch for this file if available
    const fileDiff = commit?.fileDiffs?.find((d) => d.filepath === s.filepath);
    const diffSection = fileDiff?.patch
      ? `\n// DIFF (+${fileDiff.additions} -${fileDiff.deletions}):\n${fileDiff.patch.slice(0, 1500)}`
      : '';

    return `${meta}${diffSection}\n\n// CURRENT CODE:\n${s.content}`;
  }).join('\n\n---\n\n');

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

  const responseSources = sources.map((s) => ({ filepath: s.filepath, snippet: s.content.slice(0, 300) }));
  await saveChatPair(userId, question, { content: answer, sources: responseSources }, conversationId);

  return res.json({ answer, sources: responseSources });
};

const handlePerformanceQuery = async (req, res, question, userId, userRole, conversationId) => {
  // Fetch recent commits for SME correlation — deduplicate by sha in case webhook re-delivered
  let commits;
  try {
    const raw = await Commit.find().sort({ mergedAt: -1 }).limit(40).lean();
    const seen = new Set();
    commits = raw.filter((c) => { if (seen.has(c.sha)) return false; seen.add(c.sha); return true; });
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

  const smeSources = commits.slice(0, 5).map((c) => ({ sha: c.sha, filepath: c.filesChanged[0] || 'unknown', snippet: `${c.sha.slice(0, 7)} by ${c.authorGithubId} — "${c.message}"` }));
  const smeInsights = {
    commitSha: attribution.commitSha,
    authorId: attribution.authorId,
    confidence,
    confidenceLevel: attribution.level,
    confidenceLabel: attribution.label,
  };

  // Persist SME trace for history
  try {
    await SmeTrace.create({ userId, symptom: question, answer, insights: smeInsights, sources: smeSources });
  } catch {}

  return res.json({ answer, sources: smeSources, insights: smeInsights });
};

module.exports = { handleQuery };
