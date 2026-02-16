/**
 * claude-prism — OMC integration tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── OMC detection ───

describe('omc detection', () => {
  let fakeHome;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'prism-omc-'));
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('detects OMC when CLAUDE.md has OMC:START marker', async () => {
    const { detectOmc } = await import('../lib/omc.mjs');
    mkdirSync(join(fakeHome, '.claude'), { recursive: true });
    writeFileSync(join(fakeHome, '.claude', 'CLAUDE.md'),
      '<!-- OMC:START -->\n# oh-my-claudecode\n<!-- OMC:END -->\n');
    const result = detectOmc(fakeHome);
    assert.ok(result.detected);
  });

  it('returns false when no OMC markers', async () => {
    const { detectOmc } = await import('../lib/omc.mjs');
    mkdirSync(join(fakeHome, '.claude'), { recursive: true });
    writeFileSync(join(fakeHome, '.claude', 'CLAUDE.md'), '# Custom rules\n');
    const result = detectOmc(fakeHome);
    assert.equal(result.detected, false);
  });

  it('returns false when .claude dir missing', async () => {
    const { detectOmc } = await import('../lib/omc.mjs');
    const result = detectOmc(fakeHome);
    assert.equal(result.detected, false);
  });

  it('extracts OMC version from CLAUDE.md', async () => {
    const { detectOmc } = await import('../lib/omc.mjs');
    mkdirSync(join(fakeHome, '.claude'), { recursive: true });
    writeFileSync(join(fakeHome, '.claude', 'CLAUDE.md'),
      '<!-- OMC:START -->\n### All 30 Unified Agents (v4.1.1)\n<!-- OMC:END -->\n');
    const result = detectOmc(fakeHome);
    assert.ok(result.detected);
    assert.equal(result.version, '4.1.1');
  });
});

// ─── doctor with OMC ───

describe('doctor OMC integration', () => {
  let projectDir;
  let fakeHome;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-omc-'));
    fakeHome = mkdtempSync(join(tmpdir(), 'prism-home-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { language: 'en', hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('doctor reports OMC detected when present', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    mkdirSync(join(fakeHome, '.claude'), { recursive: true });
    writeFileSync(join(fakeHome, '.claude', 'CLAUDE.md'),
      '<!-- OMC:START -->\n# omc\n<!-- OMC:END -->\n');
    const result = doctor(projectDir, { homeDir: fakeHome });
    assert.ok(result.omc);
    assert.ok(result.omc.detected);
  });

  it('doctor reports OMC not detected when absent', async () => {
    const { doctor } = await import('../lib/installer.mjs');
    const result = doctor(projectDir, { homeDir: fakeHome });
    assert.equal(result.omc.detected, false);
  });
});

// ─── stats with OMC ───

describe('stats OMC integration', () => {
  let projectDir;
  let fakeHome;

  beforeEach(async () => {
    projectDir = mkdtempSync(join(tmpdir(), 'prism-omc-'));
    fakeHome = mkdtempSync(join(tmpdir(), 'prism-home-'));
    writeFileSync(join(projectDir, 'CLAUDE.md'), '# Project\n');
    const { init } = await import('../lib/installer.mjs');
    await init(projectDir, { language: 'en', hooks: true });
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('stats includes OMC info when detected', async () => {
    const { stats } = await import('../lib/installer.mjs');
    mkdirSync(join(fakeHome, '.claude'), { recursive: true });
    writeFileSync(join(fakeHome, '.claude', 'CLAUDE.md'),
      '<!-- OMC:START -->\n### All 30 Unified Agents (v4.1.1)\n<!-- OMC:END -->\n');
    const result = stats(projectDir, { homeDir: fakeHome });
    assert.ok(result.omc);
    assert.ok(result.omc.detected);
    assert.equal(result.omc.version, '4.1.1');
  });
});

// ─── scope-guard agent awareness ───

describe('scope-guard agent awareness', () => {
  let stateDir;

  beforeEach(() => {
    stateDir = mkdtempSync(join(tmpdir(), 'prism-hook-'));
  });

  afterEach(() => {
    rmSync(stateDir, { recursive: true, force: true });
  });

  it('uses higher thresholds when agentId indicates sub-agent', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const config = { warnAt: 4, blockAt: 7, agentWarnAt: 8, agentBlockAt: 12 };

    // Simulate sub-agent editing many files
    for (let i = 0; i < 6; i++) {
      scopeGuard.evaluate(
        { filePath: `src/f${i}.ts`, agentId: 'sub-agent-123' },
        config, stateDir
      );
    }
    // 7th file — would block normally, but agent mode should pass
    const result = scopeGuard.evaluate(
      { filePath: 'src/f6.ts', agentId: 'sub-agent-123' },
      config, stateDir
    );
    assert.equal(result.type, 'pass');
  });

  it('uses normal thresholds when no agentId', async () => {
    const { scopeGuard } = await import('../hooks/scope-guard.mjs');
    const config = { warnAt: 4, blockAt: 7, agentWarnAt: 8, agentBlockAt: 12 };

    for (let i = 0; i < 6; i++) {
      scopeGuard.evaluate({ filePath: `src/f${i}.ts` }, config, stateDir);
    }
    const result = scopeGuard.evaluate({ filePath: 'src/f6.ts' }, config, stateDir);
    assert.equal(result.type, 'block');
  });
});
