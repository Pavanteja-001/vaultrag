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
const KnowledgeChunk = require('../models/KnowledgeChunk');

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

// Detect UI/design/mockup queries — always inject ALL mockup chunks so nothing is missed
const UI_KEYWORDS = ['ui', 'design', 'mockup', 'screen', 'page', 'interface', 'frontend', 'completed', 'completion', 'designed', 'layout', 'wireframe', 'figma', 'how much'];
const isUIQuery = (q) => UI_KEYWORDS.some((kw) => q.toLowerCase().includes(kw));

// Detect full project status queries — inject BOTH frontend and backend inventory
const PROJECT_STATUS_KEYWORDS = ['project completion', 'project status', 'percent of', 'percentage of', 'how much done', 'whole project', 'entire project', 'overall completion', 'frontend and backend', 'backend and frontend', 'project progress', 'what is done', 'what\'s done', 'completion status'];
const isProjectStatusQuery = (q) => PROJECT_STATUS_KEYWORDS.some((kw) => q.toLowerCase().includes(kw));

// Detect implementation-check queries — "does X work?", "is X implemented?", "does creating X deduct Y?"
const IMPL_CHECK_PATTERNS = [
  /does .{1,40} (deduct|check|send|validate|update|notify|log|auto|trigger|generate)/i,
  /is .{1,40} (implemented|working|built|done|complete)/i,
  /can you .{1,40} (discontinued|deleted|deactivated|blocked)/i,
  /\b(does|do|is|are|has|have|will)\b.{1,60}\b(work|implement|deduct|check|enforce|reject|allow|prevent|restrict)\b/i,
  /what happens when .{1,60}(called|triggered|invoked|created|updated|deleted)/i,
  /\b(show|get|view|read|print|display|give|tell)\b.{0,40}\b(controllers?|services?|middlewares?|middelwares?|handlers?|routes?|apis?|db|config|credentials?|secrets?|endpoints?|files?)/i,
];
const isImplementationQuery = (q) => IMPL_CHECK_PATTERNS.some((p) => p.test(q));

const handleQuery = async (req, res) => {
  const { question, conversationId } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const userId = req.user.id;
  const userRole = req.user.role;
  console.log(`[RBAC] query userId=${userId} role=${userRole} q="${question.slice(0, 60)}"`);


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
  // UI / implementation queries get higher limit so docs don't squeeze out code chunks
  const searchLimit = (isUIQuery(question) || isImplementationQuery(question)) ? 12 : 5;
  let sources;
  try {
    sources = await searchChunks(queryEmbedding, userRole, searchLimit);
  } catch (err) {
    await writeAuditLog({ userId, action: 'query_search_failed', wasBlocked: false, metadata: { error: err.message } });
    return res.status(503).json({ error: "Couldn't search the knowledge base right now — please retry." });
  }

  // For UI queries: build a structured inventory header so the LLM knows exactly
  // what is CODED (committed JSX/CSS files) vs DESIGNED (mockup descriptions)
  let uiInventoryHeader = '';
  if (isUIQuery(question)) {
    try {
      // All active frontend code files (role 1, not mockups/PRDs)
      // requiredRole:1 is cleaner than extension matching — hooks are .js not .jsx
      const frontendFiles = await KnowledgeChunk.find({
        'metadata.status': 'active',
        'metadata.requiredRole': 1,
        'metadata.sourceType': { $nin: ['mockup', 'prd'] },
      }).distinct('metadata.filepath');

      // All active mockup descriptions
      const mockupFiles = await KnowledgeChunk.find({
        'metadata.sourceType': 'mockup',
        'metadata.status': 'active',
        'metadata.requiredRole': { $lte: userRole },
      }).distinct('metadata.filepath');

      // Categorise files so the model doesn't confuse components with screens
      const pages    = frontendFiles.filter((f) => /\/pages\//i.test(f));
      const comps    = frontendFiles.filter((f) => /\/components\//i.test(f));
      const hooks    = frontendFiles.filter((f) => /\/hooks\//i.test(f));
      const styles   = frontendFiles.filter((f) => /\.(css|scss|less)$/i.test(f));
      const other    = frontendFiles.filter((f) => !pages.includes(f) && !comps.includes(f) && !hooks.includes(f) && !styles.includes(f));

      const fmt = (arr) => arr.length ? arr.map((f) => `  - ${f}`).join('\n') : '  (none)';

      const designedList = mockupFiles.length
        ? mockupFiles.map((f) => `  - ${f}`).join('\n')
        : '  (none uploaded yet)';

      uiInventoryHeader = `// ════════════════════════════════════════════════════════
// UI INVENTORY — use ONLY this section for completion/coverage questions
//
// CODED PAGES (full navigable screens, count these as "screens coded"):
${fmt(pages)}
//
// CODED COMPONENTS (reusable parts, NOT standalone screens — do NOT count as screens):
${fmt(comps)}
//
// CODED HOOKS (logic only, not screens):
${fmt(hooks)}
//
// CODED STYLES:
${fmt(styles)}${other.length ? `\n// OTHER:\n${fmt(other)}` : ''}
//
// DESIGNED screens (uploaded mockup images — these are the "designed" screens):
${designedList}
//
// RULE: UI screen count = number of CODED PAGES (not components/hooks/styles)
// ════════════════════════════════════════════════════════\n\n`;

      // Also inject all mockup descriptions into sources so the LLM has their content
      const allMockupChunks = await KnowledgeChunk.find({
        'metadata.sourceType': 'mockup',
        'metadata.status': 'active',
        'metadata.requiredRole': { $lte: userRole },
      }).select('content metadata').lean();

      const existingIds = new Set(sources.map((s) => s.id));
      for (const mc of allMockupChunks) {
        if (!existingIds.has(mc._id.toString())) {
          sources.push({
            id: mc._id.toString(),
            content: mc.content,
            filepath: mc.metadata.filepath,
            sourceType: mc.metadata.sourceType,
            astNodeType: mc.metadata.astNodeType,
            commitHash: null,
            score: 0,
          });
        }
      }
    } catch { /* non-fatal */ }
  }

  // For project status queries: append backend implementation inventory
  // Scans all controller chunks for implemented vs 501 (not yet built) endpoints
  if (isProjectStatusQuery(question) || (isUIQuery(question) && /backend|api|endpoint|overall|whole|entire|percent/i.test(question))) {
    try {
      const controllerChunks = await KnowledgeChunk.find({
        'metadata.status': 'active',
        'metadata.requiredRole': { $lte: userRole },
        'metadata.filepath': { $regex: /controller/i },
      }).select('content metadata.filepath').lean();

      // Group by file, check for 501 to detect unimplemented functions
      const backendMap = {};
      for (const chunk of controllerChunks) {
        const file = chunk.metadata.filepath;
        if (!backendMap[file]) backendMap[file] = { implemented: [], unimplemented: [] };
        // A chunk is a stub only if it BOTH contains 501 AND returns immediately
        // (avoids false positives where 501 appears as a comment or in a different function)
        const isStub = /res\.status\(501\)|\.json\(\s*\{[^}]*501/.test(chunk.content);
        const fnMatch = chunk.content.match(/(?:const|async function|function)\s+(\w+)/);
        if (fnMatch) {
          if (isStub) backendMap[file].unimplemented.push(fnMatch[1]);
          else backendMap[file].implemented.push(fnMatch[1]);
        }
      }

      const backendLines = Object.entries(backendMap).map(([file, { implemented, unimplemented }]) => {
        const imp = implemented.length ? `implemented: ${implemented.join(', ')}` : '';
        const unimp = unimplemented.length ? `NOT YET BUILT (returns 501): ${unimplemented.join(', ')}` : '';
        return `  - ${file}: ${[imp, unimp].filter(Boolean).join(' | ')}`;
      });

      if (backendLines.length) {
        uiInventoryHeader += `// ════════════════════════════════════════════════════════
// BACKEND INVENTORY — implemented vs unimplemented API endpoints
${backendLines.join('\n')}
// RULE: count only files/functions NOT marked "NOT YET BUILT" as implemented
// ════════════════════════════════════════════════════════\n\n`;
      }
    } catch { /* non-fatal */ }
  }

  // For implementation-check queries: inject ALL controller+service chunks so the LLM
  // sees actual code, not just PRD requirements. PRD alone must never answer these.
  let implQueryHadNoControllerAccess = false;
  if (isImplementationQuery(question)) {
    try {
      const codeChunks = await KnowledgeChunk.find({
        'metadata.status': 'active',
        'metadata.requiredRole': { $lte: userRole },
        'metadata.sourceType': 'code',
        'metadata.filepath': { $regex: /(controller|service|middleware)/i },
      }).select('content metadata').lean();

      if (codeChunks.length === 0) {
        // RBAC blocked all controller chunks — flag so we can warn the LLM
        implQueryHadNoControllerAccess = true;
      } else {
        const existingIds = new Set(sources.map((s) => s.id));
        for (const cc of codeChunks) {
          if (!existingIds.has(cc._id.toString())) {
            sources.push({
              id: cc._id.toString(),
              content: cc.content,
              filepath: cc.metadata.filepath,
              sourceType: cc.metadata.sourceType,
              astNodeType: cc.metadata.astNodeType,
              commitHash: cc.metadata.commitHash,
              score: 0,
            });
            existingIds.add(cc._id.toString());
          }
        }
      }
    } catch { /* non-fatal */ }
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

  // Build context — cap each chunk to prevent token overflow with Groq
  // Mockup/PRD/README descriptions get more space; code chunks get less (diffs are verbose)
  const MAX_CONTEXT_CHARS = 8000;
  let totalChars = recentCommitHeader.length;

  const contextParts = [];
  for (const s of sources) {
    if (totalChars >= MAX_CONTEXT_CHARS) break;

    const isMockup = s.sourceType === 'mockup';
    const isPRD = s.sourceType === 'prd';
    const isDoc = isMockup || isPRD || s.filepath?.endsWith('.md') || s.filepath?.endsWith('.txt');

    const commit = s.commitHash ? commitMap[s.commitHash] : null;
    const meta = commit
      ? `// File: ${s.filepath} | Last commit: ${s.commitHash?.slice(0, 7)} by ${commit.authorGithubId} on ${new Date(commit.mergedAt).toISOString().slice(0, 10)} — "${commit.message}"`
      : `// File: ${s.filepath}`;

    // Skip diffs for doc/mockup chunks — they bloat context for no benefit
    const fileDiff = !isDoc && commit?.fileDiffs?.find((d) => d.filepath === s.filepath);
    const diffSection = fileDiff?.patch
      ? `\n// DIFF (+${fileDiff.additions} -${fileDiff.deletions}):\n${fileDiff.patch.slice(0, 800)}`
      : '';

    // Mockups/PRD get 1200 chars; code gets 600 chars
    const contentLimit = isDoc ? 1200 : 600;
    const content = s.content.slice(0, contentLimit);

    const part = `${meta}${diffSection}\n\n${isDoc ? '// CONTENT:\n' : '// CURRENT CODE:\n'}${content}`;
    contextParts.push(part);
    totalChars += part.length;
  }

  // If user asked about controller code but RBAC blocked all of it, prepend a hard warning
  // so the LLM cannot hallucinate code it doesn't have access to
  const rbacBlockWarning = implQueryHadNoControllerAccess
    ? `// ⚠ RBAC ACCESS BLOCK: This user does NOT have access to backend controller, service, or middleware code.
// Backend implementation code is restricted to higher access levels.
// You MUST answer: "I don't have access to the backend controller code at your permission level."
// Do NOT generate, invent, guess, or roleplay any controller or service code.
// Do NOT use the "// File: ... | Last commit: ..." format in your answer — that is reserved for actual retrieved code only.\n\n`
    : '';

  const context = rbacBlockWarning + uiInventoryHeader + recentCommitHeader + contextParts.join('\n\n---\n\n');

  // Generate answer — retry once with backoff internally, then return graceful fallback
  let answer;
  try {
    answer = await generateAnswer(context, question, userRole);
  } catch (genErr) {
    const isRateLimit = genErr?.status === 429 || genErr?.message?.includes('429') || genErr?.message?.includes('rate');
    await writeAuditLog({ userId, action: 'query_generation_failed', wasBlocked: false, metadata: { error: genErr?.message } });
    const fallbackMsg = isRateLimit
      ? 'The AI is being rate-limited — please wait 5–10 seconds and try again. Here are the relevant sources found:'
      : 'Found relevant sources but couldn\'t generate an answer right now — please retry in a moment.';
    return res.json({
      answer: fallbackMsg,
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
