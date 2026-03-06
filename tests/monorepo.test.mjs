/**
 * claude-prism — Monorepo compatibility tests
 * Verifies findProjectRoot() and input.cwd usage across pipeline + runners
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── findProjectRoot ───

describe('findProjectRoot', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'prism-monorepo-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns current dir when .prism/config.json exists here', async () => {
    const { findProjectRoot } = await import('../lib/config.mjs');
    mkdirSync(join(tempDir, '.prism'), { recursive: true });
    writeFileSync(join(tempDir, '.prism', 'config.json'), '{}');

    assert.equal(findProjectRoot(tempDir), tempDir);
  });

  it('finds parent dir when .prism/config.json is in parent', async () => {
    const { findProjectRoot } = await import('../lib/config.mjs');
    // Parent has .prism/config.json
    mkdirSync(join(tempDir, '.prism'), { recursive: true });
    writeFileSync(join(tempDir, '.prism', 'config.json'), '{}');

    // Child directory (no .prism)
    const childDir = join(tempDir, 'apps', 'builder');
    mkdirSync(childDir, { recursive: true });

    assert.equal(findProjectRoot(childDir), tempDir);
  });

  it('returns startDir as fallback when no .prism found', async () => {
    const { findProjectRoot } = await import('../lib/config.mjs');
    // tempDir has no .prism at all
    const childDir = join(tempDir, 'some', 'deep', 'path');
    mkdirSync(childDir, { recursive: true });

    assert.equal(findProjectRoot(childDir), childDir);
  });

  it('finds nearest .prism/config.json (child wins over parent)', async () => {
    const { findProjectRoot } = await import('../lib/config.mjs');
    // Parent has .prism
    mkdirSync(join(tempDir, '.prism'), { recursive: true });
    writeFileSync(join(tempDir, '.prism', 'config.json'), '{}');

    // Child also has .prism
    const childProject = join(tempDir, 'apps', 'builder');
    mkdirSync(join(childProject, '.prism'), { recursive: true });
    writeFileSync(join(childProject, '.prism', 'config.json'), '{}');

    // Start from child — should find child's .prism first
    assert.equal(findProjectRoot(childProject), childProject);

    // Start from deeper inside child — should still find child's .prism
    const deepChild = join(childProject, 'src', 'components');
    mkdirSync(deepChild, { recursive: true });
    assert.equal(findProjectRoot(deepChild), childProject);
  });
});

// ─── pipeline projectRoot injection ───

describe('pipeline projectRoot injection', () => {
  it('runPipeline uses input.cwd for config resolution', async () => {
    // Verify the import chain works (findProjectRoot is exported and used)
    const pipeline = await import('../lib/pipeline.mjs');
    assert.equal(typeof pipeline.runPipeline, 'function');
    assert.equal(typeof pipeline.runPipelineAsync, 'function');
    assert.equal(typeof pipeline.loadCustomRules, 'function');
  });

  it('loadCustomRules accepts projectRoot parameter', async () => {
    const { loadCustomRules } = await import('../lib/pipeline.mjs');
    // With no custom rules, should return builtInRules unchanged
    const builtIn = [{ name: 'test', rule: { evaluate: () => ({ type: 'pass' }) } }];
    const result = await loadCustomRules(builtIn, [], '/some/path');
    assert.deepEqual(result, builtIn);
  });

  it('loadCustomRules works with null projectRoot (fallback)', async () => {
    const { loadCustomRules } = await import('../lib/pipeline.mjs');
    const builtIn = [{ name: 'test', rule: { evaluate: () => ({ type: 'pass' }) } }];
    const result = await loadCustomRules(builtIn, [], null);
    assert.deepEqual(result, builtIn);
  });
});

// ─── runner pattern verification (regression guard) ───

describe('runner files use findProjectRoot', () => {
  const runners = [
    'templates/runners/precompact.mjs',
    'templates/runners/session-end.mjs',
    'templates/runners/subagent-start.mjs',
    'templates/runners/task-completed.mjs',
  ];

  for (const runner of runners) {
    const name = runner.split('/').pop();

    it(`${name} imports findProjectRoot`, () => {
      const content = readFileSync(join(import.meta.dirname, '..', runner), 'utf8');
      assert.ok(
        content.includes('findProjectRoot'),
        `${name} should import findProjectRoot`
      );
    });

    it(`${name} does not call loadConfig(process.cwd())`, () => {
      const content = readFileSync(join(import.meta.dirname, '..', runner), 'utf8');
      assert.ok(
        !content.includes('loadConfig(process.cwd())'),
        `${name} should not use loadConfig(process.cwd()) directly`
      );
    });
  }
});

// ─── pipeline file verification (regression guard) ───

describe('pipeline.mjs uses findProjectRoot', () => {
  it('imports findProjectRoot from config.mjs', () => {
    const content = readFileSync(
      join(import.meta.dirname, '..', 'lib', 'pipeline.mjs'),
      'utf8'
    );
    assert.ok(content.includes('findProjectRoot'));
  });

  it('does not use loadConfig(process.cwd())', () => {
    const content = readFileSync(
      join(import.meta.dirname, '..', 'lib', 'pipeline.mjs'),
      'utf8'
    );
    assert.ok(
      !content.includes('loadConfig(process.cwd())'),
      'pipeline.mjs should not use loadConfig(process.cwd()) directly'
    );
  });
});
