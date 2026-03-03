#!/usr/bin/env node
/**
 * Plugin-mode runner for SubagentStart event
 * Injects current plan scope into subagent context
 */
import { readFileSync } from 'fs';
import { scopeInjector } from '../hooks/subagent-scope-injector.mjs';
import { loadConfig } from '../lib/config.mjs';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const config = loadConfig(process.cwd());
  const result = scopeInjector.evaluate(input, config);
  if (result) {
    process.stdout.write(JSON.stringify(result));
  }
} catch (e) {
  process.exit(0);
}
