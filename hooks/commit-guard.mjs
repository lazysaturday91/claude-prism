/**
 * claude-prism — Commit Guard
 * Blocks commits when tests failed or haven't been run
 */

import { readState } from '../lib/state.mjs';
import { getMessage } from '../lib/messages.mjs';

export const commitGuard = {
  name: 'commit-guard',

  evaluate(ctx, config, stateDir) {
    const command = ctx.command || '';
    const lang = config.language || 'en';

    if (!command.includes('git commit')) return { type: 'pass' };
    if (command.includes('--allow-empty')) return { type: 'pass' };

    // Hard block: last test failed
    const testResult = readState(stateDir, 'last-test-result');
    if (testResult !== null && testResult.trim() === 'fail') {
      return {
        type: 'block',
        message: getMessage(lang, 'commit-guard.block.failed')
      };
    }

    // Soft warn: no test run recorded
    const lastTestRaw = readState(stateDir, 'last-test-run');
    if (lastTestRaw === null) {
      return {
        type: 'warn',
        message: getMessage(lang, 'commit-guard.warn.no-test')
      };
    }

    // Soft warn: test run is stale
    const lastTest = parseInt(lastTestRaw, 10);
    const now = Math.floor(Date.now() / 1000);
    const diff = now - lastTest;
    if (diff > (config.maxTestAge || 300)) {
      return {
        type: 'warn',
        message: getMessage(lang, 'commit-guard.warn.stale', { minutes: Math.floor(diff / 60) })
      };
    }

    return { type: 'pass' };
  }
};
