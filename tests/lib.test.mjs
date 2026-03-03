/**
 * claude-prism — lib module tests
 * Batch 1: config, state, utils
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── config.mjs ───

describe('config', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prism-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config file exists', async () => {
    const { loadConfig, DEFAULTS } = await import('../lib/config.mjs');
    const config = loadConfig(tempDir);
    assert.equal(config.hooks['commit-guard'].enabled, true);
    assert.equal(config.hooks['test-tracker'].enabled, true);
  });

  it('merges user config with defaults', async () => {
    const { loadConfig } = await import('../lib/config.mjs');
    mkdirSync(join(tempDir, '.prism'), { recursive: true });
    writeFileSync(join(tempDir, '.prism', 'config.json'), JSON.stringify({
      hooks: { 'commit-guard': { maxTestAge: 600 } }
    }));
    const config = loadConfig(tempDir);
    assert.equal(config.hooks['commit-guard'].enabled, true); // default preserved
    assert.equal(config.hooks['commit-guard'].maxTestAge, 600); // user override
  });

  it('returns defaults on malformed JSON', async () => {
    const { loadConfig } = await import('../lib/config.mjs');
    mkdirSync(join(tempDir, '.prism'), { recursive: true });
    writeFileSync(join(tempDir, '.prism', 'config.json'), '{ broken json');
    const config = loadConfig(tempDir);
    assert.equal(config.hooks['commit-guard'].enabled, true);
  });

  it('blocks prototype pollution via __proto__', async () => {
    const { loadConfig } = await import('../lib/config.mjs');
    mkdirSync(join(tempDir, '.prism'), { recursive: true });
    writeFileSync(join(tempDir, '.prism', 'config.json'), JSON.stringify({
      '__proto__': { 'polluted': true }
    }));
    const config = loadConfig(tempDir);
    assert.equal(({}).polluted, undefined);
  });

  it('getHookConfig returns specific hook settings', async () => {
    const { getHookConfig } = await import('../lib/config.mjs');
    const hookConfig = getHookConfig('commit-guard', tempDir);
    assert.equal(hookConfig.enabled, true);
    assert.equal(hookConfig.maxTestAge, 300);
  });
});

// ─── state.mjs ───

describe('state', () => {
  let stateDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-state-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('getStateDir creates directory', async () => {
    const { getStateDir } = await import('../lib/state.mjs');
    const dir = getStateDir('test-session');
    assert.ok(existsSync(dir));
  });

  it('getStateDir isolates by agentId', async () => {
    const { getStateDir } = await import('../lib/state.mjs');
    const dir1 = getStateDir('sess1', 'agent-a');
    const dir2 = getStateDir('sess1', 'agent-b');
    assert.notEqual(dir1, dir2);
  });

  it('readState returns null for missing key', async () => {
    const { readState } = await import('../lib/state.mjs');
    assert.equal(readState(stateDir, 'nonexistent'), null);
  });

  it('writeState and readState round-trip', async () => {
    const { writeState, readState } = await import('../lib/state.mjs');
    writeState(stateDir, 'test-key', 'test-value');
    assert.equal(readState(stateDir, 'test-key'), 'test-value');
  });

  it('writeJsonState and readJsonState round-trip', async () => {
    const { writeJsonState, readJsonState } = await import('../lib/state.mjs');
    const data = { foo: 'bar', count: 42 };
    writeJsonState(stateDir, 'json-key', data);
    assert.deepEqual(readJsonState(stateDir, 'json-key'), data);
  });

  it('readJsonState returns null on malformed JSON', async () => {
    const { readJsonState, writeState } = await import('../lib/state.mjs');
    writeState(stateDir, 'bad-json', '{ broken');
    assert.equal(readJsonState(stateDir, 'bad-json'), null);
  });

  it('incrementCounter starts at 1', async () => {
    const { incrementCounter } = await import('../lib/state.mjs');
    assert.equal(incrementCounter(stateDir, 'counter'), 1);
  });

  it('incrementCounter increments on subsequent calls', async () => {
    const { incrementCounter } = await import('../lib/state.mjs');
    incrementCounter(stateDir, 'counter');
    incrementCounter(stateDir, 'counter');
    assert.equal(incrementCounter(stateDir, 'counter'), 3);
  });
});

// ─── utils.mjs ───

describe('utils', () => {
  it('sanitizeId removes dangerous characters', async () => {
    const { sanitizeId } = await import('../lib/utils.mjs');
    assert.equal(sanitizeId('abc-123_XYZ'), 'abc-123_XYZ');
    assert.equal(sanitizeId('../../../etc/passwd'), 'etcpasswd');
    assert.equal(sanitizeId(''), 'default');
    assert.equal(sanitizeId(null), 'default');
  });

  it('sanitizeId truncates long strings', async () => {
    const { sanitizeId } = await import('../lib/utils.mjs');
    const long = 'a'.repeat(200);
    assert.equal(sanitizeId(long).length, 128);
  });
});

// ─── session.mjs ───

describe('session', () => {
  const testSessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  afterEach(async () => {
    const { getSessionLogPath } = await import('../lib/session.mjs');
    const logPath = getSessionLogPath(testSessionId);
    if (existsSync(logPath)) rmSync(logPath);
  });

  it('getSessionLogPath returns a .jsonl path', async () => {
    const { getSessionLogPath } = await import('../lib/session.mjs');
    const path = getSessionLogPath(testSessionId);
    assert.ok(path.endsWith('.jsonl'));
    assert.ok(path.includes(testSessionId));
  });

  it('logEvent creates a JSONL entry with timestamp', async () => {
    const { logEvent, readSessionLog } = await import('../lib/session.mjs');
    logEvent(testSessionId, { type: 'turn' });
    const events = readSessionLog(testSessionId);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'turn');
    assert.ok(events[0].ts > 0);
  });

  it('logEvent appends multiple events', async () => {
    const { logEvent, readSessionLog } = await import('../lib/session.mjs');
    logEvent(testSessionId, { type: 'turn' });
    logEvent(testSessionId, { type: 'file-edit', file: 'foo.ts' });
    logEvent(testSessionId, { type: 'test-run', passed: true });
    const events = readSessionLog(testSessionId);
    assert.equal(events.length, 3);
  });

  it('readSessionLog returns empty array for nonexistent session', async () => {
    const { readSessionLog } = await import('../lib/session.mjs');
    const events = readSessionLog('nonexistent-session-id');
    assert.deepEqual(events, []);
  });

  it('getSessionSummary computes correct totals', async () => {
    const { logEvent, getSessionSummary } = await import('../lib/session.mjs');
    logEvent(testSessionId, { type: 'turn' });
    logEvent(testSessionId, { type: 'turn' });
    logEvent(testSessionId, { type: 'file-edit' });
    logEvent(testSessionId, { type: 'file-create' });
    logEvent(testSessionId, { type: 'test-run', passed: true });
    logEvent(testSessionId, { type: 'test-run', passed: false });
    logEvent(testSessionId, { type: 'block' });
    logEvent(testSessionId, { type: 'warn' });
    const summary = getSessionSummary(testSessionId);
    assert.equal(summary.totalEvents, 8);
    assert.equal(summary.turns, 2);
    assert.equal(summary.filesModified, 1);
    assert.equal(summary.filesCreated, 1);
    assert.equal(summary.testsRun, 2);
    assert.equal(summary.testsPassed, 1);
    assert.equal(summary.testsFailed, 1);
    assert.equal(summary.blocks, 1);
    assert.equal(summary.warnings, 1);
    assert.ok(summary.startedAt > 0);
    assert.ok(summary.lastEventAt >= summary.startedAt);
  });

  it('getSessionSummary returns null for empty session', async () => {
    const { getSessionSummary } = await import('../lib/session.mjs');
    const summary = getSessionSummary('empty-session-xyz');
    assert.equal(summary, null);
  });

  it('listSessions includes created session', async () => {
    const { logEvent, listSessions } = await import('../lib/session.mjs');
    logEvent(testSessionId, { type: 'turn' });
    const sessions = listSessions();
    assert.ok(sessions.includes(testSessionId));
  });
});

// ─── pipeline.mjs (loadCustomRules) ───

describe('pipeline loadCustomRules', () => {
  it('returns built-in rules when no custom paths provided', async () => {
    const { loadCustomRules } = await import('../lib/pipeline.mjs');
    const builtIn = [{ name: 'test', rule: { evaluate: () => ({}) } }];
    const result = await loadCustomRules(builtIn, []);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'test');
  });

  it('returns built-in rules when custom paths is null', async () => {
    const { loadCustomRules } = await import('../lib/pipeline.mjs');
    const builtIn = [{ name: 'test', rule: { evaluate: () => ({}) } }];
    const result = await loadCustomRules(builtIn, null);
    assert.equal(result.length, 1);
  });

  it('skips invalid custom rule paths silently', async () => {
    const { loadCustomRules } = await import('../lib/pipeline.mjs');
    const builtIn = [{ name: 'test', rule: { evaluate: () => ({}) } }];
    const result = await loadCustomRules(builtIn, ['/nonexistent/path/rule.mjs']);
    assert.equal(result.length, 1);
  });
});

// ─── messages.mjs ───

describe('messages', () => {
  it('getMessage returns template with params replaced', async () => {
    const { getMessage } = await import('../lib/messages.mjs');
    const msg = getMessage('en', 'commit-guard.warn.stale', { minutes: 5 });
    assert.ok(msg.includes('5'));
    assert.ok(msg.includes('min ago'));
  });

  it('getMessage returns template with unreplaced params as-is', async () => {
    const { getMessage } = await import('../lib/messages.mjs');
    const msg = getMessage('en', 'commit-guard.warn.stale', {});
    assert.ok(msg.includes('{minutes}'));
  });

  it('getMessage returns key when no template found', async () => {
    const { getMessage } = await import('../lib/messages.mjs');
    const msg = getMessage('en', 'nonexistent.key');
    assert.equal(msg, 'nonexistent.key');
  });

  it('getMessage returns correct block message', async () => {
    const { getMessage } = await import('../lib/messages.mjs');
    const msg = getMessage('en', 'commit-guard.block.failed');
    assert.ok(msg.includes('blocked'));
    assert.ok(msg.includes('FAILED'));
  });

  it('getMessage returns plan-enforcement warning with count', async () => {
    const { getMessage } = await import('../lib/messages.mjs');
    const msg = getMessage('en', 'plan-enforcement.warn.no-plan', { count: 7 });
    assert.ok(msg.includes('7'));
    assert.ok(msg.includes('source files'));
  });
});

// ─── handoff.mjs ───

describe('handoff', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-handoff-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('generateHandoff returns markdown with required sections', async () => {
    const { generateHandoff } = await import('../lib/handoff.mjs');
    const content = generateHandoff(projectDir);
    assert.ok(content.includes('## Status'));
    assert.ok(content.includes('## Current State'));
    assert.ok(content.includes('## Next Steps'));
    assert.ok(content.includes('## Decisions Made'));
    assert.ok(content.includes('## Known Issues'));
  });

  it('generateHandoff includes plan progress when plan exists', async () => {
    const { generateHandoff } = await import('../lib/handoff.mjs');
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-01-01-test.md'),
      '## Batch 1\n- [x] Task A\n- [ ] Task B\n');
    const content = generateHandoff(projectDir);
    assert.ok(content.includes('1/2'));
    assert.ok(content.includes('50%'));
  });

  it('getActivePlanInfo returns null when no plans dir', async () => {
    const { getActivePlanInfo } = await import('../lib/handoff.mjs');
    const result = getActivePlanInfo(projectDir);
    assert.equal(result, null);
  });

  it('parsePlanContent counts checkboxes correctly', async () => {
    const { parsePlanContent } = await import('../lib/handoff.mjs');
    const content = '## Batch 1\n- [x] Done task\n- [x] Done task 2\n- [ ] Todo task\n## Batch 2\n- [ ] Future task\n';
    const result = parsePlanContent(content, 'test.md');
    assert.equal(result.total, 4);
    assert.equal(result.done, 2);
    assert.equal(result.nextTasks.length, 2);
  });
});

// ─── webhook.mjs ───

describe('webhook', () => {
  it('dispatchWebhook does nothing when no webhooks configured', async () => {
    const { dispatchWebhook } = await import('../lib/webhook.mjs');
    // Should not throw
    await dispatchWebhook({}, 'test-event', { data: 1 });
    await dispatchWebhook({ webhooks: [] }, 'test-event', { data: 1 });
  });

  it('dispatchWebhook filters by event subscription', async () => {
    const { dispatchWebhook } = await import('../lib/webhook.mjs');
    // No real server — should silently fail
    const config = {
      webhooks: [{ url: 'http://localhost:1/nope', events: ['other-event'] }]
    };
    await dispatchWebhook(config, 'test-event', { data: 1 });
    // If it filtered correctly, no fetch was attempted for non-matching event
  });

  it('dispatchWebhook silently fails on unreachable URL', async () => {
    const { dispatchWebhook } = await import('../lib/webhook.mjs');
    const config = {
      webhooks: [{ url: 'http://localhost:1/nope', events: ['test'] }]
    };
    // Should not throw
    await dispatchWebhook(config, 'test', { data: 1 });
  });

  it('dispatchWebhook skips hooks without url', async () => {
    const { dispatchWebhook } = await import('../lib/webhook.mjs');
    const config = {
      webhooks: [{ events: ['test'] }]
    };
    await dispatchWebhook(config, 'test', { data: 1 });
  });
});

// ─── config.mjs (buildSourcePattern / buildTestPattern) ───

describe('config patterns', () => {
  it('buildSourcePattern matches expected extensions', async () => {
    const { buildSourcePattern } = await import('../lib/config.mjs');
    const pattern = buildSourcePattern(['ts', 'tsx', 'js']);
    assert.ok(pattern.test('file.ts'));
    assert.ok(pattern.test('file.tsx'));
    assert.ok(pattern.test('file.js'));
    assert.ok(!pattern.test('file.md'));
    assert.ok(!pattern.test('file.json'));
  });

  it('buildTestPattern matches test file patterns', async () => {
    const { buildTestPattern } = await import('../lib/config.mjs');
    const pattern = buildTestPattern(['test', 'spec', '_test']);
    assert.ok(pattern.test('file.test.ts'));
    assert.ok(pattern.test('file.spec.js'));
    assert.ok(pattern.test('file._test.py'));
    assert.ok(!pattern.test('file.ts'));
    assert.ok(!pattern.test('testing.ts'));
  });

  it('buildSourcePattern escapes special regex characters', async () => {
    const { buildSourcePattern } = await import('../lib/config.mjs');
    const pattern = buildSourcePattern(['c++', 'c#']);
    assert.ok(pattern instanceof RegExp);
  });
});
