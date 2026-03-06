#!/usr/bin/env node
/**
 * CLI-mode runner for TaskCompleted event
 * Installed to .claude/hooks/task-completed.mjs
 */
import { readFileSync } from 'fs';
import { planSync } from '../rules/task-plan-sync.mjs';
import { loadConfig, findProjectRoot } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const projectRoot = findProjectRoot(input.cwd || process.cwd());
  const config = loadConfig(projectRoot);
  config.projectRoot = projectRoot;
  const result = planSync.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  process.exit(0);
}
