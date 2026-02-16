/**
 * claude-prism — Configuration Loader
 * Reads .claude-prism.json from project root, with defaults
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULTS = {
  language: 'en',
  hooks: {
    'commit-guard': { enabled: true, maxTestAge: 300 },
    'debug-loop': { enabled: true, warnAt: 3, blockAt: 5 },
    'test-tracker': { enabled: true },
    'scope-guard': { enabled: true, warnAt: 4, blockAt: 7, agentWarnAt: 8, agentBlockAt: 12 }
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
  return config.hooks?.[hookName] || DEFAULTS.hooks[hookName] || { enabled: true };
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

export { DEFAULTS };
