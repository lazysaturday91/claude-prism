/**
 * claude-prism — Hook Pipeline
 * Runs multiple rules in a single hook invocation for reduced I/O
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { sanitizeId } from './utils.mjs';
import { loadConfig } from './config.mjs';
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
  'UserPromptSubmit': 'prompt',
};

function parseInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

function toContext(input, hookEventName) {
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
    userPrompt: input.tool_input?.user_prompt ?? undefined,
  };
}

function formatOutput(hookEventName, messages) {
  if (messages.length === 0) return null;
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName,
      additionalContext: messages.join('\n')
    }
  });
}

/**
 * Run a pipeline of rules for a single hook event
 * @param {Array<{name: string, rule: Object}>} rules - Rules with evaluate() methods
 * @param {string} hookEventName - 'PreToolUse' or 'PostToolUse'
 */
export function runPipeline(rules, hookEventName) {
  const input = parseInput();
  if (!input) process.exit(0);

  // Read config ONCE
  const fullConfig = loadConfig(process.cwd());

  const ctx = toContext(input, hookEventName);
  const stateDir = getStateDir(ctx.sessionId, ctx.agentId);

  const messages = [];
  let blocked = false;
  let blockMessage = '';

  for (const { name, rule } of rules) {
    // Build hook-specific config (same as getHookConfig but without re-reading file)
    const hookConfig = fullConfig.hooks?.[name] || { enabled: true };
    hookConfig.language = fullConfig.language || 'en';
    hookConfig.sourceExtensions = fullConfig.sourceExtensions;
    hookConfig.testPatterns = fullConfig.testPatterns;

    if (!hookConfig.enabled) continue;

    const result = rule.evaluate(ctx, hookConfig, stateDir);

    if (result.type === 'block') {
      blocked = true;
      blockMessage = result.message || '🌈 Prism ✋ Action blocked.';
      break; // First block wins, stop pipeline
    }

    if (result.message) {
      messages.push(result.message);
    }
  }

  if (blocked) {
    process.stderr.write(blockMessage);
    process.exit(2);
  }

  const output = formatOutput(hookEventName, messages);
  if (output) {
    process.stdout.write(output);
  }
}

/**
 * Load custom rules from config and merge with built-in rules
 * @param {Array<{name: string, rule: Object}>} builtInRules
 * @param {string[]} customRulePaths - Paths relative to project root
 * @returns {Promise<Array<{name: string, rule: Object}>>}
 */
export async function loadCustomRules(builtInRules, customRulePaths) {
  if (!customRulePaths || customRulePaths.length === 0) return builtInRules;

  const rules = [...builtInRules];
  for (const rulePath of customRulePaths) {
    try {
      const absPath = join(process.cwd(), rulePath);
      const mod = await import(absPath);
      const rule = mod.default || mod[Object.keys(mod)[0]];
      if (rule && typeof rule.evaluate === 'function') {
        rules.push({ name: rule.name || rulePath, rule });
      }
    } catch {
      // Skip invalid rules silently — don't break the pipeline
    }
  }
  return rules;
}

/**
 * Run pipeline with custom rules support (async)
 * @param {Array<{name: string, rule: Object}>} builtInRules
 * @param {string} hookEventName - 'PreToolUse' or 'PostToolUse'
 */
export async function runPipelineAsync(builtInRules, hookEventName) {
  const input = parseInput();
  if (!input) process.exit(0);

  const fullConfig = loadConfig(process.cwd());
  const customRulePaths = fullConfig.customRules || [];
  const rules = await loadCustomRules(builtInRules, customRulePaths);

  const ctx = toContext(input, hookEventName);
  const stateDir = getStateDir(ctx.sessionId, ctx.agentId);

  const messages = [];
  let blocked = false;
  let blockMessage = '';

  for (const { name, rule } of rules) {
    const hookConfig = fullConfig.hooks?.[name] || { enabled: true };
    hookConfig.language = fullConfig.language || 'en';
    hookConfig.sourceExtensions = fullConfig.sourceExtensions;
    hookConfig.testPatterns = fullConfig.testPatterns;

    if (hookConfig.enabled === false) continue;

    const result = rule.evaluate(ctx, hookConfig, stateDir);

    if (result.type === 'block') {
      blocked = true;
      blockMessage = result.message || '🌈 Prism ✋ Action blocked.';
      break;
    }

    if (result.message) {
      messages.push(result.message);
    }
  }

  if (blocked) {
    process.stderr.write(blockMessage);
    process.exit(2);
  }

  const output = formatOutput(hookEventName, messages);
  if (output) {
    process.stdout.write(output);
  }
}
