/**
 * claude-prism — PreCompact Handler
 * Auto-generates HANDOFF.md before context compaction
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateHandoff } from '../lib/handoff.mjs';
import { dispatchWebhook } from '../lib/webhook.mjs';
import { getMessage } from '../lib/messages.mjs';

export const precompactHandler = {
  name: 'precompact-handler',

  /**
   * @param {Object} input - { session_id, trigger, custom_instructions }
   * @param {Object} config - Prism config
   * @returns {Object} Hook output with additionalContext
   */
  evaluate(input, config) {
    const projectRoot = config.projectRoot || process.cwd();

    // Generate HANDOFF.md
    const handoffContent = generateHandoff(projectRoot);
    const docsDir = join(projectRoot, 'docs');
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true });
    }
    writeFileSync(join(docsDir, 'HANDOFF.md'), handoffContent);

    // Webhook dispatch (fire-and-forget)
    dispatchWebhook(config, 'compaction', {
      session_id: input.session_id,
      trigger: input.trigger || 'auto',
    }).catch(() => {});

    return {
      hookSpecificOutput: {
        hookEventName: 'PreCompact',
        additionalContext: getMessage('en', 'precompact-handler.info.saved')
      }
    };
  }
};
