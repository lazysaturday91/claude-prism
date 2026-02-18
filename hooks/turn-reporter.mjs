/**
 * claude-prism — Turn Reporter
 * UserPromptSubmit hook: tracks turns, injects previous turn summary
 */

import { readState, writeState, readJsonState, writeJsonState } from '../lib/state.mjs';
import { getMessage } from '../lib/messages.mjs';

export const turnReporter = {
  name: 'turn-reporter',

  evaluate(ctx, config, stateDir) {
    // Increment turn counter
    const prevTurn = parseInt(readState(stateDir, 'turn-count') || '0', 10) || 0;
    const turnNumber = prevTurn + 1;
    writeState(stateDir, 'turn-count', String(turnNumber));

    // Read previous turn actions (recorded by post-tool pipeline)
    const prevActions = readJsonState(stateDir, 'turn-actions') || [];
    // Reset actions for new turn
    writeJsonState(stateDir, 'turn-actions', []);

    // Check autonomous run length
    const autoTurns = parseInt(readState(stateDir, 'auto-turns') || '0', 10) || 0;
    if (ctx.userPrompt) {
      // User input detected — reset auto counter
      writeState(stateDir, 'auto-turns', '0');
    } else {
      // Autonomous turn
      const newAutoTurns = autoTurns + 1;
      writeState(stateDir, 'auto-turns', String(newAutoTurns));

      if (newAutoTurns >= (config.silentTurnsWarning || 5)) {
        const scopeFiles = readJsonState(stateDir, 'scope-files') || [];
        return {
          type: 'warn',
          message: `🌈 Prism ⏰ ${newAutoTurns} turns without user input. Files changed: ${scopeFiles.length}. Report progress before continuing.`
        };
      }
    }

    // Build previous turn summary if there were actions
    if (prevActions.length === 0) return { type: 'pass' };

    const fileActions = prevActions.filter(a => a.type === 'file-edit' || a.type === 'file-create');
    const testActions = prevActions.filter(a => a.type === 'test-run');
    const blockActions = prevActions.filter(a => a.type === 'block');

    const parts = [`🌈 Prism Turn #${turnNumber - 1}:`];
    if (fileActions.length > 0) {
      const names = [...new Set(fileActions.map(a => a.file))].slice(0, 5);
      parts.push(`Files: ${names.join(', ')}${fileActions.length > 5 ? ` +${fileActions.length - 5} more` : ''}`);
    }
    if (testActions.length > 0) {
      const passed = testActions.filter(a => a.passed).length;
      const failed = testActions.length - passed;
      parts.push(`Tests: ${passed} passed${failed > 0 ? `, ${failed} failed` : ''}`);
    }
    if (blockActions.length > 0) {
      parts.push(`Blocks: ${blockActions.length}`);
    }

    if (parts.length <= 1) return { type: 'pass' };

    return {
      type: 'pass',
      message: parts.join(' | ')
    };
  }
};
