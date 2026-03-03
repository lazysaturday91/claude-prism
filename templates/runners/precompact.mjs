#!/usr/bin/env node
/**
 * CLI-mode runner for PreCompact event
 * Installed to .claude/hooks/precompact.mjs
 */
import { readFileSync } from 'fs';
import { precompactHandler } from '../rules/precompact-handler.mjs';
import { loadConfig } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const config = loadConfig(process.cwd());
  const result = precompactHandler.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  process.exit(0);
}
