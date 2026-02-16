/**
 * claude-prism — adapter tests
 * Protocol translation: Claude Code JSON ↔ hook evaluation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('adapter', () => {
  it('toContext maps Edit tool to correct context', async () => {
    const { toContext } = await import('../lib/adapter.mjs');
    const input = {
      tool_name: 'Edit',
      tool_input: { file_path: 'src/app.ts', old_string: 'const x = 1' },
      session_id: 'sess-123',
      agent_id: 'agent-abc'
    };
    const ctx = toContext(input, 'PostToolUse');
    assert.equal(ctx.action, 'edit');
    assert.equal(ctx.phase, 'post');
    assert.equal(ctx.filePath, 'src/app.ts');
    assert.equal(ctx.oldString, 'const x = 1');
    assert.equal(ctx.sessionId, 'sess-123');
  });

  it('toContext maps Bash tool with command', async () => {
    const { toContext } = await import('../lib/adapter.mjs');
    const input = {
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "feat: add auth"' },
      session_id: 'sess-123'
    };
    const ctx = toContext(input, 'PreToolUse');
    assert.equal(ctx.action, 'command');
    assert.equal(ctx.phase, 'pre');
    assert.equal(ctx.command, 'git commit -m "feat: add auth"');
  });

  it('toContext handles missing fields gracefully', async () => {
    const { toContext } = await import('../lib/adapter.mjs');
    const input = { tool_name: 'Read', session_id: 'sess-1' };
    const ctx = toContext(input, 'PreToolUse');
    assert.equal(ctx.action, 'read');
    assert.equal(ctx.filePath, undefined);
    assert.equal(ctx.command, undefined);
  });

  it('toContext sanitizes session and agent IDs', async () => {
    const { toContext } = await import('../lib/adapter.mjs');
    const input = {
      tool_name: 'Edit',
      session_id: '../../../etc/passwd',
      agent_id: 'good-id'
    };
    const ctx = toContext(input, 'PreToolUse');
    assert.equal(ctx.sessionId, 'etcpasswd');
    assert.equal(ctx.agentId, 'good-id');
  });

  it('toContext extracts tool_response fields for PostToolUse', async () => {
    const { toContext } = await import('../lib/adapter.mjs');
    const input = {
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      tool_response: { stdout: 'all pass', stderr: '', interrupted: false },
      session_id: 'sess-123'
    };
    const ctx = toContext(input, 'PostToolUse');
    assert.equal(ctx.stdout, 'all pass');
    assert.equal(ctx.stderr, '');
    assert.equal(ctx.interrupted, false);
  });

  it('toContext defaults tool_response fields when absent', async () => {
    const { toContext } = await import('../lib/adapter.mjs');
    const input = { tool_name: 'Bash', session_id: 'sess-1' };
    const ctx = toContext(input, 'PreToolUse');
    assert.equal(ctx.stdout, undefined);
    assert.equal(ctx.stderr, undefined);
    assert.equal(ctx.interrupted, false);
  });

  it('formatOutput creates correct JSON for warn', async () => {
    const { formatOutput } = await import('../lib/adapter.mjs');
    const result = { type: 'warn', message: 'test warning' };
    const output = formatOutput('PreToolUse', result);
    const parsed = JSON.parse(output);
    assert.equal(parsed.hookSpecificOutput.hookEventName, 'PreToolUse');
    assert.ok(parsed.hookSpecificOutput.additionalContext.includes('test warning'));
  });

  it('formatOutput returns null for pass with no message', async () => {
    const { formatOutput } = await import('../lib/adapter.mjs');
    const result = { type: 'pass' };
    const output = formatOutput('PreToolUse', result);
    assert.equal(output, null);
  });
});
