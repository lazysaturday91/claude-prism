/**
 * claude-prism — CLI tests
 * Batch 4: init, check
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── init ───

describe('cli init', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    // Create a minimal CLAUDE.md
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# My Project\n\nSome rules.\n');
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('creates .claude/commands/claude-prism/ with prism.md and checkpoint.md', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    assert.ok(existsSync(join(projectDir, '.claude', 'commands', 'claude-prism', 'prism.md')));
    assert.ok(existsSync(join(projectDir, '.claude', 'commands', 'claude-prism', 'checkpoint.md')));
  });

  it('creates all 7 namespaced command files after init', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const nsDir = join(projectDir, '.claude', 'commands', 'claude-prism');
    const expected = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md'];
    for (const cmd of expected) {
      assert.ok(existsSync(join(nsDir, cmd)), `Expected ${cmd} to exist`);
    }
  });

  it('creates .claude/hooks/ when hooks option is true', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    assert.ok(existsSync(join(projectDir, '.claude', 'hooks', 'pre-tool.mjs')));
    assert.ok(existsSync(join(projectDir, '.claude', 'hooks', 'post-tool.mjs')));
    assert.ok(existsSync(join(projectDir, '.claude', 'hooks', 'user-prompt.mjs')));
  });

  it('skips hooks when hooks option is false', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    assert.ok(!existsSync(join(projectDir, '.claude', 'hooks', 'commit-guard.mjs')));
  });

  it('injects rules into CLAUDE.md with PRISM markers', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('<!-- PRISM:START -->'));
    assert.ok(content.includes('<!-- PRISM:END -->'));
    assert.ok(content.includes('UDEC'));
  });

  // ─── rules strengthening tests ───

  it('english rules contain Assumption Detection section', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Assumption Detection'));
    assert.ok(content.includes('Red Flag'));
  });

  it('english rules contain Scope Guard section', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Scope Guard'));
    assert.ok(content.includes('Only change what was requested'));
  });

  it('english rules contain plan file template format', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('## Goal'));
    assert.ok(content.includes('## Batch'));
  });

  it('preserves existing CLAUDE.md content', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('# My Project'));
    assert.ok(content.includes('Some rules.'));
  });

  it('replaces existing PRISM block on re-init', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    await init(projectDir, { hooks: false }); // re-init
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    // Should not have double injection
    const starts = content.split('<!-- PRISM:START -->').length - 1;
    assert.equal(starts, 1);
    assert.ok(content.includes('Understanding Protocol'));
  });

  it('creates CLAUDE.md if it does not exist', async () => {
    const { init } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, 'CLAUDE.md')); // remove it
    await init(projectDir, { hooks: false });
    assert.ok(existsSync(join(projectDir, 'CLAUDE.md')));
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('<!-- PRISM:START -->'));
  });

  it('creates .claude-prism.json config file', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    assert.ok(existsSync(join(projectDir, '.claude-prism.json')));
    const config = JSON.parse(readFileSync(join(projectDir, '.claude-prism.json'), 'utf8'));
    assert.ok(config.hooks);
  });

  it('merges settings.json preserving existing hooks', async () => {
    const { init } = await import('../lib/installer.mjs');
    // Create existing settings with a custom hook
    mkdirSync(join(projectDir, '.claude'), { recursive: true });
    writeFileSync(join(projectDir, '.claude', 'settings.json'), JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: 'Read', hooks: [{ type: 'command', command: 'echo custom' }] }
        ]
      }
    }));
    await init(projectDir, { hooks: true });
    const settings = JSON.parse(readFileSync(join(projectDir, '.claude', 'settings.json'), 'utf8'));
    // Should have both custom and prism hooks
    const preHooks = settings.hooks.PreToolUse;
    assert.ok(preHooks.length >= 2); // custom + commit-guard
  });
});

// ─── check ───

describe('cli check', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns all checks passing after init', async () => {
    const { init, check } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    await init(projectDir, { hooks: true });
    const result = check(projectDir);
    assert.ok(result.commands);
    assert.ok(result.rules);
    assert.ok(result.hooks);
    assert.ok(result.config);
    assert.ok(result.ok);
  });

  it('fails when commands are missing', async () => {
    const { check } = await import('../lib/installer.mjs');
    const result = check(projectDir);
    assert.equal(result.commands, false);
    assert.equal(result.ok, false);
  });

  it('reports hooks as false when not installed', async () => {
    const { init, check } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    await init(projectDir, { hooks: false });
    const result = check(projectDir);
    assert.equal(result.hooks, false);
    assert.ok(result.commands); // commands should still be there
  });
});

// ─── uninstall ───

describe('cli uninstall', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# My Project\n\nCustom rules here.\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('removes PRISM block from CLAUDE.md but keeps other content', async () => {
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(!content.includes('<!-- PRISM:START -->'));
    assert.ok(!content.includes('<!-- PRISM:END -->'));
    assert.ok(content.includes('# My Project'));
    assert.ok(content.includes('Custom rules here.'));
  });

  it('removes .claude/commands/claude-prism/ namespace directory', async () => {
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    assert.ok(!existsSync(join(projectDir, '.claude', 'commands', 'claude-prism')));
  });

  it('removes legacy flat commands if present', async () => {
    // Simulate legacy flat commands existing alongside namespaced
    const commandsDir = join(projectDir, '.claude', 'commands');
    writeFileSync(join(commandsDir, 'prism.md'), '# legacy');
    writeFileSync(join(commandsDir, 'checkpoint.md'), '# legacy');
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    assert.ok(!existsSync(join(commandsDir, 'prism.md')));
    assert.ok(!existsSync(join(commandsDir, 'checkpoint.md')));
    assert.ok(!existsSync(join(commandsDir, 'claude-prism')));
  });

  it('removes .claude/hooks/ prism files', async () => {
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    assert.ok(!existsSync(join(projectDir, '.claude', 'hooks', 'commit-guard.mjs')));
    assert.ok(!existsSync(join(projectDir, '.claude', 'hooks', 'debug-loop.mjs')));
    assert.ok(!existsSync(join(projectDir, '.claude', 'hooks', 'test-tracker.mjs')));
    assert.ok(!existsSync(join(projectDir, '.claude', 'hooks', 'scope-guard.mjs')));
  });

  it('removes .claude/rules/ and .claude/lib/', async () => {
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    assert.ok(!existsSync(join(projectDir, '.claude', 'rules')));
    assert.ok(!existsSync(join(projectDir, '.claude', 'lib')));
  });

  it('removes .claude-prism.json', async () => {
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    assert.ok(!existsSync(join(projectDir, '.claude-prism.json')));
  });

  it('removes prism hooks from settings.json but keeps others', async () => {
    // Add a non-prism hook to settings
    const settingsPath = join(projectDir, '.claude', 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    settings.hooks.PreToolUse.unshift({
      matcher: 'Read',
      hooks: [{ type: 'command', command: 'echo custom' }]
    });
    writeFileSync(settingsPath, JSON.stringify(settings));

    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);

    const updated = JSON.parse(readFileSync(settingsPath, 'utf8'));
    // Custom hook should remain
    assert.ok(updated.hooks.PreToolUse.some(h => h.hooks?.[0]?.command === 'echo custom'));
    // Prism hooks should be gone
    assert.ok(!updated.hooks.PreToolUse.some(h => h.hooks?.[0]?.command?.includes('commit-guard')));
  });

  it('check reports all false after uninstall', async () => {
    const { uninstall, check } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    const result = check(projectDir);
    assert.equal(result.commands, false);
    assert.equal(result.rules, false);
    assert.equal(result.hooks, false);
    assert.equal(result.ok, false);
  });
});

// ─── update ───

describe('cli update', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# My Project\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('re-installs rules from rules.md', async () => {
    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Understanding Protocol'));
  });

  it('updates rules while preserving existing CLAUDE.md content', async () => {
    // Manually corrupt the rules
    const claudeMd = join(projectDir, 'CLAUDE.md');
    writeFileSync(claudeMd, '# My Project\n<!-- PRISM:START -->OLD<!-- PRISM:END -->\n');
    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);
    const content = readFileSync(claudeMd, 'utf8');
    assert.ok(content.includes('# My Project'));
    assert.ok(content.includes('UDEC'));
    assert.ok(!content.includes('OLD'));
  });

  it('passes check after update', async () => {
    const { update, check } = await import('../lib/installer.mjs');
    await update(projectDir);
    const result = check(projectDir);
    assert.ok(result.ok);
  });

  it('migrates legacy flat commands to namespaced on update', async () => {
    // Simulate legacy flat commands
    const commandsDir = join(projectDir, '.claude', 'commands');
    writeFileSync(join(commandsDir, 'prism.md'), '# legacy prism');
    writeFileSync(join(commandsDir, 'checkpoint.md'), '# legacy checkpoint');

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    // Legacy flat commands should be gone
    assert.ok(!existsSync(join(commandsDir, 'prism.md')));
    assert.ok(!existsSync(join(commandsDir, 'checkpoint.md')));

    // Namespaced commands should exist
    const nsDir = join(commandsDir, 'claude-prism');
    assert.ok(existsSync(join(nsDir, 'prism.md')));
    assert.ok(existsSync(join(nsDir, 'checkpoint.md')));
    assert.ok(existsSync(join(nsDir, 'plan.md')));
    assert.ok(existsSync(join(nsDir, 'help.md')));
  });

  it('removes deprecated understand.md on update', async () => {
    // Simulate leftover understand.md from previous version
    const nsDir = join(projectDir, '.claude', 'commands', 'claude-prism');
    writeFileSync(join(nsDir, 'understand.md'), '# leftover');
    assert.ok(existsSync(join(nsDir, 'understand.md')));

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    assert.ok(!existsSync(join(nsDir, 'understand.md')));
    // Other commands should still exist
    assert.ok(existsSync(join(nsDir, 'prism.md')));
  });

  it('migrates legacy .prism.json to .claude-prism.json on update', async () => {
    // Create a project with legacy .prism.json
    rmSync(join(projectDir, '.claude-prism.json'));
    writeFileSync(join(projectDir, '.prism.json'), JSON.stringify({
      hooks: { 'commit-guard': { enabled: true } }
    }));

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    // New config should exist
    assert.ok(existsSync(join(projectDir, '.claude-prism.json')));
    // Legacy should be gone (removed during update)
    assert.ok(!existsSync(join(projectDir, '.prism.json')));
    // Config should exist with hooks
    const config = JSON.parse(readFileSync(join(projectDir, '.claude-prism.json'), 'utf8'));
    assert.ok(config.hooks);
  });
});

// ─── doctor ───

describe('cli doctor', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns healthy for complete installation', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    const result = doctor(projectDir);
    assert.ok(result.healthy);
    assert.equal(result.issues.length, 0);
  });

  it('detects missing namespaced command files', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, '.claude', 'commands', 'claude-prism', 'prism.md'));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('claude-prism/prism.md')));
    assert.ok(result.fixes.some(f => f.includes('update')));
  });

  it('detects missing hook files', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, '.claude', 'hooks', 'pre-tool.mjs'));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('pre-tool')));
  });

  it('detects corrupted CLAUDE.md (missing PRISM block)', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\nNo prism here\n');
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('CLAUDE.md')));
  });

  it('detects missing .claude-prism.json', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, '.claude-prism.json'));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('.claude-prism.json')));
  });

  it('detects legacy flat commands that need migration', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    // Create legacy flat commands
    writeFileSync(join(projectDir, '.claude', 'commands', 'prism.md'), '# legacy');
    writeFileSync(join(projectDir, '.claude', 'commands', 'checkpoint.md'), '# legacy');
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('Legacy command found')));
    assert.ok(result.fixes.some(f => f.includes('migrate')));
  });

  it('reports all 7 missing commands when namespace dir absent', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, '.claude', 'commands', 'claude-prism'), { recursive: true });
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    const missingCmds = result.issues.filter(i => i.includes('Missing command:'));
    assert.equal(missingCmds.length, 7);
  });

  it('detects legacy .prism.json and suggests migration', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    // Create legacy .prism.json alongside new .claude-prism.json
    writeFileSync(join(projectDir, '.prism.json'), JSON.stringify({ hooks: { 'commit-guard': { enabled: true } } }));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('Legacy .prism.json')));
    assert.ok(result.fixes.some(f => f.includes('prism update')));
  });
});

// ─── stats ───

describe('cli stats', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns hook settings', async () => {
    const { stats } = await import('../lib/installer.mjs');
    const result = stats(projectDir);
    assert.ok(result.hooks);
    assert.equal(result.hooks['commit-guard'], true);
    assert.equal(result.hooks['scope-guard'], true);
  });

  it('returns version from package.json', async () => {
    const { stats } = await import('../lib/installer.mjs');
    const result = stats(projectDir);
    assert.ok(result.version);
    assert.match(result.version, /^\d+\.\d+\.\d+$/);
  });

  it('counts plan files', async () => {
    const { stats } = await import('../lib/installer.mjs');
    mkdirSync(join(projectDir, 'docs', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'plans', '2026-01-01-test.md'), '# Plan');
    const result = stats(projectDir);
    assert.equal(result.planFiles, 1);
  });
});

// ─── reset ───

describe('cli reset', () => {
  let projectDir;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('clears hook state directory', async () => {
    const { reset } = await import('../lib/installer.mjs');
    // Create some fake state
    const stateRoot = join(tmpdir(), '.prism');
    mkdirSync(stateRoot, { recursive: true });
    writeFileSync(join(stateRoot, 'test-state'), 'data');
    const cleared = reset();
    assert.ok(cleared);
  });

  it('returns ok even when no state exists', async () => {
    const { reset } = await import('../lib/installer.mjs');
    const cleared = reset();
    assert.ok(cleared);
  });
});
