#!/usr/bin/env node
/**
 * CLI-mode runner for SessionEnd event
 * Installed to .claude/hooks/session-end.mjs
 */
import { readFileSync } from 'fs';
import { sessionEndHandler } from '../rules/session-end-handler.mjs';
import { loadConfig, findProjectRoot } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const projectRoot = findProjectRoot(input.cwd || process.cwd());
  const config = loadConfig(projectRoot);
  config.projectRoot = projectRoot;
  const result = sessionEndHandler.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  process.exit(0);
}
