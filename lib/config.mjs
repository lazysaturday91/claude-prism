/**
 * claude-prism — Configuration Loader
 * Reads .prism/config.json from project root, with defaults
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const DEFAULTS = {
  rulesMode: 'lean',
  sourceExtensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'svelte', 'vue', 'rb', 'kt', 'swift', 'php', 'cs', 'scala', 'ex', 'clj', 'zig', 'lua', 'dart'],
  testPatterns: ['test', 'spec', '_test'],
  customRules: [],
  webhooks: [],
  hooks: {
    'commit-guard': { enabled: true, maxTestAge: 300 },
    'test-tracker': { enabled: true },
    'plan-enforcement': { enabled: true, warnAt: 6 },
    'precompact-handler': { enabled: true },
    'session-end-handler': { enabled: true },
    'subagent-scope-injector': { enabled: true },
    'task-plan-sync': { enabled: true, matchThreshold: 0.3 }
  }
};

/**
 * Search upward from startDir for nearest .prism/config.json
 * @param {string} startDir - Directory to start searching from
 * @returns {string} Project root with .prism/config.json, or startDir as fallback
 */
export function findProjectRoot(startDir) {
  let current = startDir;
  while (current !== dirname(current)) {
    if (existsSync(join(current, '.prism', 'config.json'))) return current;
    current = dirname(current);
  }
  return startDir;
}

export function loadConfig(projectRoot) {
  const configPath = join(projectRoot, '.prism', 'config.json');

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

export function getRulesMode(projectRoot) {
  const config = loadConfig(projectRoot);
  return config.rulesMode === 'lean' ? 'lean' : 'full';
}

export { DEFAULTS };
