/**
 * claude-prism — Session Event Logger
 * JSONL-based event recording for session analysis
 */

import { readFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SESSION_ROOT = join(tmpdir(), '.prism', 'sessions');

/**
 * Get session log file path
 */
export function getSessionLogPath(sessionId) {
  mkdirSync(SESSION_ROOT, { recursive: true, mode: 0o700 });
  return join(SESSION_ROOT, `${sessionId}.jsonl`);
}

/**
 * Append an event to the session log
 */
export function logEvent(sessionId, event) {
  const logPath = getSessionLogPath(sessionId);
  const entry = {
    ts: Date.now(),
    ...event
  };
  appendFileSync(logPath, JSON.stringify(entry) + '\n', { mode: 0o600 });
}

/**
 * Read all events from a session log
 */
export function readSessionLog(sessionId) {
  const logPath = getSessionLogPath(sessionId);
  if (!existsSync(logPath)) return [];
  try {
    const content = readFileSync(logPath, 'utf8').trim();
    if (!content) return [];
    return content.split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get session summary from event log
 */
export function getSessionSummary(sessionId) {
  const events = readSessionLog(sessionId);
  if (events.length === 0) return null;

  const summary = {
    sessionId,
    totalEvents: events.length,
    turns: 0,
    filesCreated: 0,
    filesModified: 0,
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0,
    blocks: 0,
    warnings: 0,
    startedAt: events[0]?.ts || null,
    lastEventAt: events[events.length - 1]?.ts || null,
  };

  for (const event of events) {
    switch (event.type) {
      case 'turn':
        summary.turns++;
        break;
      case 'file-edit':
        summary.filesModified++;
        break;
      case 'file-create':
        summary.filesCreated++;
        break;
      case 'test-run':
        summary.testsRun++;
        if (event.passed) summary.testsPassed++;
        else summary.testsFailed++;
        break;
      case 'block':
        summary.blocks++;
        break;
      case 'warn':
        summary.warnings++;
        break;
    }
  }

  return summary;
}

/**
 * List all session log files
 */
export function listSessions() {
  if (!existsSync(SESSION_ROOT)) return [];
  return readdirSync(SESSION_ROOT)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => f.replace('.jsonl', ''))
    .sort();
}
