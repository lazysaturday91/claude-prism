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
    writeFileSync(join(tempDir, '.claude-prism.json'), JSON.stringify({
      hooks: { 'commit-guard': { maxTestAge: 600 } }
    }));
    const config = loadConfig(tempDir);
    assert.equal(config.hooks['commit-guard'].enabled, true); // default preserved
    assert.equal(config.hooks['commit-guard'].maxTestAge, 600); // user override
  });

  it('returns defaults on malformed JSON', async () => {
    const { loadConfig } = await import('../lib/config.mjs');
    writeFileSync(join(tempDir, '.claude-prism.json'), '{ broken json');
    const config = loadConfig(tempDir);
    assert.equal(config.hooks['commit-guard'].enabled, true);
  });

  it('blocks prototype pollution via __proto__', async () => {
    const { loadConfig } = await import('../lib/config.mjs');
    writeFileSync(join(tempDir, '.claude-prism.json'), JSON.stringify({
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
