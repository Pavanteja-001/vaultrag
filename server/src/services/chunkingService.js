const path = require('path');

// Role tagging rules — configurable via ROLE_RULES_CONFIG env var (JSON file path)
const DEFAULT_ROLE_RULES = [
  // Role 3 (most restricted) — checked first
  { pattern: /src\/config\//i, role: 3 },
  { pattern: /\.env/i, role: 3 },
  { pattern: /secrets?\//i, role: 3 },
  { pattern: /credentials?\//i, role: 3 },
  { pattern: /private\//i, role: 3 },
  // Role 2 (backend/services)
  { pattern: /src\/services\//i, role: 2 },
  { pattern: /src\/controllers\//i, role: 2 },
  { pattern: /src\/middleware\//i, role: 2 },
  { pattern: /src\/workers\//i, role: 2 },
  { pattern: /src\/models\//i, role: 2 },
  { pattern: /src\/routes\//i, role: 2 },
  // Role 1 (public)
  { pattern: /src\/components\//i, role: 1 },
  { pattern: /public\//i, role: 1 },
  { pattern: /\.md$/i, role: 1 },
  { pattern: /\.txt$/i, role: 1 },
  { pattern: /README/i, role: 1 },
];

let roleRules = DEFAULT_ROLE_RULES;

/**
 * Infers the required access role based on file path.
 * Returns 1 | 2 | 3. Defaults to 2 for unmatched paths.
 */
const inferRequiredRole = (filepath) => {
  const normalized = filepath.replace(/\\/g, '/');
  for (const rule of roleRules) {
    if (rule.pattern.test(normalized)) return rule.role;
  }
  return 2; // Default to role 2 for unknown paths
};

/**
 * Chunks plain text (markdown, plain text, PRDs) by paragraph/section.
 * Returns array of { text, startLine, endLine, nodeType }.
 */
const chunkByParagraph = (content, filepath) => {
  const lines = content.split('\n');
  const chunks = [];
  let current = [];
  let startLine = 0;

  lines.forEach((line, idx) => {
    if (line.trim() === '' && current.length > 0) {
      const text = current.join('\n').trim();
      if (text.length > 20) {
        chunks.push({ text, startLine, endLine: idx - 1, nodeType: 'paragraph', filepath });
      }
      current = [];
      startLine = idx + 1;
    } else {
      current.push(line);
    }
  });

  if (current.length > 0) {
    const text = current.join('\n').trim();
    if (text.length > 20) {
      chunks.push({ text, startLine, endLine: lines.length - 1, nodeType: 'paragraph', filepath });
    }
  }

  return chunks;
};

/**
 * Chunk JS/TS code using regex-based function/class detection.
 * Falls back to paragraph chunking for non-code files.
 * Returns array of { text, startLine, endLine, nodeType, filepath }.
 */
const chunkJavaScript = (content, filepath) => {
  const lines = content.split('\n');
  const chunks = [];
  const functionPattern = /^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\(|^(export\s+)?class\s+\w+/;
  const arrowFuncPattern = /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\(.*\)\s*=>/;

  let currentChunk = [];
  let startLine = 0;
  let braceDepth = 0;
  let inChunk = false;
  let currentNodeType = 'function';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isStart = functionPattern.test(line.trim()) || arrowFuncPattern.test(line.trim());

    if (isStart && !inChunk) {
      if (currentChunk.length > 0 && currentChunk.join('\n').trim().length > 20) {
        chunks.push({ text: currentChunk.join('\n').trim(), startLine, endLine: i - 1, nodeType: 'block', filepath });
      }
      currentChunk = [line];
      startLine = i;
      inChunk = true;
      braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      currentNodeType = line.includes('class ') ? 'class' : 'function';
      continue;
    }

    if (inChunk) {
      currentChunk.push(line);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0 && currentChunk.length > 1) {
        const text = currentChunk.join('\n').trim();
        if (text.length > 20) {
          chunks.push({ text, startLine, endLine: i, nodeType: currentNodeType, filepath });
        }
        currentChunk = [];
        inChunk = false;
      }
    } else {
      currentChunk.push(line);
    }
  }

  if (currentChunk.length > 0 && currentChunk.join('\n').trim().length > 20) {
    chunks.push({ text: currentChunk.join('\n').trim(), startLine, endLine: lines.length - 1, nodeType: 'block', filepath });
  }

  return chunks.length > 0 ? chunks : chunkByParagraph(content, filepath);
};

/**
 * Main chunking entry point.
 * Dispatches to the right chunker based on file extension.
 */
const chunkFile = (filepath, content) => {
  const ext = path.extname(filepath).toLowerCase();
  let rawChunks;

  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    rawChunks = chunkJavaScript(content, filepath);
  } else if (['.py'].includes(ext)) {
    rawChunks = chunkByParagraph(content, filepath);
  } else {
    rawChunks = chunkByParagraph(content, filepath);
  }

  return rawChunks.map((chunk) => ({
    ...chunk,
    requiredRole: inferRequiredRole(filepath),
  }));
};

module.exports = { chunkFile, inferRequiredRole };
