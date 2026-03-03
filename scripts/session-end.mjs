#!/usr/bin/env node
/**
 * Plugin-mode runner for SessionEnd event
 * Saves HANDOFF.md and appends to PROJECT-MEMORY.md
 */
import { readFileSync } from 'fs';
import { sessionEndHandler } from '../hooks/session-end-handler.mjs';
import { loadConfig } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const config = loadConfig(process.cwd());
  const result = sessionEndHandler.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  process.exit(0);
}
