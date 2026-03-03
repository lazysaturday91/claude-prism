#!/usr/bin/env node
/**
 * Plugin-mode runner for PreCompact event
 * Generates HANDOFF.md before context compaction
 */
import { readFileSync } from 'fs';
import { precompactHandler } from '../hooks/precompact-handler.mjs';
import { loadConfig } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const config = loadConfig(process.cwd());
  const result = precompactHandler.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  // Silent fail — hooks should never break the session
  process.exit(0);
}
