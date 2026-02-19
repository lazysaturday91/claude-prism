/**
 * claude-prism — hook tests
 * commit-guard + test-tracker
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeState, readState } from '../lib/state.mjs';

// ─── commit-guard ───

describe('commit-guard', () => {
  let stateDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-hook-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('passes for non-commit commands', async () => {
    const { commitGuard } = await import('../hooks/commit-guard.mjs');
    const result = commitGuard.evaluate(
      { command: 'npm test' },
      { maxTestAge: 300 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('blocks when last test failed', async () => {
    const { commitGuard } = await import('../hooks/commit-guard.mjs');
    writeState(stateDir, 'last-test-result', 'fail');
    const result = commitGuard.evaluate(
      { command: 'git commit -m "feat: add login"' },
      { maxTestAge: 300 },
      stateDir
    );
    assert.equal(result.type, 'block');
  });

  it('warns when no test run recorded', async () => {
    const { commitGuard } = await import('../hooks/commit-guard.mjs');
    const result = commitGuard.evaluate(
      { command: 'git commit -m "feat: add login"' },
      { maxTestAge: 300 },
      stateDir
    );
    assert.equal(result.type, 'warn');
  });

  it('warns when test run is stale (>maxTestAge)', async () => {
    const { commitGuard } = await import('../hooks/commit-guard.mjs');
    const staleTime = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    writeState(stateDir, 'last-test-run', String(staleTime));
    writeState(stateDir, 'last-test-result', 'pass');
    const result = commitGuard.evaluate(
      { command: 'git commit -m "feat: add login"' },
      { maxTestAge: 300 },
      stateDir
    );
    assert.equal(result.type, 'warn');
  });

  it('passes when tests recently passed', async () => {
    const { commitGuard } = await import('../hooks/commit-guard.mjs');
    const recentTime = Math.floor(Date.now() / 1000) - 60; // 1 min ago
    writeState(stateDir, 'last-test-run', String(recentTime));
    writeState(stateDir, 'last-test-result', 'pass');
    const result = commitGuard.evaluate(
      { command: 'git commit -m "feat: add login"' },
      { maxTestAge: 300 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('passes for --allow-empty commits', async () => {
    const { commitGuard } = await import('../hooks/commit-guard.mjs');
    const result = commitGuard.evaluate(
      { command: 'git commit --allow-empty -m "init"' },
      { maxTestAge: 300 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });
});

// ─── test-tracker ───

describe('test-tracker', () => {
  let stateDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-hook-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('detects npm test command and records timestamp', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    const result = testTracker.evaluate(
      { command: 'npm test', stdout: '# tests 5\n# pass 5\n# fail 0' },
      {},
      stateDir
    );
    assert.equal(result.type, 'pass');
    const ts = readState(stateDir, 'last-test-run');
    assert.ok(ts !== null);
    assert.ok(parseInt(ts, 10) > 0);
  });

  it('records pass result when stdout shows # fail 0', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    testTracker.evaluate(
      { command: 'npm test', stdout: '# tests 5\n# pass 5\n# fail 0' },
      {},
      stateDir
    );
    assert.equal(readState(stateDir, 'last-test-result'), 'pass');
  });

  it('records fail result when stdout shows # fail > 0', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    testTracker.evaluate(
      { command: 'npm test', stdout: '# tests 5\n# pass 3\n# fail 2' },
      {},
      stateDir
    );
    assert.equal(readState(stateDir, 'last-test-result'), 'fail');
  });

  it('records fail result when interrupted', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    testTracker.evaluate(
      { command: 'npm test', interrupted: true },
      {},
      stateDir
    );
    assert.equal(readState(stateDir, 'last-test-result'), 'fail');
  });

  it('defaults to pass when no failure indicators in stdout', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    testTracker.evaluate(
      { command: 'npm test', stdout: 'All tests passed' },
      {},
      stateDir
    );
    assert.equal(readState(stateDir, 'last-test-result'), 'pass');
  });

  it('detects various test runners', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    for (const cmd of ['jest', 'vitest run', 'pytest', 'node --test', 'npx mocha']) {
      testTracker.evaluate({ command: cmd, stdout: '# fail 0' }, {}, stateDir);
      assert.ok(readState(stateDir, 'last-test-run') !== null);
    }
  });

  it('ignores non-test commands', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    testTracker.evaluate(
      { command: 'echo hello', stdout: '' },
      {},
      stateDir
    );
    assert.equal(readState(stateDir, 'last-test-run'), null);
  });

  it('warns on test failure', async () => {
    const { testTracker } = await import('../hooks/test-tracker.mjs');
    const result = testTracker.evaluate(
      { command: 'npm test', stdout: '# tests 5\n# pass 3\n# fail 2' },
      {},
      stateDir
    );
    assert.equal(result.type, 'warn');
    assert.ok(result.message.includes('FAILED'));
  });
});

