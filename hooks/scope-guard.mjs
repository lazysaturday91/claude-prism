/**
 * claude-prism — Scope Guard
 * Warns when too many unique files are modified without a plan
 */

import { readJsonState, writeJsonState } from '../lib/state.mjs';

const SOURCE_PATTERN = /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|svelte|vue)$/;
const TEST_PATTERN = /\.(test|spec|_test)\./;

export const scopeGuard = {
  name: 'scope-guard',

  evaluate(ctx, config, stateDir) {
    const filePath = ctx.filePath;
    if (!filePath) return { type: 'pass' };

    // Only track source files
    if (!SOURCE_PATTERN.test(filePath)) return { type: 'pass' };

    // Don't count test files toward scope
    if (TEST_PATTERN.test(filePath)) return { type: 'pass' };

    // Track unique files
    let files = readJsonState(stateDir, 'scope-files') || [];
    if (!files.includes(filePath)) {
      files.push(filePath);
      writeJsonState(stateDir, 'scope-files', files);
    }

    const count = files.length;

    // Agent-aware thresholds: sub-agents get higher limits
    const isAgent = ctx.agentId && ctx.agentId !== '' && ctx.agentId !== 'default';
    const warnAt = isAgent ? (config.agentWarnAt || 8) : (config.warnAt || 4);
    const blockAt = isAgent ? (config.agentBlockAt || 12) : (config.blockAt || 7);

    if (count >= blockAt) {
      return {
        type: 'block',
        message: `[prism] Scope Guard: ${count} unique files modified without a plan. Run /prism to decompose before continuing.`
      };
    }

    if (count >= warnAt) {
      return {
        type: 'warn',
        message: `[prism] Scope Guard: ${count} unique files modified. Consider running /prism to decompose the task.`
      };
    }

    return { type: 'pass' };
  }
};
