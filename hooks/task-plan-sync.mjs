/**
 * claude-prism — TaskCompleted Plan Sync
 * Auto-updates plan file checkboxes when tasks complete
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { dispatchWebhook } from '../lib/webhook.mjs';
import { getMessage } from '../lib/messages.mjs';

export const planSync = {
  name: 'task-plan-sync',

  /**
   * @param {Object} input - { task_id, task_subject, task_description, team_name? }
   * @param {Object} config - Prism config
   * @returns {Object|null} Hook output with additionalContext
   */
  evaluate(input, config) {
    const projectRoot = config.projectRoot || process.cwd();
    const plansDir = join(projectRoot, '.prism', 'plans');

    if (!existsSync(plansDir)) return null;

    const planFiles = readdirSync(plansDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();

    if (planFiles.length === 0) return null;

    const planPath = join(plansDir, planFiles[0]);
    const content = readFileSync(planPath, 'utf8');
    const subject = input.task_subject || '';

    if (!subject) return null;

    // Find matching unchecked task by keyword overlap
    const lines = content.split('\n');
    let matched = false;
    let matchedTask = '';
    let batchDone = 0;
    let batchTotal = 0;
    let currentBatchName = '';
    let matchedBatchName = '';

    for (let i = 0; i < lines.length; i++) {
      // Track batch headers
      const batchMatch = lines[i].match(/^#{1,3}\s+(Batch\s+\d+[:\s]*.+)/i);
      if (batchMatch) {
        // Check if previous batch is now complete
        if (matched && batchTotal > 0) {
          matchedBatchName = currentBatchName;
        }
        currentBatchName = batchMatch[1];
        batchDone = 0;
        batchTotal = 0;
      }

      const checkboxMatch = lines[i].match(/^([-*]\s+)\[ \]\s+(.+)/);
      if (checkboxMatch) {
        batchTotal++;
        const taskText = checkboxMatch[2];

        if (!matched && matchTask(subject, taskText, config.matchThreshold || 0.3)) {
          lines[i] = lines[i].replace('[ ]', '[x]');
          matched = true;
          matchedTask = taskText;
          matchedBatchName = currentBatchName;
          batchDone++; // This one is now done
        }
      } else {
        const doneMatch = lines[i].match(/^[-*]\s+\[x\]/);
        if (doneMatch) {
          batchTotal++;
          batchDone++;
        }
      }
    }

    if (!matched) return null;

    // Write updated plan
    writeFileSync(planPath, lines.join('\n'));

    // Count overall progress
    let total = 0, done = 0;
    for (const line of lines) {
      if (line.match(/^[-*]\s+\[x\]/)) { total++; done++; }
      else if (line.match(/^[-*]\s+\[ \]/)) { total++; }
    }

    // Check if batch is complete
    const batchComplete = batchTotal > 0 && batchDone >= batchTotal;
    if (batchComplete) {
      dispatchWebhook(config, 'batch-complete', {
        batch: matchedBatchName,
        plan: planFiles[0],
        progress: `${done}/${total}`,
      }).catch(() => {});
    }

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      hookSpecificOutput: {
        hookEventName: 'TaskCompleted',
        additionalContext: getMessage('en', 'task-plan-sync.info.updated', {
          task: matchedTask.slice(0, 60),
          done: String(done),
          total: String(total),
          pct: String(pct),
        })
      }
    };
  }
};

/**
 * Match task subject against plan task text using keyword overlap
 * @param {string} subject - Task subject from TaskCompleted event
 * @param {string} taskText - Task text from plan file
 * @param {number} threshold - Minimum overlap ratio (0-1)
 * @returns {boolean}
 */
function matchTask(subject, taskText, threshold) {
  const normalize = (s) => s.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const subjectWords = new Set(normalize(subject));
  const taskWords = normalize(taskText);

  if (subjectWords.size === 0 || taskWords.length === 0) return false;

  let overlap = 0;
  for (const word of taskWords) {
    if (subjectWords.has(word)) overlap++;
  }

  const ratio = overlap / Math.max(subjectWords.size, taskWords.length);
  return ratio >= threshold;
}
