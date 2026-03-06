/**
 * claude-prism — Plan Progress Tracker
 * PostToolUse rule: tracks file-level progress against active plan's "Files in Scope"
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { readJsonState, writeJsonState } from '../lib/state.mjs';
import { parseScopedFiles, ensureFrontmatter, updatePlanStatus, appendHistory } from '../lib/plan-lifecycle.mjs';
import { parseFrontmatter } from '../lib/handoff.mjs';

export const planProgressTracker = {
  name: 'plan-progress-tracker',

  /**
   * @param {Object} ctx - { action, filePath, ... }
   * @param {Object} config - Prism config (projectRoot, hooks settings)
   * @param {string} stateDir - Session state directory
   * @returns {{ type: string, message?: string }}
   */
  evaluate(ctx, config, stateDir) {
    // Only process Edit/Write actions
    if (ctx.action !== 'edit' && ctx.action !== 'write') return { type: 'pass' };
    if (!ctx.filePath) return { type: 'pass' };

    const projectRoot = config.projectRoot || process.cwd();

    // Find most recent active/draft plan
    const plan = findActivePlan(projectRoot);
    if (!plan) return { type: 'pass' };

    // Parse "Files in Scope" → check if edited file is in scope
    const scopedFiles = parseScopedFiles(plan.content);
    if (scopedFiles.length === 0) return { type: 'pass' };

    const relativePath = relative(projectRoot, ctx.filePath);
    const inScope = scopedFiles.some(f =>
      relativePath === f || relativePath.endsWith(f) || f.endsWith(relativePath)
    );
    if (!inScope) return { type: 'pass' };

    // Accumulate touched files in session state
    const state = readJsonState(stateDir, 'plan-progress') || { touched: [], recordedMilestones: [] };
    if (!state.recordedMilestones) state.recordedMilestones = [];
    if (!state.touched.includes(relativePath)) {
      state.touched.push(relativePath);
    }

    // Ensure frontmatter exists (auto-backfill if missing)
    try {
      ensureFrontmatter(plan.path, plan.content);
    } catch { /* should not break the hook */ }

    // Calculate progress
    const pct = Math.floor((state.touched.length / scopedFiles.length) * 100);
    const fm = plan.frontmatter;
    const planStatus = fm.status || 'active';

    // draft → active (first scoped file edit)
    if (planStatus === 'draft') {
      try {
        updatePlanStatus(plan.path, 'active');
        appendHistory(projectRoot, {
          plan: plan.name, event: 'status_change',
          from: 'draft', to: 'active',
          actor: 'hook:plan-progress-tracker',
          detail: 'First scoped file edited'
        });
      } catch { /* lifecycle errors should not break the hook */ }
    }

    // Progress milestones (25%, 50%, 75%)
    for (const m of [25, 50, 75]) {
      if (pct >= m && !state.recordedMilestones.includes(m)) {
        state.recordedMilestones.push(m);
        try {
          appendHistory(projectRoot, {
            plan: plan.name, event: 'progress',
            actor: 'hook:plan-progress-tracker',
            detail: `Progress: ${state.touched.length}/${scopedFiles.length} (${pct}%)`
          });
        } catch { /* ignore */ }
      }
    }

    // Save state
    writeJsonState(stateDir, 'plan-progress', state);

    return {
      type: 'info',
      message: `🌈 Plan progress: ${state.touched.length}/${scopedFiles.length} files (${pct}%) — ${plan.name}`
    };
  }
};

/**
 * Find the most recent active or draft plan in .prism/plans/
 * @param {string} projectRoot
 * @returns {{ name: string, path: string, content: string, frontmatter: Object }|null}
 */
function findActivePlan(projectRoot) {
  const plansDir = join(projectRoot, '.prism', 'plans');
  if (!existsSync(plansDir)) return null;

  let files;
  try {
    files = readdirSync(plansDir).filter(f => f.endsWith('.md')).sort().reverse();
  } catch { return null; }

  for (const f of files) {
    const path = join(plansDir, f);
    let content;
    try { content = readFileSync(path, 'utf8'); } catch { continue; }
    const fm = parseFrontmatter(content);
    const status = fm.status || 'active';
    if (status === 'active' || status === 'draft') {
      return { name: f, path, content, frontmatter: fm };
    }
  }
  return null;
}
