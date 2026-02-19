/**
 * claude-prism — Debug Loop Detector
 * Warns on repeated edits to same file, blocks at threshold
 */

import { createHash } from 'crypto';
import { readState, writeState, readJsonState, writeJsonState } from '../lib/state.mjs';
import { DEFAULTS, buildSourcePattern } from '../lib/config.mjs';
import { getMessage } from '../lib/messages.mjs';

export const debugLoop = {
  name: 'debug-loop',

  evaluate(ctx, config, stateDir) {
    const filePath = ctx.filePath;
    if (!filePath) return { type: 'pass' };

    // Skip non-source files
    const sourcePattern = buildSourcePattern(config.sourceExtensions || DEFAULTS.sourceExtensions);
    if (!sourcePattern.test(filePath)) return { type: 'pass' };

    const hash = createHash('md5').update(filePath).digest('hex').slice(0, 8);
    const countKey = `edit-count-${hash}`;
    const logKey = `edit-log-${hash}`;

    // Increment counter
    const prev = parseInt(readState(stateDir, countKey) || '0', 10) || 0;
    const count = prev + 1;
    writeState(stateDir, countKey, String(count));

    // Track edit snippets for pattern analysis
    const oldStr = ctx.oldString || '';
    let editLog = readJsonState(stateDir, logKey) || [];
    const snippet = oldStr.slice(0, 80).replace(/\n/g, '\\n');
    editLog.push({ edit: count, snippet, ts: Date.now() });
    if (editLog.length > 10) editLog = editLog.slice(-10);
    writeJsonState(stateDir, logKey, editLog);

    const name = filePath.split('/').pop();
    const lang = config.language || 'en';
    const pattern = count >= config.warnAt ? analyzePattern(editLog) : null;

    if (count >= config.blockAt) {
      // Divergent pattern → block; convergent (different areas) → downgrade to warn
      if (pattern === 'divergent') {
        return {
          type: 'block',
          message: getMessage(lang, 'debug-loop.block.divergent', { name, count })
        };
      }
      return {
        type: 'warn',
        message: getMessage(lang, 'debug-loop.warn.convergent', { name, count })
      };
    }

    if (count >= config.warnAt) {
      // Only warn on divergent pattern (same area edited repeatedly)
      if (pattern === 'divergent') {
        return {
          type: 'warn',
          message: getMessage(lang, 'debug-loop.warn.divergent', { name, count })
        };
      }
      // Convergent edits (different areas) = normal progressive work → pass
    }

    return { type: 'pass' };
  }
};

// Common statement prefixes that don't indicate "same area"
const BOILERPLATE_RE = /^(?:import\s.*?from\s|import\s*\{|export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)\s|const\s|let\s|var\s|function\s|return\s)/;

function stripBoilerplate(snippet) {
  return snippet.replace(BOILERPLATE_RE, '').trim();
}

function analyzePattern(log) {
  if (log.length < 3) return null;
  const recent = log.slice(-3).map(e => e.snippet);

  // Filter out empty/whitespace snippets — can't determine pattern
  if (recent.some(s => !s || !s.trim())) return null;

  // Exact duplicates = clearly divergent (same code edited repeatedly)
  const uniqueSnippets = new Set(recent).size;
  if (uniqueSnippets === 1) return 'divergent';

  // Strip boilerplate prefixes before comparing (import X from, const, etc.)
  const stripped = recent.map(stripBoilerplate);
  const uniqueStripped = new Set(stripped).size;

  // After stripping, if all unique → editing different areas
  if (uniqueStripped === recent.length) return 'convergent';

  // Check for meaningful overlap using stripped content
  const baseSnippet = stripped[0].slice(0, 30);
  if (baseSnippet.length < 10) return uniqueStripped <= 1 ? 'divergent' : 'convergent';

  // Require all 3 to overlap (stricter than previous >= 2)
  const overlap = stripped.filter(s => s.includes(baseSnippet)).length;
  return overlap >= 3 ? 'divergent' : 'convergent';
}
