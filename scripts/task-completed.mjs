#!/usr/bin/env node
/**
 * Plugin-mode runner for TaskCompleted event
 * Auto-updates plan file checkboxes
 */
import { readFileSync } from 'fs';
import { planSync } from '../hooks/task-plan-sync.mjs';
import { loadConfig } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const config = loadConfig(process.cwd());
  const result = planSync.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  process.exit(0);
}
