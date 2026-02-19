/**
 * claude-prism — Configuration Loader
 * Reads .claude-prism.json from project root, with defaults
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULTS = {
  sourceExtensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'svelte', 'vue', 'rb', 'kt', 'swift', 'php', 'cs', 'scala', 'ex', 'clj', 'zig', 'lua', 'dart'],
  testPatterns: ['test', 'spec', '_test'],
  customRules: [],
  hooks: {
    'commit-guard': { enabled: true, maxTestAge: 300 },
    'test-tracker': { enabled: true }
  }
};

export function loadConfig(projectRoot) {
  const configPath = join(projectRoot, '.claude-prism.json');

  if (!existsSync(configPath)) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  try {
    const userConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    return deepMerge(DEFAULTS, userConfig);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

export function getHookConfig(hookName, projectRoot) {
  const config = loadConfig(projectRoot);
  const hookConfig = config.hooks?.[hookName] || DEFAULTS.hooks[hookName] || { enabled: true };
  hookConfig.sourceExtensions = config.sourceExtensions || DEFAULTS.sourceExtensions;
  hookConfig.testPatterns = config.testPatterns || DEFAULTS.testPatterns;
  return hookConfig;
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export function buildSourcePattern(extensions) {
  const escaped = extensions.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\.(${escaped.join('|')})$`);
}

export function buildTestPattern(patterns) {
  const escaped = patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\.(${escaped.join('|')})\\.`);
}

export { DEFAULTS };
