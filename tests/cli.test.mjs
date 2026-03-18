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

  it('creates all 9 namespaced command files after init', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const nsDir = join(projectDir, '.claude', 'commands', 'claude-prism');
    const expected = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md', 'analytics.md', 'hud.md'];
    for (const cmd of expected) {
      assert.ok(existsSync(join(nsDir, cmd)), `Expected ${cmd} to exist`);
    }
  });

  it('creates .claude/hooks/ when hooks option is true', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    assert.ok(existsSync(join(projectDir, '.claude', 'hooks', 'pre-tool.mjs')));
    assert.ok(existsSync(join(projectDir, '.claude', 'hooks', 'post-tool.mjs')));
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
    assert.ok(content.includes('EUDEC'));
  });

  // ─── rules strengthening tests ───

  it('lean rules contain Protocol Reference table and Scope Guard', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Protocol Reference'));
    assert.ok(content.includes('Scope Guard'));
    assert.ok(content.includes('Only change what was requested'));
  });

  it('copies protocol files with detailed EUDEC content', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });
    const protocolsDir = join(projectDir, '.claude', 'protocols', 'prism');
    // Protocol files exist
    assert.ok(existsSync(join(protocolsDir, 'essence.md')));
    assert.ok(existsSync(join(protocolsDir, 'understand.md')));
    assert.ok(existsSync(join(protocolsDir, 'decompose.md')));
    assert.ok(existsSync(join(protocolsDir, 'execute.md')));
    assert.ok(existsSync(join(protocolsDir, 'checkpoint.md')));
    assert.ok(existsSync(join(protocolsDir, 'handoff.md')));
    // Detailed content moved to protocol files
    const understand = readFileSync(join(protocolsDir, 'understand.md'), 'utf8');
    assert.ok(understand.includes('Assumption Detection'));
    const decompose = readFileSync(join(protocolsDir, 'decompose.md'), 'utf8');
    assert.ok(decompose.includes('## Goal'));
    assert.ok(decompose.includes('## Batch'));
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
    assert.ok(content.includes('Protocol Reference'));
  });

  it('creates CLAUDE.md if it does not exist', async () => {
    const { init } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, 'CLAUDE.md')); // remove it
    await init(projectDir, { hooks: false });
    assert.ok(existsSync(join(projectDir, 'CLAUDE.md')));
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('<!-- PRISM:START -->'));
  });

  it('creates .prism/config.json config file', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    assert.ok(existsSync(join(projectDir, '.prism', 'config.json')));
    const config = JSON.parse(readFileSync(join(projectDir, '.prism', 'config.json'), 'utf8'));
    assert.ok(config.hooks);
  });

  it('creates .prism/.version file', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    assert.ok(existsSync(join(projectDir, '.prism', '.version')));
  });

  it('creates .prism/.gitignore with .version entry', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const gitignore = readFileSync(join(projectDir, '.prism', '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('.version'));
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

  it('removes .prism/config.json and legacy .claude-prism.json', async () => {
    const { uninstall } = await import('../lib/installer.mjs');
    uninstall(projectDir);
    assert.ok(!existsSync(join(projectDir, '.prism', 'config.json')));
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

  it('re-installs rules from rules-lean.md', async () => {
    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Protocol Reference'));
  });

  it('updates rules while preserving existing CLAUDE.md content', async () => {
    // Manually corrupt the rules
    const claudeMd = join(projectDir, 'CLAUDE.md');
    writeFileSync(claudeMd, '# My Project\n<!-- PRISM:START -->OLD<!-- PRISM:END -->\n');
    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);
    const content = readFileSync(claudeMd, 'utf8');
    assert.ok(content.includes('# My Project'));
    assert.ok(content.includes('EUDEC'));
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

  it('migrates legacy .prism.json to .prism/config.json on update', async () => {
    // Create a project with legacy .prism.json
    rmSync(join(projectDir, '.prism', 'config.json'));
    writeFileSync(join(projectDir, '.prism.json'), JSON.stringify({
      hooks: { 'commit-guard': { enabled: true } }
    }));

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    // New config should exist at .prism/config.json
    assert.ok(existsSync(join(projectDir, '.prism', 'config.json')));
    // Legacy should be gone
    assert.ok(!existsSync(join(projectDir, '.prism.json')));
    // Config should exist with hooks
    const config = JSON.parse(readFileSync(join(projectDir, '.prism', 'config.json'), 'utf8'));
    assert.ok(config.hooks);
  });

  it('migrates legacy .claude-prism.json to .prism/config.json on update', async () => {
    // Simulate legacy .claude-prism.json
    rmSync(join(projectDir, '.prism', 'config.json'));
    writeFileSync(join(projectDir, '.claude-prism.json'), JSON.stringify({
      hooks: { 'commit-guard': { enabled: true } }
    }));

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    // New config should exist at .prism/config.json
    assert.ok(existsSync(join(projectDir, '.prism', 'config.json')));
    // Legacy should be gone
    assert.ok(!existsSync(join(projectDir, '.claude-prism.json')));
  });

  it('migrates docs/plans/ to .prism/plans/ on update', async () => {
    // Create legacy plans
    mkdirSync(join(projectDir, 'docs', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'plans', '2026-01-01-test.md'), '# Plan');

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    // Plans should be in .prism/plans/
    assert.ok(existsSync(join(projectDir, '.prism', 'plans', '2026-01-01-test.md')));
    // Legacy dir should be cleaned up
    assert.ok(!existsSync(join(projectDir, 'docs', 'plans')));
  });

  it('migrates .claude/.prism-version to .prism/.version on update', async () => {
    // Create legacy version file
    writeFileSync(join(projectDir, '.claude', '.prism-version'), '1.2.0');

    const { update } = await import('../lib/installer.mjs');
    await update(projectDir);

    // Version should exist at new path
    assert.ok(existsSync(join(projectDir, '.prism', '.version')));
    // Legacy should be gone
    assert.ok(!existsSync(join(projectDir, '.claude', '.prism-version')));
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

  it('detects missing .prism/config.json', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, '.prism', 'config.json'));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('.prism/config.json')));
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

  it('reports all 9 missing commands when namespace dir absent', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    rmSync(join(projectDir, '.claude', 'commands', 'claude-prism'), { recursive: true });
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    const missingCmds = result.issues.filter(i => i.includes('Missing command:'));
    assert.equal(missingCmds.length, 9);
  });

  it('detects legacy .prism.json and suggests migration', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, '.prism.json'), JSON.stringify({ hooks: { 'commit-guard': { enabled: true } } }));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('Legacy .prism.json')));
    assert.ok(result.fixes.some(f => f.includes('prism update')));
  });

  it('detects legacy .claude-prism.json and suggests migration', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, '.claude-prism.json'), JSON.stringify({ hooks: { 'commit-guard': { enabled: true } } }));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('Legacy .claude-prism.json')));
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
    assert.equal(result.hooks['test-tracker'], true);
  });

  it('returns version from package.json', async () => {
    const { stats } = await import('../lib/installer.mjs');
    const result = stats(projectDir);
    assert.ok(result.version);
    assert.match(result.version, /^\d+\.\d+\.\d+/);
  });

  it('counts plan files in .prism/plans/', async () => {
    const { stats } = await import('../lib/installer.mjs');
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
    writeFileSync(join(projectDir, '.prism', 'plans', '2026-01-01-test.md'), '# Plan');
    const result = stats(projectDir);
    assert.equal(result.planFiles, 1);
  });

  it('counts plan files in legacy docs/plans/ as fallback', async () => {
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

// ─── initGlobal ───

describe('cli initGlobal', () => {
  let fakeHome;
  beforeEach(() => { fakeHome = mkdtempSync(join(tmpdir(), 'prism-home-')); });
  afterEach(() => { rmSync(fakeHome, { recursive: true, force: true }); });

  it('installs 9 commands to ~/.claude/commands/claude-prism/', async () => {
    const { initGlobal } = await import('../lib/installer.mjs');
    initGlobal({ homeDir: fakeHome });
    const cmdsDir = join(fakeHome, '.claude', 'commands', 'claude-prism');
    const expected = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md', 'analytics.md', 'hud.md'];
    for (const cmd of expected) {
      assert.ok(existsSync(join(cmdsDir, cmd)), `Expected ${cmd}`);
    }
  });

  it('installs SKILL.md to ~/.claude/skills/prism/', async () => {
    const { initGlobal } = await import('../lib/installer.mjs');
    initGlobal({ homeDir: fakeHome });
    assert.ok(existsSync(join(fakeHome, '.claude', 'skills', 'prism', 'SKILL.md')));
  });
});

// ─── uninstallGlobal ───

describe('cli uninstallGlobal', () => {
  let fakeHome;
  beforeEach(async () => {
    fakeHome = mkdtempSync(join(tmpdir(), 'prism-home-'));
    const { initGlobal } = await import('../lib/installer.mjs');
    initGlobal({ homeDir: fakeHome });
  });
  afterEach(() => { rmSync(fakeHome, { recursive: true, force: true }); });

  it('removes commands and skills directories', async () => {
    const { uninstallGlobal } = await import('../lib/installer.mjs');
    uninstallGlobal({ homeDir: fakeHome });
    assert.ok(!existsSync(join(fakeHome, '.claude', 'commands', 'claude-prism')));
    assert.ok(!existsSync(join(fakeHome, '.claude', 'skills', 'prism')));
  });

  it('handles already-removed directories gracefully', async () => {
    const { uninstallGlobal } = await import('../lib/installer.mjs');
    uninstallGlobal({ homeDir: fakeHome });
    // Call again — should not throw
    uninstallGlobal({ homeDir: fakeHome });
  });
});

// ─── dryRun ───

describe('cli dryRun', () => {
  let projectDir;
  beforeEach(() => { projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-')); });
  afterEach(() => { rmSync(projectDir, { recursive: true, force: true }); });

  it('lists all files that would be created on fresh project', async () => {
    const { dryRun } = await import('../lib/installer.mjs');
    const result = dryRun(projectDir, { hooks: true });
    assert.ok(result.actions.length > 0);
    // All should be "create" on fresh project
    assert.ok(result.actions.every(a => a.status === 'create'));
    // Should include commands, hooks, rules, libs, CLAUDE.md, config
    assert.ok(result.actions.some(a => a.type === 'command'));
    assert.ok(result.actions.some(a => a.type === 'hook'));
    assert.ok(result.actions.some(a => a.type === 'rule'));
    assert.ok(result.actions.some(a => a.type === 'lib'));
    assert.ok(result.actions.some(a => a.type === 'rules'));
    assert.ok(result.actions.some(a => a.type === 'config'));
  });

  it('shows "update" status for existing files', async () => {
    const { init, dryRun } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    await init(projectDir, { hooks: true });
    const result = dryRun(projectDir, { hooks: true });
    // Most should be "update" now (config won't appear since it exists)
    assert.ok(result.actions.some(a => a.status === 'update'));
    assert.ok(!result.actions.some(a => a.type === 'config')); // config already exists, not listed
  });

  it('excludes hooks when hooks option is false', async () => {
    const { dryRun } = await import('../lib/installer.mjs');
    const result = dryRun(projectDir, { hooks: false });
    assert.ok(!result.actions.some(a => a.type === 'hook'));
    assert.ok(!result.actions.some(a => a.type === 'rule'));
    assert.ok(!result.actions.some(a => a.type === 'lib'));
    // Commands and CLAUDE.md should still be listed
    assert.ok(result.actions.some(a => a.type === 'command'));
    assert.ok(result.actions.some(a => a.type === 'rules'));
  });
});

// ─── self-update detection ───

describe('cli self-update detection', () => {
  let projectDir;
  beforeEach(() => { projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-')); });
  afterEach(() => { rmSync(projectDir, { recursive: true, force: true }); });

  it('detects source repo and uses local templates', async () => {
    const { update } = await import('../lib/installer.mjs');
    // Simulate a claude-prism source repo
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'claude-prism' }));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Test\n<!-- PRISM:START -->old<!-- PRISM:END -->\n');
    mkdirSync(join(projectDir, 'templates'), { recursive: true });
    writeFileSync(join(projectDir, 'templates', 'rules.md'), '<!-- PRISM:START -->\n# Full Rules\n<!-- PRISM:END -->');
    writeFileSync(join(projectDir, 'templates', 'rules-lean.md'), '<!-- PRISM:START -->\n# Local Rules\n<!-- PRISM:END -->');
    const result = await update(projectDir);
    assert.ok(result?.sourceRepo);
    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Local Rules'));
    assert.ok(!content.includes('old'));
  });

  it('proceeds normally for non-source-repo projects', async () => {
    const { init, update } = await import('../lib/installer.mjs');
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({ name: 'my-app' }));
    await init(projectDir, { hooks: true });
    const result = await update(projectDir);
    assert.ok(!result?.sourceRepo);
  });
});

// ─── plugin structure ───

describe('plugin structure', () => {
  it('plugin.json exists and is valid JSON', () => {
    const pluginPath = join(process.cwd(), '.claude-plugin', 'plugin.json');
    assert.ok(existsSync(pluginPath), 'plugin.json should exist');
    const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
    assert.equal(plugin.name, 'claude-prism');
    assert.ok(plugin.hooks);
    assert.ok(plugin.skills);
  });

  it('plugin-hooks.json exists and registers 6 events', () => {
    const hooksPath = join(process.cwd(), 'plugin-hooks.json');
    assert.ok(existsSync(hooksPath), 'plugin-hooks.json should exist');
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf8'));
    const events = Object.keys(hooks.hooks);
    assert.ok(events.includes('PreToolUse'));
    assert.ok(events.includes('PostToolUse'));
    assert.ok(events.includes('PreCompact'));
    assert.ok(events.includes('SessionEnd'));
    assert.ok(events.includes('SubagentStart'));
    assert.ok(events.includes('TaskCompleted'));
  });

  it('all plugin script runners exist', () => {
    const scripts = ['pre-tool.mjs', 'post-tool.mjs', 'precompact.mjs', 'session-end.mjs', 'subagent-start.mjs', 'task-completed.mjs'];
    for (const script of scripts) {
      assert.ok(existsSync(join(process.cwd(), 'scripts', script)), `scripts/${script} should exist`);
    }
  });
});

// ─── new hook installer paths ───

describe('new hook installer paths', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-cli-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('init installs all 6 hook runners', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const hooksDir = join(projectDir, '.claude', 'hooks');
    for (const hook of ['pre-tool.mjs', 'post-tool.mjs', 'precompact.mjs', 'session-end.mjs', 'subagent-start.mjs', 'task-completed.mjs']) {
      assert.ok(existsSync(join(hooksDir, hook)), `${hook} should be installed`);
    }
  });

  it('init installs all 7 rule files', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const rulesDir = join(projectDir, '.claude', 'rules');
    for (const rule of ['commit-guard.mjs', 'test-tracker.mjs', 'plan-enforcement.mjs', 'precompact-handler.mjs', 'session-end-handler.mjs', 'subagent-scope-injector.mjs', 'task-plan-sync.mjs']) {
      assert.ok(existsSync(join(rulesDir, rule)), `${rule} should be installed`);
    }
  });

  it('init installs all 9 lib files', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const libDir = join(projectDir, '.claude', 'lib');
    for (const lib of ['state.mjs', 'config.mjs', 'utils.mjs', 'messages.mjs', 'pipeline.mjs', 'session.mjs', 'handoff.mjs', 'webhook.mjs', 'plan-lifecycle.mjs']) {
      assert.ok(existsSync(join(libDir, lib)), `${lib} should be installed`);
    }
  });

  it('settings.json includes all 6 hook events after init', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    const settings = JSON.parse(readFileSync(join(projectDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.hooks.PreToolUse);
    assert.ok(settings.hooks.PostToolUse);
    assert.ok(settings.hooks.PreCompact);
    assert.ok(settings.hooks.SessionEnd);
    assert.ok(settings.hooks.SubagentStart);
    assert.ok(settings.hooks.TaskCompleted);
  });

  it('dryRun shows new hook files', async () => {
    const { dryRun } = await import('../lib/installer.mjs');
    const result = dryRun(projectDir, { hooks: true });
    const hookPaths = result.actions.filter(a => a.type === 'hook').map(a => a.path);
    assert.ok(hookPaths.some(p => p.includes('precompact.mjs')));
    assert.ok(hookPaths.some(p => p.includes('session-end.mjs')));
    assert.ok(hookPaths.some(p => p.includes('subagent-start.mjs')));
    assert.ok(hookPaths.some(p => p.includes('task-completed.mjs')));
  });

  it('doctor reports missing new hook files', async () => {
    const { init, doctor } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    // Remove one new hook
    rmSync(join(projectDir, '.claude', 'hooks', 'precompact.mjs'));
    const result = doctor(projectDir);
    assert.ok(!result.healthy);
    assert.ok(result.issues.some(i => i.includes('precompact.mjs')));
  });

  it('check returns hooks=false when new hook missing', async () => {
    const { init, check } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: true });
    rmSync(join(projectDir, '.claude', 'hooks', 'session-end.mjs'));
    const result = check(projectDir);
    assert.equal(result.hooks, false);
  });
});

// ─── session bootstrap ───

describe('session bootstrap', () => {
  it('boot block exists in rules.md', () => {
    const content = readFileSync(join(process.cwd(), 'templates', 'rules.md'), 'utf8');
    assert.ok(content.includes('<!-- PRISM:BOOT -->'));
    assert.ok(content.includes('<!-- PRISM:BOOT:END -->'));
  });

  it('boot block exists in rules-lean.md', () => {
    const content = readFileSync(join(process.cwd(), 'templates', 'rules-lean.md'), 'utf8');
    assert.ok(content.includes('<!-- PRISM:BOOT -->'));
    assert.ok(content.includes('<!-- PRISM:BOOT:END -->'));
  });

  it('boot block references PROJECT-MEMORY.md and HANDOFF.md', () => {
    const content = readFileSync(join(process.cwd(), 'templates', 'rules.md'), 'utf8');
    const bootBlock = content.slice(content.indexOf('<!-- PRISM:BOOT -->'), content.indexOf('<!-- PRISM:BOOT:END -->'));
    assert.ok(bootBlock.includes('PROJECT-MEMORY.md'));
    assert.ok(bootBlock.includes('HANDOFF.md'));
    assert.ok(bootBlock.includes('registry.json'));
  });
});

// ─── plan frontmatter ───

describe('plan frontmatter', () => {
  it('parseFrontmatter parses basic frontmatter', async () => {
    const { parseFrontmatter } = await import('../lib/handoff.mjs');
    const fm = parseFrontmatter('---\nstatus: active\ncreated: 2026-03-05\n---\n# Plan');
    assert.equal(fm.status, 'active');
    assert.equal(fm.created, '2026-03-05');
  });

  it('parseFrontmatter returns empty object when no frontmatter', async () => {
    const { parseFrontmatter } = await import('../lib/handoff.mjs');
    const fm = parseFrontmatter('# Plan\nNo frontmatter here');
    assert.deepEqual(fm, {});
  });

  it('parseFrontmatter parses depends_on array', async () => {
    const { parseFrontmatter } = await import('../lib/handoff.mjs');
    const fm = parseFrontmatter('---\nstatus: active\ndepends_on: ["plan-a.md"]\n---\n# Plan');
    assert.deepEqual(fm.depends_on, ['plan-a.md']);
  });

  it('getAllPlans returns plans with frontmatter merged', async () => {
    const { getAllPlans } = await import('../lib/handoff.mjs');
    const projectDir = mkdtempSync(join(tmpdir(), 'prism-plans-'));
    const plansDir = join(projectDir, '.prism', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(join(plansDir, '2026-03-01-test.md'), '---\nstatus: active\n---\n## Goal\nTest plan\n- [ ] Task 1');
    writeFileSync(join(plansDir, '2026-03-02-done.md'), '---\nstatus: completed\n---\n## Goal\nDone plan\n- [x] Task 1');

    const plans = getAllPlans(projectDir);
    assert.equal(plans.length, 2);
    const active = plans.find(p => p.status === 'active');
    assert.ok(active);
    const completed = plans.find(p => p.status === 'completed');
    assert.ok(completed);

    rmSync(projectDir, { recursive: true, force: true });
  });

  it('getActivePlanInfo filters by active status', async () => {
    const { getActivePlanInfo } = await import('../lib/handoff.mjs');
    const projectDir = mkdtempSync(join(tmpdir(), 'prism-plans-'));
    const plansDir = join(projectDir, '.prism', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(join(plansDir, '2026-03-05-completed.md'), '---\nstatus: completed\n---\n## Goal\nDone\n- [x] Task 1');
    writeFileSync(join(plansDir, '2026-03-01-active.md'), '---\nstatus: active\n---\n## Goal\nActive\n- [ ] Task 1');

    const info = getActivePlanInfo(projectDir);
    assert.ok(info);
    assert.equal(info.planName, '2026-03-01-active.md');

    rmSync(projectDir, { recursive: true, force: true });
  });
});

// ─── docs scaffolding ───

describe('docs scaffolding', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-docs-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('init --docs creates docs structure', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false, docs: true });
    assert.ok(existsSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md')));
    assert.ok(existsSync(join(projectDir, 'docs', 'HANDOFF.md')));
    assert.ok(existsSync(join(projectDir, 'docs', 'reference')));
    assert.ok(existsSync(join(projectDir, 'docs', 'archive')));
  });

  it('init --docs creates registry.json', async () => {
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false, docs: true });
    const registryPath = join(projectDir, '.prism', 'registry.json');
    assert.ok(existsSync(registryPath));
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    assert.ok(registry.session);
    assert.equal(registry.session.handoff, 'docs/HANDOFF.md');
    assert.equal(registry.session.memory, 'docs/PROJECT-MEMORY.md');
  });

  it('init --docs preserves existing files', async () => {
    const { init } = await import('../lib/installer.mjs');
    mkdirSync(join(projectDir, 'docs'), { recursive: true });
    writeFileSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md'), '# Existing Memory\n');
    await init(projectDir, { hooks: false, docs: true });
    const content = readFileSync(join(projectDir, 'docs', 'PROJECT-MEMORY.md'), 'utf8');
    assert.ok(content.includes('Existing Memory'));
  });
});

// ─── cross-plan conflicts ───

describe('cross-plan conflicts', () => {
  it('detects overlapping files across plans', async () => {
    const { detectPlanConflicts } = await import('../lib/handoff.mjs');
    const projectDir = mkdtempSync(join(tmpdir(), 'prism-conflict-'));
    const plansDir = join(projectDir, '.prism', 'plans');
    mkdirSync(plansDir, { recursive: true });

    writeFileSync(join(plansDir, '2026-03-01-plan-a.md'), '---\nstatus: active\n---\n## Files in Scope\n- `src/auth.ts` — changes\n- `src/api.ts` — changes\n');
    writeFileSync(join(plansDir, '2026-03-02-plan-b.md'), '---\nstatus: active\n---\n## Files in Scope\n- `src/auth.ts` — different changes\n- `src/db.ts` — changes\n');

    const conflicts = detectPlanConflicts(projectDir);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].file, 'src/auth.ts');
    assert.equal(conflicts[0].plans.length, 2);

    rmSync(projectDir, { recursive: true, force: true });
  });

  it('returns empty when files do not overlap', async () => {
    const { detectPlanConflicts } = await import('../lib/handoff.mjs');
    const projectDir = mkdtempSync(join(tmpdir(), 'prism-conflict-'));
    const plansDir = join(projectDir, '.prism', 'plans');
    mkdirSync(plansDir, { recursive: true });

    writeFileSync(join(plansDir, '2026-03-01-plan-a.md'), '---\nstatus: active\n---\n## Files in Scope\n- `src/auth.ts` — changes\n');
    writeFileSync(join(plansDir, '2026-03-02-plan-b.md'), '---\nstatus: active\n---\n## Files in Scope\n- `src/db.ts` — changes\n');

    const conflicts = detectPlanConflicts(projectDir);
    assert.equal(conflicts.length, 0);

    rmSync(projectDir, { recursive: true, force: true });
  });
});

// ─── lean mode ───

describe('lean mode', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-lean-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('injects lean rules when rulesMode is lean', async () => {
    // Set up lean config
    const prismDir = join(projectDir, '.prism');
    mkdirSync(prismDir, { recursive: true });
    writeFileSync(join(prismDir, 'config.json'), JSON.stringify({ version: 1, rulesMode: 'lean' }));

    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });

    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Protocol Reference'), 'CLAUDE.md should contain Protocol Reference table');
    assert.ok(content.includes('<!-- PRISM:START -->'), 'Should have PRISM markers');
  });

  it('lean rules are shorter than full rules', async () => {
    const { readFileSync: rfs } = await import('fs');
    const { join: pjoin, dirname: pdir } = await import('path');
    const { fileURLToPath: furl } = await import('url');
    const dir = pdir(furl(import.meta.url));
    const leanContent = rfs(pjoin(dir, '..', 'templates', 'rules-lean.md'), 'utf8');
    const fullContent = rfs(pjoin(dir, '..', 'templates', 'rules.md'), 'utf8');
    assert.ok(leanContent.length < fullContent.length, 'Lean rules should be shorter than full rules');
  });

  it('lean rules contain Scope Guard', async () => {
    const { readFileSync: rfs } = await import('fs');
    const { join: pjoin, dirname: pdir } = await import('path');
    const { fileURLToPath: furl } = await import('url');
    const dir = pdir(furl(import.meta.url));
    const leanContent = rfs(pjoin(dir, '..', 'templates', 'rules-lean.md'), 'utf8');
    assert.ok(leanContent.includes('Scope Guard'), 'Lean rules should contain Scope Guard');
  });

  it('lean rules reference protocol files for on-demand reading', async () => {
    const { readFileSync: rfs } = await import('fs');
    const { join: pjoin, dirname: pdir } = await import('path');
    const { fileURLToPath: furl } = await import('url');
    const dir = pdir(furl(import.meta.url));
    const leanContent = rfs(pjoin(dir, '..', 'templates', 'rules-lean.md'), 'utf8');
    assert.ok(leanContent.includes('.claude/protocols/prism/'), 'Lean rules should reference protocol files');
  });

  it('defaults to lean when rulesMode not set', async () => {
    // No .prism/config.json — defaults apply (lean is the new default)
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { hooks: false });

    const content = readFileSync(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('Protocol Reference'), 'Should contain Protocol Reference (lean mode)');
    assert.ok(content.includes('EUDEC Methodology Framework'), 'Should contain methodology title');
  });
});

// ─── plan lifecycle hook integration ───

describe('plan lifecycle hook integration', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-lifecycle-hook-'));
    mkdirSync(join(projectDir, '.prism', 'plans'), { recursive: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('auto-completes plan when last task is checked', async () => {
    const planFile = '2026-03-06-test.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '---\nstatus: active\ncreated: 2026-03-06\n---\n\n## Batch 1: Test\n- [x] Task one done\n- [ ] Task two implement feature\n');

    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const result = planSync.evaluate(
      { task_subject: 'implement feature for task two' },
      { projectRoot: projectDir }
    );

    assert.ok(result);
    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: completed'), 'Plan should be auto-completed');
    assert.ok(content.includes('completed_at:'), 'Should have completed_at date');
  });

  it('auto-activates draft plan on first task check', async () => {
    const planFile = '2026-03-06-draft.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '---\nstatus: draft\ncreated: 2026-03-06\n---\n\n## Batch 1: Test\n- [ ] Task first implement something\n- [ ] Task second do other thing\n');

    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    const result = planSync.evaluate(
      { task_subject: 'implement something for first task' },
      { projectRoot: projectDir }
    );

    assert.ok(result);
    const content = readFileSync(planPath, 'utf8');
    assert.ok(content.includes('status: active'), 'Draft plan should become active');
  });

  it('records progress milestone at 50%', async () => {
    const planFile = '2026-03-06-progress.md';
    const planPath = join(projectDir, '.prism', 'plans', planFile);
    writeFileSync(planPath, '---\nstatus: active\ncreated: 2026-03-06\n---\n\n## Batch 1: Test\n- [x] Task one done\n- [ ] Task two implement feature\n- [ ] Task three do stuff\n- [ ] Task four finish up\n');

    const { planSync } = await import('../hooks/task-plan-sync.mjs');
    planSync.evaluate(
      { task_subject: 'implement feature for task two' },
      { projectRoot: projectDir }
    );

    const { readHistory } = await import('../lib/plan-lifecycle.mjs');
    const events = readHistory(projectDir, planFile);
    const progressEvents = events.filter(e => e.event === 'progress');
    assert.ok(progressEvents.length > 0, 'Should record progress milestone');
    assert.ok(progressEvents[0].detail.includes('50%'), 'Should be 50% milestone');
  });
});
