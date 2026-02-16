/**
 * claude-prism — Claude Code Adapter
 * Translates between Claude Code hook protocol and prism rules
 */

import { readFileSync } from 'fs';
import { sanitizeId } from './utils.mjs';
import { getHookConfig } from './config.mjs';
import { getStateDir } from './state.mjs';

const TOOL_ACTION_MAP = {
  'Edit': 'edit',
  'Write': 'write',
  'Bash': 'command',
  'Read': 'read',
  'Task': 'subagent',
};

const EVENT_PHASE_MAP = {
  'PreToolUse': 'pre',
  'PostToolUse': 'post',
};

export function parseInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

export function toContext(input, hookEventName) {
  const toolName = input.tool_name || '';
  return {
    action: TOOL_ACTION_MAP[toolName] || toolName.toLowerCase(),
    phase: EVENT_PHASE_MAP[hookEventName] || 'pre',
    filePath: input.tool_input?.file_path || undefined,
    command: input.tool_input?.command || undefined,
    oldString: input.tool_input?.old_string || undefined,
    sessionId: sanitizeId(input.session_id),
    agentId: sanitizeId(input.agent_id || ''),
    stdout: input.tool_response?.stdout ?? undefined,
    stderr: input.tool_response?.stderr ?? undefined,
    interrupted: input.tool_response?.interrupted ?? false,
  };
}

export function formatOutput(hookEventName, result) {
  if (result.type === 'pass' && !result.message) return null;

  const parts = [];
  if (result.message) parts.push(result.message);
  if (parts.length === 0) return null;

  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName,
      additionalContext: parts.join('\n')
    }
  });
}

/**
 * Run a hook rule via Claude Code protocol
 * @param {string} ruleName
 * @param {string} hookEventName
 * @param {Object} rule - Rule with evaluate() method
 */
export function runHook(ruleName, hookEventName, rule) {
  const config = getHookConfig(ruleName, process.cwd());
  if (!config.enabled) process.exit(0);

  const input = parseInput();
  if (!input) process.exit(0);

  const ctx = toContext(input, hookEventName);
  const stateDir = getStateDir(ctx.sessionId, ctx.agentId);
  const result = rule.evaluate(ctx, config, stateDir);

  if (result.type === 'block') {
    process.stderr.write(result.message || '🌈 Prism ✋ Action blocked.');
    process.exit(2);
  }

  const output = formatOutput(hookEventName, result);
  if (output) {
    process.stdout.write(output);
  }
}
