/**
 * claude-prism — Test Tracker
 * Detects test commands and records results for commit-guard
 */

import { writeState } from '../lib/state.mjs';
import { getMessage } from '../lib/messages.mjs';

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
  /\bbun\s+test\b/,
  /\bpnpm\s+test\b/,
  /\byarn\s+test\b/,
  /\bdeno\s+test\b/,
  /\bpnpm\s+exec\s+jest\b/,
  /\bbunx\s+vitest\b/,
  /\brspec\b/,
  /\bdotnet\s+test\b/,
  /\bmvn\s+test\b/,
  /\bgradle\s+test\b/,
];

const RESULT_DETECTORS = [
  {
    name: 'node-test-runner',
    detect: (output) => /# (?:pass|fail) \d+/.test(output),
    isFail: (output) => /# fail [1-9]/.test(output),
  },
  {
    name: 'jest',
    detect: (output) => /Tests:.*\d+/.test(output),
    isFail: (output) => /\d+ failed/.test(output),
  },
  {
    name: 'vitest',
    detect: (output) => /Tests\s+\d+ (?:passed|failed)/.test(output),
    isFail: (output) => /Tests\s+\d+ failed/.test(output),
  },
  {
    name: 'pytest',
    detect: (output) => /={3,}.*={3,}/.test(output) || /\d+ passed/.test(output),
    isFail: (output) => /\d+ failed/.test(output) || /\d+ error/.test(output),
  },
  {
    name: 'go',
    detect: (output) => /^(?:PASS|FAIL)$|--- (?:PASS|FAIL)/m.test(output),
    isFail: (output) => /^FAIL$/m.test(output) || /--- FAIL:/m.test(output),
  },
  {
    name: 'cargo',
    detect: (output) => /test result:/.test(output),
    isFail: (output) => /test result: FAILED/.test(output),
  },
  {
    name: 'mocha',
    detect: (output) => /\d+ passing/.test(output),
    isFail: (output) => /\d+ failing/.test(output),
  },
  {
    name: 'rspec',
    detect: (output) => /\d+ examples?/.test(output),
    isFail: (output) => /[1-9] failures?/.test(output),
  },
  {
    name: 'dotnet',
    detect: (output) => /Test Run (?:Successful|Failed)/.test(output),
    isFail: (output) => /Test Run Failed/.test(output),
  },
];

export const testTracker = {
  name: 'test-tracker',

  evaluate(ctx, config, stateDir) {
    const command = ctx.command || '';

    const isTestCommand = TEST_PATTERNS.some(p => p.test(command));
    if (!isTestCommand) return { type: 'pass' };

    const now = Math.floor(Date.now() / 1000);
    writeState(stateDir, 'last-test-run', String(now));

    let passed;
    if (ctx.interrupted) {
      passed = false;
    } else {
      const output = (ctx.stdout || '') + '\n' + (ctx.stderr || '');
      const matched = RESULT_DETECTORS.find(d => d.detect(output));
      if (matched) {
        passed = !matched.isFail(output);
      } else {
        passed = true;
      }
    }

    writeState(stateDir, 'last-test-result', passed ? 'pass' : 'fail');

    if (!passed) {
      return {
        type: 'warn',
        message: getMessage(config.language || 'en', 'test-tracker.warn.failed')
      };
    }

    return { type: 'pass' };
  }
};
