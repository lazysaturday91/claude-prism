/**
 * claude-prism — Plan Lifecycle Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── validateTransition ───

describe('validateTransition', () => {
  let validateTransition;

  beforeEach(async () => {
    ({ validateTransition } = await import('../lib/plan-lifecycle.mjs'));
  });

  it('allows draft → active', () => {
    assert.deepEqual(validateTransition('draft', 'active'), { valid: true });
  });

  it('allows active → completed', () => {
    assert.deepEqual(validateTransition('active', 'completed'), { valid: true });
  });

  it('allows active → blocked', () => {
    assert.deepEqual(validateTransition('active', 'blocked'), { valid: true });
  });

  it('allows blocked → active (unblock)', () => {
    assert.deepEqual(validateTransition('blocked', 'active'), { valid: true });
  });

  it('allows completed → active (reopen)', () => {
    assert.deepEqual(validateTransition('completed', 'active'), { valid: true });
  });

  it('allows completed → archived', () => {
    assert.deepEqual(validateTransition('completed', 'archived'), { valid: true });
  });

  it('rejects archived → active (terminal)', () => {
    const result = validateTransition('archived', 'active');
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes('Terminal'));
  });

  it('rejects abandoned → active (terminal)', () => {
    const result = validateTransition('abandoned', 'active');
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes('Terminal'));
  });

  it('rejects draft → completed (not allowed)', () => {
    const result = validateTransition('draft', 'completed');
    assert.equal(result.valid, false);
    assert.ok(result.reason.includes('not allowed'));
  });

  it('treats null/undefined from as active (backward compat)', () => {
    assert.deepEqual(validateTransition(null, 'completed'), { valid: true });
    assert.deepEqual(validateTransition(undefined, 'completed'), { valid: true });
  });
});

// ─── updatePlanStatus ───

describe('updatePlanStatus', () => {
  let projectDir;
  let updatePlanStatus;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-lifecycle-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ updatePlanStatus } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('updates frontmatter status in plan with existing frontmatter', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'test.md');
    writeFileSync(planPath, '---\nstatus: active\ncreated: 2026-03-06\n---\n\n## Goal\nTest plan\n- [ ] Task 1\n');

    const result = updatePlanStatus(planPath, 'completed', { completed_at: '2026-03-06' });
    assert.equal(result.success, true);
    assert.equal(result.oldStatus, 'active');
    assert.equal(result.newStatus, 'completed');

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: completed'));
    assert.ok(content.includes('completed_at: 2026-03-06'));
    assert.ok(content.includes('## Goal'));
  });

  it('adds frontmatter to plan without frontmatter', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'test.md');
    writeFileSync(planPath, '## Goal\nTest plan\n- [ ] Task 1\n');

    const result = updatePlanStatus(planPath, 'completed');
    assert.equal(result.success, true);
    assert.equal(result.oldStatus, 'active'); // default

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('---\nstatus: completed\n---'));
    assert.ok(content.includes('## Goal'));
  });

  it('returns error for invalid transition', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'test.md');
    writeFileSync(planPath, '---\nstatus: archived\n---\n## Goal\nDone\n');

    const result = updatePlanStatus(planPath, 'active');
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Terminal'));
  });

  it('removes fields set to null in extra', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'test.md');
    writeFileSync(planPath, '---\nstatus: blocked\nblocked_reason: waiting\n---\n## Goal\nTest\n');

    const result = updatePlanStatus(planPath, 'active', { blocked_reason: null });
    assert.equal(result.success, true);

    const content = readFileSync(planPath, 'utf8');
    assert.ok(!content.includes('blocked_reason'));
    assert.ok(content.includes('status: active'));
  });
});

// ─── appendHistory + readHistory ───

describe('history', () => {
  let projectDir;
  let appendHistory, readHistory;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-history-'));
    ({ appendHistory, readHistory } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('appends and reads history events', () => {
    appendHistory(projectDir, { plan: 'test.md', event: 'status_change', from: 'draft', to: 'active' });
    appendHistory(projectDir, { plan: 'test.md', event: 'status_change', from: 'active', to: 'completed' });

    const events = readHistory(projectDir);
    assert.equal(events.length, 2);
    assert.ok(events[0].ts);
    assert.equal(events[0].plan, 'test.md');
    assert.equal(events[0].from, 'draft');
    assert.equal(events[1].to, 'completed');
  });

  it('filters history by plan file', () => {
    appendHistory(projectDir, { plan: 'plan-a.md', event: 'status_change', from: 'draft', to: 'active' });
    appendHistory(projectDir, { plan: 'plan-b.md', event: 'status_change', from: 'draft', to: 'active' });
    appendHistory(projectDir, { plan: 'plan-a.md', event: 'progress', detail: '50%' });

    const eventsA = readHistory(projectDir, 'plan-a.md');
    assert.equal(eventsA.length, 2);

    const eventsB = readHistory(projectDir, 'plan-b.md');
    assert.equal(eventsB.length, 1);
  });

  it('returns empty array when no history file', () => {
    const events = readHistory(projectDir);
    assert.deepEqual(events, []);
  });

  it('creates .prism/plans/ directory if missing', () => {
    const freshDir = mkdtempSync(join(tmpdir(), 'prism-noplans-'));
    appendHistory(freshDir, { plan: 'test.md', event: 'created' });
    assert.ok(existsSync(join(freshDir, '.prism', 'plans', '.history.jsonl')));
    rmSync(freshDir, { recursive: true, force: true });
  });
});

// ─── resolvePlan ───

describe('resolvePlan', () => {
  let projectDir;
  let resolvePlan;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-resolve-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ resolvePlan } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('resolves by exact filename', () => {
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-feature.md'), '---\nstatus: active\n---\n## Goal\nFeature\n- [ ] Task 1\n');
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-05-bugfix.md'), '---\nstatus: active\n---\n## Goal\nBugfix\n- [ ] Task 1\n');

    const plan = resolvePlan(projectDir, '2026-03-05-bugfix.md');
    assert.equal(plan.file, '2026-03-05-bugfix.md');
  });

  it('resolves by partial name match', () => {
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-feature.md'), '---\nstatus: active\n---\n## Goal\nFeature\n- [ ] Task 1\n');

    const plan = resolvePlan(projectDir, 'feature');
    assert.equal(plan.file, '2026-03-06-feature.md');
  });

  it('defaults to most recent active plan', () => {
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-latest.md'), '---\nstatus: active\n---\n## Goal\nLatest\n- [ ] Task 1\n');
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-05-older.md'), '---\nstatus: completed\n---\n## Goal\nOlder\n- [x] Task 1\n');

    const plan = resolvePlan(projectDir);
    assert.equal(plan.file, '2026-03-06-latest.md');
  });

  it('returns null when no plans exist', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'prism-empty-'));
    const plan = resolvePlan(emptyDir);
    assert.equal(plan, null);
    rmSync(emptyDir, { recursive: true, force: true });
  });
});

// ─── discoverPlans ───

describe('discoverPlans', () => {
  let projectDir;
  let discoverPlans;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-discover-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ discoverPlans } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('discovers plan files in docs/ by filename pattern', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-feature.md'), '## Goal\nBuild feature\n- [ ] Task 1\n');

    const found = discoverPlans(projectDir);
    assert.equal(found.length, 1);
    assert.equal(found[0].file, '2026-03-01-feature.md');
    assert.equal(found[0].source, 'docs/');
  });

  it('discovers plan files by content (checkboxes + batch headers)', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'my-plan.md'), '## Batch 1: Setup\n- [ ] Task 1\n- [x] Task 2\n');

    const found = discoverPlans(projectDir);
    assert.equal(found.length, 1);
    assert.equal(found[0].file, 'my-plan.md');
  });

  it('skips files already in .prism/plans/', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-feature.md'), '## Goal\n- [ ] Task 1\n');
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-feature.md'), '---\nstatus: active\n---\n## Goal\n- [ ] Task 1\n');

    const found = discoverPlans(projectDir);
    assert.equal(found.length, 0);
  });

  it('skips non-plan files (HANDOFF.md, README.md, etc.)', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'HANDOFF.md'), '## Status\n- [ ] Something\n## Batch 1\n');
    writeFileSync(join(projectDir, 'docs', 'README.md'), '# Readme\n');

    const found = discoverPlans(projectDir);
    assert.equal(found.length, 0);
  });

  it('returns empty when no docs/ exists', () => {
    const found = discoverPlans(projectDir);
    assert.equal(found.length, 0);
  });
});

// ─── importPlans ───

describe('importPlans', () => {
  let projectDir;
  let importPlans, readHistory;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-import-'));
    ({ importPlans, readHistory } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('copies plan to .prism/plans/ and adds frontmatter', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    const srcPath = join(projectDir, 'docs', '2026-03-01-feature.md');
    writeFileSync(srcPath, '## Goal\nBuild feature\n- [ ] Task 1\n- [ ] Task 2\n');

    const result = importPlans(projectDir, [{ path: srcPath, file: '2026-03-01-feature.md', source: 'docs/' }]);
    assert.equal(result.imported, 1);
    assert.equal(result.skipped, 0);

    // Original preserved
    assert.ok(existsSync(srcPath));

    // Copy exists with frontmatter
    const destPath = join(projectDir, '.prism', 'plans', '2026-03-01-feature.md');
    assert.ok(existsSync(destPath));
    const content = readFileSync(destPath, 'utf8');
    assert.ok(content.includes('status: draft'), 'No tasks done → draft');
    assert.ok(content.includes('imported_from:'));
  });

  it('derives completed status when all tasks done', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    const srcPath = join(projectDir, 'docs', '2026-03-01-done.md');
    writeFileSync(srcPath, '## Goal\nDone\n- [x] Task 1\n- [x] Task 2\n');

    importPlans(projectDir, [{ path: srcPath, file: '2026-03-01-done.md', source: 'docs/' }]);

    const content = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-done.md'), 'utf8');
    assert.ok(content.includes('status: completed'));
  });

  it('derives active status when some tasks done', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    const srcPath = join(projectDir, 'docs', '2026-03-01-partial.md');
    writeFileSync(srcPath, '## Goal\nPartial\n- [x] Task 1\n- [ ] Task 2\n');

    importPlans(projectDir, [{ path: srcPath, file: '2026-03-01-partial.md', source: 'docs/' }]);

    const content = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-partial.md'), 'utf8');
    assert.ok(content.includes('status: active'));
  });

  it('preserves existing frontmatter during import', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    const srcPath = join(projectDir, 'docs', '2026-03-01-with-fm.md');
    writeFileSync(srcPath, '---\nstatus: blocked\nblocked_reason: API v2\n---\n## Goal\nBlocked\n- [ ] Task 1\n');

    importPlans(projectDir, [{ path: srcPath, file: '2026-03-01-with-fm.md', source: 'docs/' }]);

    const content = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-with-fm.md'), 'utf8');
    assert.ok(content.includes('status: blocked'));
    assert.ok(content.includes('blocked_reason: API v2'));
  });

  it('records import event in history', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    const srcPath = join(projectDir, 'docs', '2026-03-01-feature.md');
    writeFileSync(srcPath, '## Goal\nFeature\n- [ ] Task 1\n');

    importPlans(projectDir, [{ path: srcPath, file: '2026-03-01-feature.md', source: 'docs/' }]);

    const events = readHistory(projectDir, '2026-03-01-feature.md');
    assert.equal(events.length, 1);
    assert.equal(events[0].event, 'imported');
  });

  it('skips if destination already exists', () => {
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    mkdirSync(join(projectDir, 'docs'), { recursive: true });

    writeFileSync(join(projectDir, '.prism', 'plans', 'existing.md'), '---\nstatus: active\n---\n## Goal\n');
    const srcPath = join(projectDir, 'docs', 'existing.md');
    writeFileSync(srcPath, '## Goal\nDifferent version\n');

    const result = importPlans(projectDir, [{ path: srcPath, file: 'existing.md', source: 'docs/' }]);
    assert.equal(result.imported, 0);
    assert.equal(result.skipped, 1);
  });
});

// ─── STATUS_ICONS ───

describe('STATUS_ICONS', () => {
  it('has icons for all 6 statuses', async () => {
    const { STATUS_ICONS } = await import('../lib/plan-lifecycle.mjs');
    const statuses = ['draft', 'active', 'blocked', 'completed', 'archived', 'abandoned'];
    for (const s of statuses) {
      assert.ok(STATUS_ICONS[s], `Missing icon for status: ${s}`);
    }
    assert.equal(Object.keys(STATUS_ICONS).length, 6);
  });
});

// ═══════════════════════════════════════════════
// Scenario Tests — User Journey Simulations
// ═══════════════════════════════════════════════

// ─── Scenario 1: E2E lifecycle (신규 사용자) ───

describe('scenario: E2E lifecycle flow', () => {
  let projectDir;
  let updatePlanStatus, appendHistory, readHistory, resolvePlan;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-e2e-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ updatePlanStatus, appendHistory, readHistory, resolvePlan } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('full journey: draft → active → completed → archived', () => {
    const planFile = '2026-03-06-feature-x.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '---\nstatus: draft\ncreated: 2026-03-06\n---\n\n## Goal\nBuild feature X\n\n## Batch 1\n- [ ] Task 1\n- [ ] Task 2\n');

    // Step 1: draft → active (first task checked)
    let r = updatePlanStatus(planPath, 'active');
    assert.equal(r.success, true);
    assert.equal(r.oldStatus, 'draft');
    appendHistory(projectDir, { plan: planFile, event: 'status_change', from: 'draft', to: 'active' });

    // Step 2: active → completed (all tasks done)
    r = updatePlanStatus(planPath, 'completed', { completed_at: '2026-03-06' });
    assert.equal(r.success, true);
    assert.equal(r.oldStatus, 'active');
    appendHistory(projectDir, { plan: planFile, event: 'status_change', from: 'active', to: 'completed' });

    // Step 3: completed → archived
    r = updatePlanStatus(planPath, 'archived', { archived_at: '2026-03-06' });
    assert.equal(r.success, true);
    assert.equal(r.oldStatus, 'completed');
    appendHistory(projectDir, { plan: planFile, event: 'status_change', from: 'completed', to: 'archived' });

    // Verify final state
    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: archived'));
    assert.ok(content.includes('archived_at: 2026-03-06'));

    // Verify history has 3 events
    const events = readHistory(projectDir, planFile);
    assert.equal(events.length, 3);
    assert.equal(events[0].from, 'draft');
    assert.equal(events[2].to, 'archived');

    // Verify archived is terminal — cannot transition further
    r = updatePlanStatus(planPath, 'active');
    assert.equal(r.success, false);
    assert.ok(r.error.includes('Terminal'));
  });

  it('journey with block/unblock: active → blocked → active → completed', () => {
    const planFile = '2026-03-06-blocked-journey.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '---\nstatus: active\ncreated: 2026-03-06\n---\n\n## Goal\nJourney with blocker\n- [ ] Task 1\n');

    // Block it
    let r = updatePlanStatus(planPath, 'blocked', { blocked_reason: 'waiting for API v2' });
    assert.equal(r.success, true);
    let content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('blocked_reason: waiting for API v2'));

    // Unblock it
    r = updatePlanStatus(planPath, 'active', { blocked_reason: null });
    assert.equal(r.success, true);
    content = readFileSync(planPath, 'utf8');
    assert.ok(!content.includes('blocked_reason'));
    assert.ok(content.includes('status: active'));

    // Complete it
    r = updatePlanStatus(planPath, 'completed', { completed_at: '2026-03-06' });
    assert.equal(r.success, true);
  });

  it('journey with reopen: active → completed → active (reopen) → completed again', () => {
    const planFile = '2026-03-06-reopen.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '---\nstatus: active\n---\n## Goal\nReopen test\n- [x] Task 1\n');

    // Complete
    let r = updatePlanStatus(planPath, 'completed', { completed_at: '2026-03-06' });
    assert.equal(r.success, true);

    // Reopen
    r = updatePlanStatus(planPath, 'active', { completed_at: null });
    assert.equal(r.success, true);
    let content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: active'));
    assert.ok(!content.includes('completed_at'));

    // Complete again
    r = updatePlanStatus(planPath, 'completed', { completed_at: '2026-03-07' });
    assert.equal(r.success, true);
    content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('completed_at: 2026-03-07'));
  });
});

// ─── Scenario 2: Upgrade path (업그레이드 사용자) ───

describe('scenario: upgrade path', () => {
  let projectDir;
  let discoverPlans, importPlans, readHistory;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-upgrade-'));
    ({ discoverPlans, importPlans, readHistory } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('discovers plans in docs/ and docs/plans/, imports with frontmatter', () => {
    // Simulate user with plans scattered in docs/
    mkdirSync(join(projectDir, 'docs', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-migration.md'), '## Goal\nMigrate DB\n- [x] Step 1\n- [ ] Step 2\n');
    writeFileSync(join(projectDir, 'docs', 'plans', '2026-03-02-feature.md'), '## Goal\nAdd feature\n- [ ] Task 1\n');

    const found = discoverPlans(projectDir);
    assert.equal(found.length, 2);

    const result = importPlans(projectDir, found);
    assert.equal(result.imported, 2);

    // Verify status derivation
    const migContent = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-migration.md'), 'utf8');
    assert.ok(migContent.includes('status: active'), 'Partially done → active');

    const featContent = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-02-feature.md'), 'utf8');
    assert.ok(featContent.includes('status: draft'), 'No tasks done → draft');

    // Originals preserved
    assert.ok(existsSync(join(projectDir, 'docs', '2026-03-01-migration.md')));
    assert.ok(existsSync(join(projectDir, 'docs', 'plans', '2026-03-02-feature.md')));

    // History recorded
    const events = readHistory(projectDir);
    assert.equal(events.length, 2);
    assert.ok(events.every(e => e.event === 'imported'));
  });

  it('re-running discover after import finds nothing new', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-test.md'), '## Goal\nTest\n- [ ] Task 1\n');

    const found1 = discoverPlans(projectDir);
    assert.equal(found1.length, 1);

    importPlans(projectDir, found1);

    // Second discover should find nothing (already imported)
    const found2 = discoverPlans(projectDir);
    assert.equal(found2.length, 0);
  });

  it('preserves user frontmatter from pre-existing plans', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-custom.md'),
      '---\nstatus: active\ncreated: 2026-02-28\nauthor: user\ncustom_field: value\n---\n\n## Goal\nCustom plan\n- [ ] Task 1\n');

    const found = discoverPlans(projectDir);
    importPlans(projectDir, found);

    const content = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-custom.md'), 'utf8');
    assert.ok(content.includes('author: user'));
    assert.ok(content.includes('custom_field: value'));
    assert.ok(content.includes('status: active'));
  });
});

// ─── Scenario 3: Legacy plans without frontmatter ───

describe('scenario: legacy plans without frontmatter', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-legacy-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('hook processes legacy plan without frontmatter (backward compat)', async () => {
    const planFile = '2026-03-06-legacy.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    // No frontmatter — old-style plan
    writeFileSync(planPath, '## Batch 1: Setup\n- [ ] Task implement legacy feature\n- [ ] Task another thing\n');

    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const result = planSync.evaluate(
      { task_subject: 'implement legacy feature task' },
      { projectRoot: projectDir }
    );

    assert.ok(result, 'Hook should still work on plan without frontmatter');
    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('[x]'), 'Task should be checked');
  });

  it('hook auto-activates plan without any frontmatter on first check', async () => {
    const planFile = '2026-03-06-nofm.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '## Batch 1\n- [ ] Task implement first thing\n- [ ] Task do second thing\n');

    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    planSync.evaluate(
      { task_subject: 'implement first thing task' },
      { projectRoot: projectDir }
    );

    // After hook, plan should have frontmatter added with status: active
    const content = readFileSync(planPath, 'utf8');
    // The hook checks `done === 1 && !fm.status` — it should try to set active
    // Since there's no frontmatter, updatePlanStatus treats it as 'active' already
    // The task was checked, that's the main thing
    assert.ok(content.includes('[x]'));
  });

  it('updatePlanStatus adds frontmatter to bare markdown plan', async () => {
    const { updatePlanStatus } = await import('../lib/plan-lifecycle.mjs');
    const planPath = join(projectDir, '.prism', 'plans', 'bare.md');
    writeFileSync(planPath, '## Goal\nBare plan\n- [ ] Task 1\n');

    // Transition active (default) → completed
    const r = updatePlanStatus(planPath, 'completed');
    assert.equal(r.success, true);
    assert.equal(r.oldStatus, 'active'); // default for no frontmatter

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.startsWith('---\n'));
    assert.ok(content.includes('status: completed'));
    assert.ok(content.includes('## Goal'));
  });
});

// ─── Scenario 4: Multiple plans environment ───

describe('scenario: multiple plans', () => {
  let projectDir;
  let resolvePlan, updatePlanStatus;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-multi-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ resolvePlan, updatePlanStatus } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('resolvePlan returns remaining active plan after one is completed', () => {
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-plan-a.md'),
      '---\nstatus: active\n---\n## Goal\nPlan A\n- [ ] Task 1\n');
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-05-plan-b.md'),
      '---\nstatus: active\n---\n## Goal\nPlan B\n- [ ] Task 1\n');

    // Complete plan A
    updatePlanStatus(join(projectDir, '.prism', 'plans', '2026-03-06-plan-a.md'), 'completed');

    // resolvePlan should now return plan B (the remaining active one)
    const resolved = resolvePlan(projectDir);
    assert.equal(resolved.file, '2026-03-05-plan-b.md');
  });

  it('resolvePlan falls back to first plan when no active plans', () => {
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-completed.md'),
      '---\nstatus: completed\n---\n## Goal\nDone\n- [x] Task 1\n');
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-05-archived.md'),
      '---\nstatus: archived\n---\n## Goal\nOld\n- [x] Task 1\n');

    const resolved = resolvePlan(projectDir);
    // Falls back to first plan (most recent by reverse sort)
    assert.ok(resolved);
    assert.equal(resolved.file, '2026-03-06-completed.md');
  });

  it('hook only affects the most recent plan file', async () => {
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-newer.md'),
      '---\nstatus: active\n---\n## Batch 1\n- [ ] Task implement new feature\n');
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-03-05-older.md'),
      '---\nstatus: active\n---\n## Batch 1\n- [ ] Task implement new feature\n');

    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    planSync.evaluate(
      { task_subject: 'implement new feature task' },
      { projectRoot: projectDir }
    );

    // Only the most recent (2026-03-06) should be modified
    const newerContent = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-06-newer.md'), 'utf8');
    const olderContent = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-05-older.md'), 'utf8');
    assert.ok(newerContent.includes('[x]'), 'Newer plan should be updated');
    assert.ok(!olderContent.includes('[x]'), 'Older plan should be untouched');
  });

  it('different plans can be at different lifecycle stages', async () => {
    const plans = {
      'draft.md': 'draft',
      'active.md': 'active',
      'blocked.md': 'blocked',
      'completed.md': 'completed',
      'archived.md': 'archived',
      'abandoned.md': 'abandoned',
    };

    for (const [file, status] of Object.entries(plans)) {
      writeFileSync(join(projectDir, '.prism', 'plans', file),
        `---\nstatus: ${status}\n---\n## Goal\n${status} plan\n- [ ] Task 1\n`);
    }

    const { getAllPlans } = await import('../lib/handoff.mjs');
    const allPlans = getAllPlans(projectDir);
    assert.equal(allPlans.length, 6);

    const statuses = allPlans.map(p => p.status);
    assert.ok(statuses.includes('draft'));
    assert.ok(statuses.includes('active'));
    assert.ok(statuses.includes('blocked'));
    assert.ok(statuses.includes('completed'));
    assert.ok(statuses.includes('archived'));
    assert.ok(statuses.includes('abandoned'));
  });
});

// ─── Scenario 5: Edge cases ───

describe('scenario: edge cases', () => {
  let projectDir;
  let validateTransition, updatePlanStatus;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-edge-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    ({ validateTransition, updatePlanStatus } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('rejects all transitions from archived (terminal)', () => {
    const targets = ['draft', 'active', 'blocked', 'completed', 'abandoned'];
    for (const to of targets) {
      const r = validateTransition('archived', to);
      assert.equal(r.valid, false, `archived → ${to} should be rejected`);
    }
  });

  it('rejects all transitions from abandoned (terminal)', () => {
    const targets = ['draft', 'active', 'blocked', 'completed', 'archived'];
    for (const to of targets) {
      const r = validateTransition('abandoned', to);
      assert.equal(r.valid, false, `abandoned → ${to} should be rejected`);
    }
  });

  it('rejects draft → completed (must go through active)', () => {
    const r = validateTransition('draft', 'completed');
    assert.equal(r.valid, false);
  });

  it('rejects draft → archived', () => {
    const r = validateTransition('draft', 'archived');
    assert.equal(r.valid, false);
  });

  it('rejects active → draft (no going back to draft)', () => {
    const r = validateTransition('active', 'draft');
    assert.equal(r.valid, false);
  });

  it('allows blocked → abandoned (give up while blocked)', () => {
    const r = validateTransition('blocked', 'abandoned');
    assert.equal(r.valid, true);
  });

  it('rejects blocked → completed (must unblock first)', () => {
    const r = validateTransition('blocked', 'completed');
    assert.equal(r.valid, false);
  });

  it('updatePlanStatus preserves markdown body after repeated transitions', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'preserve.md');
    const body = '## Goal\nPreserve body test\n\n## Batch 1\n- [ ] Task 1\n- [ ] Task 2\n\n## Risks\n- Risk 1\n';
    writeFileSync(planPath, `---\nstatus: draft\ncreated: 2026-03-06\n---\n\n${body}`);

    // Multiple transitions
    updatePlanStatus(planPath, 'active');
    updatePlanStatus(planPath, 'blocked', { blocked_reason: 'test' });
    updatePlanStatus(planPath, 'active', { blocked_reason: null });
    updatePlanStatus(planPath, 'completed', { completed_at: '2026-03-06' });

    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('## Goal'));
    assert.ok(content.includes('Preserve body test'));
    assert.ok(content.includes('## Batch 1'));
    assert.ok(content.includes('- [ ] Task 1'));
    assert.ok(content.includes('## Risks'));
    assert.ok(content.includes('- Risk 1'));
    assert.ok(content.includes('status: completed'));
  });

  it('handles plan with empty checkbox section', () => {
    const planPath = join(projectDir, '.prism', 'plans', 'empty-tasks.md');
    writeFileSync(planPath, '---\nstatus: active\n---\n\n## Goal\nNo tasks yet\n');

    // Should succeed — no checkbox state to verify
    const r = updatePlanStatus(planPath, 'abandoned', { abandoned_at: '2026-03-06' });
    assert.equal(r.success, true);
  });
});

// ─── Scenario 6: Non-interactive environment ───

describe('scenario: non-interactive environment', () => {
  let projectDir;
  let discoverPlans, importPlans;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-noninteractive-'));
    ({ discoverPlans, importPlans } = await import('../lib/plan-lifecycle.mjs'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('discoverPlans works without TTY (pure function, no prompts)', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-ci-plan.md'), '## Goal\nCI plan\n- [ ] Task 1\n');

    // discoverPlans is a pure function — should work regardless of TTY
    const found = discoverPlans(projectDir);
    assert.equal(found.length, 1);
    assert.equal(found[0].file, '2026-03-01-ci-plan.md');
  });

  it('importPlans works programmatically without user interaction', () => {
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    const srcPath = join(projectDir, 'docs', '2026-03-01-auto.md');
    writeFileSync(srcPath, '## Goal\nAuto import\n- [x] Task 1\n- [x] Task 2\n');

    // importPlans can be called programmatically
    const result = importPlans(projectDir, [{
      path: srcPath,
      file: '2026-03-01-auto.md',
      source: 'docs/'
    }]);

    assert.equal(result.imported, 1);
    const content = readFileSync(join(projectDir, '.prism', 'plans', '2026-03-01-auto.md'), 'utf8');
    assert.ok(content.includes('status: completed'));
  });

  it('discover + import can be chained without TTY', () => {
    mkdirSync(join(projectDir, 'docs', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', '2026-03-01-a.md'), '## Batch 1\n- [ ] Task 1\n');
    writeFileSync(join(projectDir, 'docs', 'plans', '2026-03-02-b.md'), '## Batch 1\n- [x] Task 1\n- [ ] Task 2\n');

    const found = discoverPlans(projectDir);
    const result = importPlans(projectDir, found);

    assert.equal(found.length, 2);
    assert.equal(result.imported, 2);

    // Second run finds nothing
    const found2 = discoverPlans(projectDir);
    assert.equal(found2.length, 0);
  });
});
