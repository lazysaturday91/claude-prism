/**
 * claude-prism — hook tests
 * commit-guard + test-tracker + plan-enforcement + new v1.4 handlers
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
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

// ─── plan-enforcement ───

describe('plan-enforcement', () => {
  let stateDir;
  let projectDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-hook-'));
    projectDir = mkdtempSync(join(tmpdir(), 'prism-proj-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('passes for non-edit actions', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    const result = planEnforcement.evaluate(
      { action: 'command', command: 'npm test' },
      { warnAt: 6, sourceExtensions: ['ts'], testPatterns: ['test'] },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('passes for non-source files', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    const result = planEnforcement.evaluate(
      { action: 'edit', filePath: 'README.md' },
      { warnAt: 6, sourceExtensions: ['ts'], testPatterns: ['test'] },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('passes for test files', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    const result = planEnforcement.evaluate(
      { action: 'edit', filePath: 'src/app.test.ts' },
      { warnAt: 6, sourceExtensions: ['ts'], testPatterns: ['test'] },
      stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('passes when under threshold', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    const config = { warnAt: 6, sourceExtensions: ['ts'], testPatterns: ['test'] };

    for (let i = 0; i < 5; i++) {
      const result = planEnforcement.evaluate(
        { action: 'edit', filePath: `src/file${i}.ts` },
        config, stateDir
      );
      assert.equal(result.type, 'pass');
    }
  });

  it('warns when threshold reached without plan', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    const config = { warnAt: 3, sourceExtensions: ['ts'], testPatterns: ['test'], projectRoot: projectDir };

    planEnforcement.evaluate({ action: 'edit', filePath: 'src/a.ts' }, config, stateDir);
    planEnforcement.evaluate({ action: 'edit', filePath: 'src/b.ts' }, config, stateDir);
    const result = planEnforcement.evaluate(
      { action: 'edit', filePath: 'src/c.ts' }, config, stateDir
    );
    assert.equal(result.type, 'warn');
    assert.ok(result.message.includes('3'));
  });

  it('passes when plan file exists despite reaching threshold', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    // Create a plan file
    mkdirSync(join(projectDir, 'docs', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'plans', '2026-01-01-feature.md'), '# Plan');

    const config = { warnAt: 3, sourceExtensions: ['ts'], testPatterns: ['test'], projectRoot: projectDir };

    planEnforcement.evaluate({ action: 'edit', filePath: 'src/a.ts' }, config, stateDir);
    planEnforcement.evaluate({ action: 'edit', filePath: 'src/b.ts' }, config, stateDir);
    const result = planEnforcement.evaluate(
      { action: 'edit', filePath: 'src/c.ts' }, config, stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('does not double-count same file', async () => {
    const { planEnforcement } = await import('../hooks/plan-enforcement.mjs');
    const config = { warnAt: 3, sourceExtensions: ['ts'], testPatterns: ['test'] };

    planEnforcement.evaluate({ action: 'edit', filePath: 'src/a.ts' }, config, stateDir);
    planEnforcement.evaluate({ action: 'edit', filePath: 'src/a.ts' }, config, stateDir); // same
    planEnforcement.evaluate({ action: 'edit', filePath: 'src/b.ts' }, config, stateDir);
    // Only 2 unique files, should pass
    assert.equal(
      planEnforcement.evaluate({ action: 'edit', filePath: 'src/a.ts' }, config, stateDir).type,
      'pass'
    );
  });
});

// ─── precompact-handler ───

describe('precompact-handler', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-precompact-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('generates HANDOFF.md in docs/', async () => {
    const { precompactHandler } = await import('../hooks/precompact-handler.mjs');
    const input = { session_id: 'test-123', trigger: 'auto' };
    const config = { projectRoot: projectDir, webhooks: [] };
    const result = precompactHandler.evaluate(input, config);
    assert.ok(existsSync(join(projectDir, 'docs', 'HANDOFF.md')));
    assert.ok(result.hookSpecificOutput);
    assert.ok(result.hookSpecificOutput.additionalContext.includes('HANDOFF'));
  });

  it('includes plan progress when plan exists', async () => {
    const { precompactHandler } = await import('../hooks/precompact-handler.mjs');
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-01-01-test.md'),
      '## Batch 1\n- [x] Task A\n- [ ] Task B\n');
    const input = { session_id: 'test-123', trigger: 'manual' };
    const config = { projectRoot: projectDir, webhooks: [] };
    precompactHandler.evaluate(input, config);
    const content = readFileSync(join(projectDir, 'docs', 'HANDOFF.md'), 'utf8');
    assert.ok(content.includes('1/2'));
  });
});

// ─── session-end-handler ───

describe('session-end-handler', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-session-end-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('generates HANDOFF.md and PROJECT-MEMORY.md', async () => {
    const { sessionEndHandler } = await import('../hooks/session-end-handler.mjs');
    const input = { session_id: 'test-456', reason: 'clear' };
    const config = { projectRoot: projectDir, webhooks: [] };
    sessionEndHandler.evaluate(input, config);
    assert.ok(existsSync(join(projectDir, 'docs', 'HANDOFF.md')));
    assert.ok(existsSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md')));
  });

  it('appends session entry to PROJECT-MEMORY.md', async () => {
    const { sessionEndHandler } = await import('../hooks/session-end-handler.mjs');
    // Create initial PROJECT-MEMORY.md
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md'), '# Existing\n');

    const input = { session_id: 'test-789', reason: 'logout' };
    const config = { projectRoot: projectDir, webhooks: [] };
    sessionEndHandler.evaluate(input, config);

    const content = readFileSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md'), 'utf8');
    assert.ok(content.includes('# Existing'));
    assert.ok(content.includes('Session'));
    assert.ok(content.includes('logout'));
  });

  it('includes plan progress in memory entry', async () => {
    const { sessionEndHandler } = await import('../hooks/session-end-handler.mjs');
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-01-01-plan.md'),
      '- [x] Done\n- [ ] Todo\n');

    const input = { session_id: 'test-000', reason: 'other' };
    const config = { projectRoot: projectDir, webhooks: [] };
    sessionEndHandler.evaluate(input, config);

    const content = readFileSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md'), 'utf8');
    assert.ok(content.includes('1/2'));
  });
});

// ─── subagent-scope-injector ───

describe('subagent-scope-injector', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-scope-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns null when no plan exists', async () => {
    const { scopeInjector } = await import('../hooks/subagent-scope-injector.mjs');
    const input = { session_id: 'test', agent_id: 'a1', agent_type: 'executor' };
    const config = { projectRoot: projectDir };
    const result = scopeInjector.evaluate(input, config);
    assert.equal(result, null);
  });

  it('returns scope context when plan exists', async () => {
    const { scopeInjector } = await import('../hooks/subagent-scope-injector.mjs');
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-01-01-feature.md'),
      '## Batch 1: Setup\n- [x] Create `src/config.ts`\n- [ ] Create `src/handler.ts`\n');

    const input = { session_id: 'test', agent_id: 'a1', agent_type: 'executor' };
    const config = { projectRoot: projectDir };
    const result = scopeInjector.evaluate(input, config);
    assert.ok(result);
    assert.ok(result.hookSpecificOutput.additionalContext.includes('Plan:'));
    assert.ok(result.hookSpecificOutput.additionalContext.includes('1/2'));
  });
});

// ─── task-plan-sync ───

describe('task-plan-sync', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-plansync-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns null when no plan exists', async () => {
    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const emptyDir = mkdtempSync(join(tmpdir(), 'prism-empty-'));
    const input = { task_id: '1', task_subject: 'Test task' };
    const config = { projectRoot: emptyDir };
    const result = planSync.evaluate(input, config);
    rmSync(emptyDir, { recursive: true, force: true });
    assert.equal(result, null);
  });

  it('updates matching checkbox in plan file', async () => {
    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-test.md');
    writeFileSync(planPath, '## Batch 1\n- [ ] Create user authentication module\n- [ ] Add login tests\n');

    const input = { task_id: '1', task_subject: 'Create user authentication module' };
    const config = { projectRoot: projectDir, webhooks: [], matchThreshold: 0.3 };
    const result = planSync.evaluate(input, config);

    assert.ok(result);
    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('[x] Create user authentication module'));
    assert.ok(content.includes('[ ] Add login tests'));
  });

  it('returns progress info in additionalContext', async () => {
    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-test.md');
    writeFileSync(planPath, '## Batch 1\n- [x] Task A\n- [ ] Task B — create handler\n- [ ] Task C\n');

    const input = { task_id: '2', task_subject: 'Task B create handler' };
    const config = { projectRoot: projectDir, webhooks: [], matchThreshold: 0.3 };
    const result = planSync.evaluate(input, config);

    assert.ok(result);
    assert.ok(result.hookSpecificOutput.additionalContext.includes('2/3'));
  });

  it('returns null when no task_subject matches', async () => {
    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-test.md');
    writeFileSync(planPath, '## Batch 1\n- [ ] Implement database layer\n');

    const input = { task_id: '1', task_subject: 'completely unrelated topic xyz' };
    const config = { projectRoot: projectDir, webhooks: [], matchThreshold: 0.3 };
    const result = planSync.evaluate(input, config);
    assert.equal(result, null);
  });

  it('returns null when task_subject is empty', async () => {
    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-test.md');
    writeFileSync(planPath, '## Batch 1\n- [ ] Task\n');

    const input = { task_id: '1', task_subject: '' };
    const config = { projectRoot: projectDir, webhooks: [] };
    const result = planSync.evaluate(input, config);
    assert.equal(result, null);
  });
});
