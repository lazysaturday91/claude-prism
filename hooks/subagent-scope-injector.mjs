/**
 * claude-prism — SubagentStart Scope Injector
 * Injects current plan batch context into subagent
 */

import { getMessage } from '../lib/messages.mjs';
import { getActivePlanInfo } from '../lib/handoff.mjs';

export const scopeInjector = {
  name: 'subagent-scope-injector',

  /**
   * @param {Object} input - { session_id, agent_id, agent_type }
   * @param {Object} config - Prism config
   * @returns {Object|null} Hook output with additionalContext or null
   */
  evaluate(input, config) {
    const projectRoot = config.projectRoot || process.cwd();
    const planInfo = getActivePlanInfo(projectRoot);

    if (!planInfo || planInfo.total === 0) {
      return null;
    }

    const pct = Math.round((planInfo.done / planInfo.total) * 100);
    const parts = [
      `Plan: ${planInfo.planName} (${planInfo.done}/${planInfo.total}, ${pct}%)`
    ];

    if (planInfo.nextBatch) {
      parts.push(`Current batch: ${planInfo.nextBatch}`);
    }

    if (planInfo.currentBatchFiles && planInfo.currentBatchFiles.length > 0) {
      const uniqueFiles = [...new Set(planInfo.currentBatchFiles)].slice(0, 10);
      parts.push(`Files in scope: ${uniqueFiles.join(', ')}`);
    }

    if (planInfo.nextTasks.length > 0) {
      parts.push('Tasks:');
      for (const task of planInfo.nextTasks.slice(0, 3)) {
        parts.push(`  - ${task}`);
      }
    }

    return {
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: getMessage('en', 'subagent-scope-injector.info.scope') + '\n' + parts.join('\n')
      }
    };
  }
};
