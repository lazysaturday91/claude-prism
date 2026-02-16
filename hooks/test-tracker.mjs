/**
 * claude-prism — Test Tracker
 * Detects test commands and records results for commit-guard
 */

import { writeState } from '../lib/state.mjs';

const TEST_PATTERNS = [
  /\bnpm\s+test\b/,
  /\bnode\s+--test\b/,
  /\bjest\b/,
  /\bvitest\b/,
  /\bpytest\b/,
  /\bmocha\b/,
  /\bcargo\s+test\b/,
  /\bgo\s+test\b/,
  /\bmake\s+test\b/,
  /\bnpx\s+(jest|vitest|mocha)\b/,
];

export const testTracker = {
  name: 'test-tracker',

  evaluate(ctx, config, stateDir) {
    const command = ctx.command || '';

    const isTestCommand = TEST_PATTERNS.some(p => p.test(command));
    if (!isTestCommand) return { type: 'pass' };

    // Record timestamp
    const now = Math.floor(Date.now() / 1000);
    writeState(stateDir, 'last-test-run', String(now));

    // Record result — Claude Code does not provide exitCode,
    // so we infer pass/fail from stdout and interrupted flag
    let passed;
    if (ctx.interrupted) {
      passed = false;
    } else {
      const stdout = ctx.stdout || '';
      const failMatch = stdout.match(/# fail (\d+)/);
      if (failMatch) {
        passed = parseInt(failMatch[1], 10) === 0;
      } else if (/(?:FAIL|FAILED|ERROR)\b/i.test(stdout) && !/# pass \d+/.test(stdout)) {
        passed = false;
      } else {
        passed = true;
      }
    }
    writeState(stateDir, 'last-test-result', passed ? 'pass' : 'fail');

    if (!passed) {
      return {
        type: 'warn',
        message: '[prism] Tests FAILED. Fix before committing.'
      };
    }

    return { type: 'pass' };
  }
};
