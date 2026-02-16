/**
 * claude-prism — Commit Guard
 * Blocks commits when tests failed or haven't been run
 */

import { readState } from '../lib/state.mjs';

export const commitGuard = {
  name: 'commit-guard',

  evaluate(ctx, config, stateDir) {
    const command = ctx.command || '';

    if (!command.includes('git commit')) return { type: 'pass' };
    if (command.includes('--allow-empty')) return { type: 'pass' };

    // Hard block: last test failed
    const testResult = readState(stateDir, 'last-test-result');
    if (testResult !== null && testResult.trim() === 'fail') {
      return {
        type: 'block',
        message: '🌈 Prism ✋ Commit blocked: last test run FAILED. Fix tests before committing.'
      };
    }

    // Soft warn: no test run recorded
    const lastTestRaw = readState(stateDir, 'last-test-run');
    if (lastTestRaw === null) {
      return {
        type: 'warn',
        message: '🌈 Prism > No test run detected this session. Run tests before committing.'
      };
    }

    // Soft warn: test run is stale
    const lastTest = parseInt(lastTestRaw, 10);
    const now = Math.floor(Date.now() / 1000);
    const diff = now - lastTest;
    if (diff > (config.maxTestAge || 300)) {
      return {
        type: 'warn',
        message: `🌈 Prism > Last test run was ${Math.floor(diff / 60)}min ago. Run tests before committing.`
      };
    }

    return { type: 'pass' };
  }
};
