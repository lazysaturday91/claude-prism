/**
 * claude-prism — State Management
 * File-based state storage for hook evaluation
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const STATE_ROOT = join(tmpdir(), '.prism');

export function getStateDir(sessionId, agentId) {
  const key = agentId && agentId !== 'default' ? `${sessionId}-${agentId}` : sessionId;
  const dir = join(STATE_ROOT, key);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function readState(stateDir, key) {
  const file = join(stateDir, key);
  if (!existsSync(file)) return null;
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function writeState(stateDir, key, value) {
  writeFileSync(join(stateDir, key), value, { mode: 0o600 });
}

export function readJsonState(stateDir, key) {
  const raw = readState(stateDir, key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeJsonState(stateDir, key, value) {
  writeState(stateDir, key, JSON.stringify(value));
}

export function incrementCounter(stateDir, key) {
  const current = parseInt(readState(stateDir, key) || '0', 10) || 0;
  const next = current + 1;
  writeState(stateDir, key, String(next));
  return next;
}
