/**
 * claude-prism — Plan Progress Tracker Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── parseScopedFiles ───

describe('parseScopedFiles', () => {
  let parseScopedFiles;

  beforeEach(async () => {
    ({ parseScopedFiles } = await import('../lib/plan-lifecycle.mjs'));
  });

  it('extracts file paths from Files in Scope section', () => {
    const content = `## Goal
Build feature

## Files in Scope
- \`hooks/plan-progress-tracker.mjs\` — CREATE new rule
- \`lib/plan-lifecycle.mjs\` — add helpers
- \`templates/runners/post-tool.mjs\` — add rule import

## Batch 1
- [ ] Task 1
`;
    const files = parseScopedFiles(content);
    assert.deepEqual(files, [
      'hooks/plan-progress-tracker.mjs',
      'lib/plan-lifecycle.mjs',
      'templates/runners/post-tool.mjs',
    ]);
  });

  it('returns empty array when no Files in Scope section', () => {
    const content = '## Goal\nBuild feature\n## Batch 1\n- [ ] Task 1\n';
    const files = parseScopedFiles(content);
    assert.deepEqual(files, []);
  });

  it('ignores lines without backtick-wrapped paths', () => {
    const content = `## Files in Scope
- \`src/app.ts\` — modify
- plain text without backticks
- another line

## Batch 1
`;
    const files = parseScopedFiles(content);
    assert.deepEqual(files, ['src/app.ts']);
  });

  it('handles table-format Files in Scope', () => {
    const content = `## Files in Scope

| File | Change | Tag |
|------|--------|-----|
| \`hooks/tracker.mjs\` | CREATE | [L] |
| \`lib/helpers.mjs\` | modify | [S] |

## Batch 1
`;
    const files = parseScopedFiles(content);
    assert.deepEqual(files, ['hooks/tracker.mjs', 'lib/helpers.mjs']);
  });

  it('stops at next section heading', () => {
    const content = `## Files in Scope
- \`src/a.ts\` — change

## Batch 1: Core
- \`src/b.ts\` should not be picked up as scoped file
`;
    const files = parseScopedFiles(content);
    assert.deepEqual(files, ['src/a.ts']);
  });
});

// ─── ensureFrontmatter ───

describe('ensureFrontmatter', () => {
  let projectDir;
  let ensureFrontmatter;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-efm-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ ensureFrontmatter } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('adds frontmatter to plan without one', () => {
    const planPath = join(projectDir, '.prism', 'plans', '2026-03-06-feature.md');
    const body = '## Goal\nBuild feature\n- [ ] Task 1\n- [ ] Task 2\n';
    writeFileSync(planPath, body);

    ensureFrontmatter(planPath, body);

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.startsWith('---\n'));
    assert.ok(content.includes('status: draft'), '0/N tasks → draft');
    assert.ok(content.includes('created: 2026-03-06'), 'date from filename');
    assert.ok(content.includes('## Goal'), 'body preserved');
  });

  it('does not modify plan that already has frontmatter', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'existing.md');
    const original = '---\nstatus: active\ncreated: 2026-03-01\n---\n\n## Goal\nTest\n';
    writeFileSync(planPath, original);

    ensureFrontmatter(planPath, original);

    const content = readFileSync(planPath, 'utf8');
    assert.equal(content, original);
  });

  it('derives draft when 0 tasks done', () => {
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-test.md');
    const body = '## Batch 1\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n';
    writeFileSync(planPath, body);

    ensureFrontmatter(planPath, body);

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: draft'));
  });

  it('derives active when some tasks done', () => {
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-partial.md');
    const body = '## Batch 1\n- [x] Task 1\n- [ ] Task 2\n';
    writeFileSync(planPath, body);

    ensureFrontmatter(planPath, body);

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: active'));
  });

  it('derives completed when all tasks done', () => {
    const planPath = join(projectDir, '.prism', 'plans', '2026-01-01-done.md');
    const body = '## Batch 1\n- [x] Task 1\n- [x] Task 2\n';
    writeFileSync(planPath, body);

    ensureFrontmatter(planPath, body);

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: completed'));
  });

  it('uses current date when filename has no date pattern', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'no-date-plan.md');
    const body = '## Goal\nTest\n- [ ] Task 1\n';
    writeFileSync(planPath, body);

    ensureFrontmatter(planPath, body);

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('created:'));
    // Should have a valid date format
    assert.ok(/created: \d{4}-\d{2}-\d{2}/.test(content));
  });
});

// ─── plan-progress-tracker.evaluate ───

describe('plan-progress-tracker evaluate', () => {
  let projectDir;
  let stateDir;
  let planProgressTracker;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-ppt-'));
    stateDir = mkdtempSync(join(tmpdir(), 'prism-ppt-state-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ planProgressTracker } = await import('../hooks/plan-progress-tracker.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(stateDir, { recursive: true, force: true });
  });

  function writePlan(name, content) {
    writeFileSync(join(projectDir, '.prism', 'plans', name), content);
  }

  const PLAN_WITH_SCOPE = `---
status: active
created: 2026-03-06
---

## Goal
Test plan

## Files in Scope
- \`src/app.ts\` — modify
- \`src/utils.ts\` — modify
- \`tests/app.test.ts\` — create

## Batch 1
- [ ] Task 1
`;

  it('returns info with progress when editing file in scope', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'info');
    assert.ok(result.message.includes('1/3'));
    assert.ok(result.message.includes('33%'));
  });

  it('returns pass when editing file NOT in scope', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/other.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'pass');
  });

  it('returns pass for non-Edit/Write actions', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    const result = planProgressTracker.evaluate(
      { action: 'command', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'pass');
  });

  it('handles write action same as edit', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    const result = planProgressTracker.evaluate(
      { action: 'write', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'info');
    assert.ok(result.message.includes('1/3'));
  });

  it('returns pass when no active plan exists', () => {
    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'pass');
  });

  it('returns pass when filePath is undefined', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    const result = planProgressTracker.evaluate(
      { action: 'edit' },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'pass');
  });

  it('accumulates touched files across multiple edits', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    // First edit
    planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    // Second edit (different file)
    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/utils.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'info');
    assert.ok(result.message.includes('2/3'));
    assert.ok(result.message.includes('66%'));
  });

  it('does not double-count same file edited multiple times', () => {
    writePlan('2026-03-06-test.md', PLAN_WITH_SCOPE);

    // Edit same file twice
    planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );
    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.ok(result.message.includes('1/3'), 'still 1 file touched');
  });

  it('transitions draft → active on first scoped file edit', () => {
    const draftPlan = `---
status: draft
created: 2026-03-06
---

## Goal
Draft plan

## Files in Scope
- \`src/app.ts\` — modify

## Batch 1
- [ ] Task 1
`;
    writePlan('2026-03-06-draft.md', draftPlan);

    planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    // Plan should now be active
    const content = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-draft.md'), 'utf8');
    assert.ok(content.includes('status: active'));

    // History should record the transition
    const historyPath = join(projectDir, '.prism', 'plans', '.history.jsonl');
    assert.ok(existsSync(historyPath));
    const history = readFileSync(historyPath, 'utf8');
    assert.ok(history.includes('status_change'));
    assert.ok(history.includes('"from":"draft"'));
    assert.ok(history.includes('"to":"active"'));
  });

  it('records progress milestones in history', () => {
    // Plan with 4 files so 25% = 1 file
    const plan = `---
status: active
created: 2026-03-06
---

## Files in Scope
- \`src/a.ts\` — modify
- \`src/b.ts\` — modify
- \`src/c.ts\` — modify
- \`src/d.ts\` — modify

## Batch 1
- [ ] Task 1
`;
    writePlan('2026-03-06-milestone.md', plan);

    // Touch 1/4 files = 25%
    planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/a.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    const historyPath = join(projectDir, '.prism', 'plans', '.history.jsonl');
    assert.ok(existsSync(historyPath));
    const history = readFileSync(historyPath, 'utf8');
    assert.ok(history.includes('"event":"progress"'));
    assert.ok(history.includes('25%'));
  });

  it('does not duplicate milestone recordings', () => {
    const plan = `---
status: active
created: 2026-03-06
---

## Files in Scope
- \`src/a.ts\` — modify
- \`src/b.ts\` — modify
- \`src/c.ts\` — modify
- \`src/d.ts\` — modify

## Batch 1
- [ ] Task 1
`;
    writePlan('2026-03-06-nodup.md', plan);

    // Touch 1/4 = 25%
    planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/a.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    // Touch same file again — should not re-record 25% milestone
    planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/a.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    const history = readFileSync(join(projectDir, '.prism', 'plans', '.history.jsonl'), 'utf8');
    const progressEvents = history.trim().split('\n').filter(l => l.includes('"event":"progress"'));
    assert.equal(progressEvents.length, 1, 'milestone should be recorded only once');
  });

  it('returns pass when plan has no Files in Scope section', () => {
    const noScope = `---
status: active
---

## Goal
No scope section

## Batch 1
- [ ] Task 1
`;
    writePlan('2026-03-06-noscope.md', noScope);

    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'pass');
  });

  it('skips completed plans (only tracks active/draft)', () => {
    const completedPlan = `---
status: completed
---

## Files in Scope
- \`src/app.ts\` — done

## Batch 1
- [x] Task 1
`;
    writePlan('2026-03-06-completed.md', completedPlan);

    const result = planProgressTracker.evaluate(
      { action: 'edit', filePath: join(projectDir, 'src/app.ts') },
      { projectRoot: projectDir },
      stateDir
    );

    assert.equal(result.type, 'pass');
  });
});

// ─── Regression guards ───

describe('regression guards', () => {
  it('post-tool.mjs imports plan-progress-tracker', async () => {
    const content = readFileSync(
      join(import.meta.dirname, '..', 'templates', 'runners', 'post-tool.mjs'),
      'utf8'
    );
    assert.ok(content.includes('plan-progress-tracker'));
    assert.ok(content.includes('planProgressTracker'));
  });

  it('settings.json has PostToolUse Edit|Write matcher', () => {
    const settings = JSON.parse(readFileSync(
      join(import.meta.dirname, '..', 'templates', 'settings.json'),
      'utf8'
    ));
    const postToolUse = settings.hooks.PostToolUse;
    assert.ok(Array.isArray(postToolUse));
    const editWriteMatcher = postToolUse.find(h => h.matcher === 'Edit|Write');
    assert.ok(editWriteMatcher, 'PostToolUse should have Edit|Write matcher');
    assert.ok(editWriteMatcher.hooks[0].command.includes('post-tool.mjs'));
  });

  it('installer copies plan-progress-tracker rule', () => {
    const content = readFileSync(
      join(import.meta.dirname, '..', 'lib', 'installer.mjs'),
      'utf8'
    );
    assert.ok(content.includes("'plan-progress-tracker.mjs'"));
  });
});
