/**
 * claude-prism — SessionEnd Handler
 * Saves HANDOFF.md and appends session summary to PROJECT-MEMORY.md
 */

import { writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateHandoff, getActivePlanInfo } from '../lib/handoff.mjs';
import { dispatchWebhook } from '../lib/webhook.mjs';

export const sessionEndHandler = {
  name: 'session-end-handler',

  /**
   * @param {Object} input - { session_id, reason }
   * @param {Object} config - Prism config
   * @returns {Object} Empty output (SessionEnd has no visible output)
   */
  evaluate(input, config) {
    const projectRoot = config.projectRoot || process.cwd();

    // 1. Generate HANDOFF.md
    const handoffContent = generateHandoff(projectRoot);
    const docsDir = join(projectRoot, 'docs');
    if (!existsSync(docsDir)) {
      mkdirSync(docsDir, { recursive: true });
    }
    writeFileSync(join(docsDir, 'HANDOFF.md'), handoffContent);

    // 2. Append session summary to PROJECT-MEMORY.md
    const planInfo = getActivePlanInfo(projectRoot);
    const memoryPath = join(docsDir, 'PROJECT-MEMORY.md');
    const date = new Date().toISOString().slice(0, 10);
    let entry = `\n## Session ${date}\n`;
    entry += `- Reason: ${input.reason || 'unknown'}\n`;
    if (planInfo) {
      const pct = planInfo.total > 0 ? Math.round((planInfo.done / planInfo.total) * 100) : 0;
      entry += `- Plan: \`${planInfo.planName}\` — ${planInfo.done}/${planInfo.total} (${pct}%)\n`;
    }
    entry += `- Session ID: ${input.session_id || 'unknown'}\n`;

    if (existsSync(memoryPath)) {
      appendFileSync(memoryPath, entry);
    } else {
      writeFileSync(memoryPath, `# PROJECT-MEMORY\n\nCumulative knowledge across sessions.\n${entry}`);
    }

    // 3. Webhook dispatch
    dispatchWebhook(config, 'session-end', {
      session_id: input.session_id,
      reason: input.reason,
      plan_progress: planInfo ? `${planInfo.done}/${planInfo.total}` : null,
    }).catch(() => {});

    return {};
  }
};
