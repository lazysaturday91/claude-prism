/**
 * claude-prism — hook tests
 * Batch 2: commit-guard, debug-loop
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

// ─── debug-loop ───

describe('debug-loop', () => {
  let stateDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-hook-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('passes for non-source files', async () => {
    const { debugLoop } = await import('../hooks/debug-loop.mjs');
    const result = debugLoop.evaluate(
      { filePath: 'README.md' },
      { warnAt: 3, blockAt: 5 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('passes on first edit', async () => {
    const { debugLoop } = await import('../hooks/debug-loop.mjs');
    const result = debugLoop.evaluate(
      { filePath: 'src/app.ts', oldString: 'const x = 1' },
      { warnAt: 3, blockAt: 5 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('warns at warnAt threshold', async () => {
    const { debugLoop } = await import('../hooks/debug-loop.mjs');
    const config = { warnAt: 3, blockAt: 5 };
    const ctx = { filePath: 'src/app.ts', oldString: 'same code' };

    debugLoop.evaluate(ctx, config, stateDir); // 1
    debugLoop.evaluate(ctx, config, stateDir); // 2
    const result = debugLoop.evaluate(ctx, config, stateDir); // 3 = warnAt
    assert.equal(result.type, 'warn');
  });

  it('blocks at blockAt threshold', async () => {
    const { debugLoop } = await import('../hooks/debug-loop.mjs');
    const config = { warnAt: 3, blockAt: 5 };
    const ctx = { filePath: 'src/app.ts', oldString: 'same code' };

    debugLoop.evaluate(ctx, config, stateDir); // 1
    debugLoop.evaluate(ctx, config, stateDir); // 2
    debugLoop.evaluate(ctx, config, stateDir); // 3
    debugLoop.evaluate(ctx, config, stateDir); // 4
    const result = debugLoop.evaluate(ctx, config, stateDir); // 5 = blockAt
    assert.equal(result.type, 'block');
  });

  it('tracks files independently', async () => {
    const { debugLoop } = await import('../hooks/debug-loop.mjs');
    const config = { warnAt: 3, blockAt: 5 };

    debugLoop.evaluate({ filePath: 'src/a.ts', oldString: 'const foo = 1;' }, config, stateDir);
    debugLoop.evaluate({ filePath: 'src/a.ts', oldString: 'const foo = 1;' }, config, stateDir);
    debugLoop.evaluate({ filePath: 'src/b.ts', oldString: 'const bar = 2;' }, config, stateDir);

    // a.ts at 3rd edit (same snippet = divergent) should warn
    const resultA = debugLoop.evaluate({ filePath: 'src/a.ts', oldString: 'const foo = 1;' }, config, stateDir);
    assert.equal(resultA.type, 'warn');

    // b.ts at 2nd edit should pass
    const resultB = debugLoop.evaluate({ filePath: 'src/b.ts', oldString: 'const bar = 2;' }, config, stateDir);
    assert.equal(resultB.type, 'pass');
  });

  it('passes for files without extension match', async () => {
    const { debugLoop } = await import('../hooks/debug-loop.mjs');
    const result = debugLoop.evaluate(
      { filePath: 'Makefile' },
      { warnAt: 3, blockAt: 5 },
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

// ─── scope-guard ───

describe('scope-guard', () => {
  let stateDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-hook-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('passes on first file edit', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const result = scopeGuard.evaluate(
      { filePath: 'src/app.ts' },
      { warnAt: 4, blockAt: 7 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('passes for non-source files', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const result = scopeGuard.evaluate(
      { filePath: 'README.md' },
      { warnAt: 4, blockAt: 7 },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('warns when warnAt unique files reached', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const config = { warnAt: 4, blockAt: 7 };
    scopeGuard.evaluate({ filePath: 'src/a.ts' }, config, stateDir);
    scopeGuard.evaluate({ filePath: 'src/b.ts' }, config, stateDir);
    scopeGuard.evaluate({ filePath: 'src/c.ts' }, config, stateDir);
    const result = scopeGuard.evaluate({ filePath: 'src/d.ts' }, config, stateDir); // 4th unique
    assert.equal(result.type, 'warn');
    assert.ok(result.message.includes('4'));
  });

  it('blocks when blockAt unique files reached', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const config = { warnAt: 4, blockAt: 7 };
    for (let i = 0; i < 6; i++) {
      scopeGuard.evaluate({ filePath: `src/f${i}.ts` }, config, stateDir);
    }
    const result = scopeGuard.evaluate({ filePath: 'src/f6.ts' }, config, stateDir); // 7th
    assert.equal(result.type, 'block');
  });

  it('does not double-count same file', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const config = { warnAt: 4, blockAt: 7 };
    scopeGuard.evaluate({ filePath: 'src/a.ts' }, config, stateDir);
    scopeGuard.evaluate({ filePath: 'src/a.ts' }, config, stateDir); // same file
    scopeGuard.evaluate({ filePath: 'src/b.ts' }, config, stateDir);
    scopeGuard.evaluate({ filePath: 'src/c.ts' }, config, stateDir);
    // Only 3 unique files, should pass
    const result = scopeGuard.evaluate({ filePath: 'src/a.ts' }, config, stateDir);
    assert.equal(result.type, 'pass');
  });

  it('skips test files from count', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const config = { warnAt: 4, blockAt: 7 };
    scopeGuard.evaluate({ filePath: 'src/a.ts' }, config, stateDir);
    scopeGuard.evaluate({ filePath: 'src/b.ts' }, config, stateDir);
    scopeGuard.evaluate({ filePath: 'src/c.ts' }, config, stateDir);
    // Test files should not count toward scope
    const result = scopeGuard.evaluate({ filePath: 'tests/a.test.ts' }, config, stateDir);
    assert.equal(result.type, 'pass');
  });
});
