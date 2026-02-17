/**
 * claude-prism — Debug Loop Detector
 * Warns on repeated edits to same file, blocks at threshold
 */

import { createHash } from 'crypto';
import { readState, writeState, readJsonState, writeJsonState } from '../lib/state.mjs';

export const debugLoop = {
  name: 'debug-loop',

  evaluate(ctx, config, stateDir) {
    const filePath = ctx.filePath;
    if (!filePath) return { type: 'pass' };

    // Skip non-source files
    if (!/\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h)$/.test(filePath)) return { type: 'pass' };

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
    const pattern = count >= config.warnAt ? analyzePattern(editLog) : null;

    if (count >= config.blockAt) {
      // Divergent pattern → block; convergent (different areas) → downgrade to warn
      if (pattern === 'divergent') {
        return {
          type: 'block',
          message: `🌈 Prism ✋ Debug Loop blocked: ${name} edited ${count} times on same area. Discuss approach with user before continuing.`
        };
      }
      return {
        type: 'warn',
        message: `🌈 Prism > Debug Loop: ${name} edited ${count} times (different areas). Consider if this is expected.`
      };
    }

    if (count >= config.warnAt) {
      // Only warn on divergent pattern (same area edited repeatedly)
      if (pattern === 'divergent') {
        return {
          type: 'warn',
          message: `🌈 Prism > Debug Loop: ${name} edited ${count} times on same area. Stop and investigate root cause.`
        };
      }
      // Convergent edits (different areas) = normal progressive work → pass
    }

    return { type: 'pass' };
  }
};

function analyzePattern(log) {
  if (log.length < 3) return null;
  const recent = log.slice(-3).map(e => e.snippet);
  const uniqueSnippets = new Set(recent).size;
  if (uniqueSnippets === 1) return 'divergent';
  const overlap = recent.filter(s => recent[0] && s.includes(recent[0].slice(0, 20))).length;
  return overlap >= 2 ? 'divergent' : 'convergent';
}
