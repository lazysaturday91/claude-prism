/**
 * claude-prism — Plan Lifecycle Management
 * State machine, status transitions, and history logging for plan files
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseFrontmatter, getAllPlans, parsePlanContent } from './handoff.mjs';

// Valid state transitions
export const TRANSITIONS = {
  draft:     ['active', 'blocked', 'abandoned'],
  active:    ['completed', 'blocked', 'abandoned'],
  blocked:   ['active', 'abandoned'],
  completed: ['archived', 'active'],  // active = reopen
  // archived, abandoned = terminal (no transitions)
};

export const STATUS_ICONS = {
  draft: '📝', active: '📋', blocked: '🚫',
  completed: '✅', archived: '📦', abandoned: '🗑️'
};

/**
 * Check if a status transition is valid
 * @param {string} from - Current status (null/undefined treated as 'active' for backward compat)
 * @param {string} to - Target status
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateTransition(from, to) {
  const fromStatus = from || 'active';
  const allowed = TRANSITIONS[fromStatus];
  if (!allowed) return { valid: false, reason: `Terminal status: ${fromStatus}` };
  if (!allowed.includes(to)) return { valid: false, reason: `${fromStatus} → ${to} not allowed` };
  return { valid: true };
}

/**
 * Update a plan file's frontmatter status
 * @param {string} planPath - Absolute path to plan file
 * @param {string} newStatus - Target status
 * @param {Object} extra - Additional frontmatter fields to set
 * @returns {{ success: boolean, oldStatus: string, newStatus: string, error?: string }}
 */
export function updatePlanStatus(planPath, newStatus, extra = {}) {
  const content = readFileSync(planPath, 'utf8');
  const fm = parseFrontmatter(content);
  const oldStatus = fm.status || 'active';

  const validation = validateTransition(oldStatus, newStatus);
  if (!validation.valid) return { success: false, oldStatus, newStatus, error: validation.reason };

  // Build updated frontmatter fields
  const fields = { ...fm, status: newStatus, ...extra };

  // Remove fields explicitly set to null (e.g., removing blocked_reason on unblock)
  for (const [k, v] of Object.entries(extra)) {
    if (v === null) delete fields[k];
  }

  const fmStr = Object.entries(fields)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? JSON.stringify(v) : v}`)
    .join('\n');

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let newContent;
  if (fmMatch) {
    newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${fmStr}\n---`);
  } else {
    newContent = `---\n${fmStr}\n---\n\n${content}`;
  }

  writeFileSync(planPath, newContent);
  return { success: true, oldStatus, newStatus };
}

/**
 * Append an event to the plan history log
 * @param {string} projectRoot - Project root directory
 * @param {Object} event - Event data (plan, event type, from, to, actor, detail)
 */
export function appendHistory(projectRoot, event) {
  const dir = join(projectRoot, '.prism', 'plans');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const historyPath = join(dir, '.history.jsonl');
  const entry = { ts: new Date().toISOString(), ...event };
  appendFileSync(historyPath, JSON.stringify(entry) + '\n');
}

/**
 * Read plan history events
 * @param {string} projectRoot - Project root directory
 * @param {string} [planFile] - Optional filter by plan filename
 * @returns {Array<Object>} History events
 */
export function readHistory(projectRoot, planFile) {
  const historyPath = join(projectRoot, '.prism', 'plans', '.history.jsonl');
  if (!existsSync(historyPath)) return [];
  const lines = readFileSync(historyPath, 'utf8').trim().split('\n').filter(Boolean);
  const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (planFile) return events.filter(e => e.plan === planFile);
  return events;
}

/**
 * Resolve a plan by name or find the most recent active plan
 * @param {string} projectRoot - Project root directory
 * @param {string} [planName] - Optional plan filename or partial match
 * @returns {Object|null} Plan object or null
 */
export function resolvePlan(projectRoot, planName) {
  const plans = getAllPlans(projectRoot);
  if (!plans.length) return null;
  if (planName) {
    const match = plans.find(p => p.file === planName || p.file.includes(planName));
    if (match) return match;
  }
  // Default: most recent active plan
  return plans.find(p => (p.status || 'active') === 'active') || plans[0];
}

// ─── Scoped Files & Frontmatter Helpers ───

/**
 * Parse "Files in Scope" section from plan content
 * Extracts backtick-wrapped file paths (e.g., `path/to/file.ts`)
 * @param {string} content - Plan markdown content
 * @returns {string[]} File paths extracted
 */
export function parseScopedFiles(content) {
  const section = content.match(/##\s+Files\s+in\s+Scope\s*\n([\s\S]*?)(?=\n##|\n---|\s*$)/i);
  if (!section) return [];
  return [...section[1].matchAll(/`([^`]+\.[a-z]+)`/g)].map(m => m[1]);
}

/**
 * Ensure a plan file has frontmatter; add if missing
 * Derives status from checkbox progress (0/N → draft, M/N → active, N/N → completed)
 * @param {string} planPath - Absolute path to plan file
 * @param {string} content - Plan file content
 */
export function ensureFrontmatter(planPath, content) {
  const fm = parseFrontmatter(content);
  if (fm.status) return; // Already has frontmatter with status

  // Derive status from checkbox state
  let total = 0, done = 0;
  for (const line of content.split('\n')) {
    if (/^[-*]\s+\[x\]/i.test(line)) { total++; done++; }
    else if (/^[-*]\s+\[ \]/.test(line)) { total++; }
  }

  let status = 'active';
  if (total > 0 && done === 0) status = 'draft';
  else if (total > 0 && done === total) status = 'completed';

  // Extract date from filename (YYYY-MM-DD-topic.md)
  const dateMatch = planPath.match(/(\d{4}-\d{2}-\d{2})/);
  const created = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

  const fmBlock = `---\nstatus: ${status}\ncreated: ${created}\n---\n\n`;
  writeFileSync(planPath, fmBlock + content);
}

// ─── Plan Discovery & Import ───

const PLAN_PATTERN = /^\d{4}-\d{2}-\d{2}-.+\.md$/;

/**
 * Scan known paths for plan-like files not yet in .prism/plans/
 * @param {string} projectRoot - Project root directory
 * @returns {Array<{ path: string, file: string, source: string, hasFrontmatter: boolean, status: string, total: number, done: number }>}
 */
export function discoverPlans(projectRoot) {
  const plansDir = join(projectRoot, '.prism', 'plans');
  const existing = new Set();
  if (existsSync(plansDir)) {
    for (const f of readdirSync(plansDir).filter(f => f.endsWith('.md'))) {
      existing.add(f);
    }
  }

  const discovered = [];

  // Known paths to scan
  const scanPaths = [
    { dir: join(projectRoot, 'docs'), source: 'docs/' },
    { dir: join(projectRoot, 'docs', 'plans'), source: 'docs/plans/' },
  ];

  for (const { dir, source } of scanPaths) {
    if (!existsSync(dir)) continue;
    let files;
    try { files = readdirSync(dir).filter(f => f.endsWith('.md')); } catch { continue; }

    for (const f of files) {
      // Skip if already in .prism/plans/
      if (existing.has(f)) continue;

      const fullPath = join(dir, f);
      let content;
      try { content = readFileSync(fullPath, 'utf8'); } catch { continue; }

      // Detect plan-like files: filename pattern OR content with checkboxes + batch headers
      const isNameMatch = PLAN_PATTERN.test(f);
      const hasCheckboxes = /^[-*]\s+\[[ x]\]/m.test(content);
      const hasBatchHeader = /^#{1,3}\s+Batch\s+\d+/im.test(content);
      const isPlanLike = isNameMatch || (hasCheckboxes && hasBatchHeader);

      if (!isPlanLike) continue;

      // Skip generic docs (HANDOFF.md, PROJECT-MEMORY.md, etc.)
      const skipFiles = ['HANDOFF.md', 'PROJECT-MEMORY.md', 'README.md', 'CHANGELOG.md'];
      if (skipFiles.includes(f)) continue;

      const fm = parseFrontmatter(content);
      const progress = parsePlanContent(content, f);

      discovered.push({
        path: fullPath,
        file: f,
        source,
        hasFrontmatter: !!fm.status,
        status: fm.status || 'unknown',
        total: progress.total,
        done: progress.done,
      });
    }
  }

  return discovered;
}

/**
 * Import discovered plans into .prism/plans/ (copy, original preserved)
 * Adds frontmatter if missing, derives status from checkbox state
 * @param {string} projectRoot - Project root directory
 * @param {Array<{ path: string, file: string }>} plans - Plans to import
 * @returns {{ imported: number, skipped: number }}
 */
export function importPlans(projectRoot, plans) {
  const plansDir = join(projectRoot, '.prism', 'plans');
  mkdirSync(plansDir, { recursive: true });

  let imported = 0;
  let skipped = 0;

  for (const plan of plans) {
    const destPath = join(plansDir, plan.file);

    // Skip if already exists
    if (existsSync(destPath)) {
      skipped++;
      continue;
    }

    let content = readFileSync(plan.path, 'utf8');
    const fm = parseFrontmatter(content);

    // Add frontmatter if missing
    if (!fm.status) {
      const progress = parsePlanContent(content, plan.file);
      let status = 'active';
      if (progress.total > 0 && progress.done === progress.total) {
        status = 'completed';
      } else if (progress.done === 0) {
        status = 'draft';
      }

      const today = new Date().toISOString().slice(0, 10);
      const fmBlock = `---\nstatus: ${status}\ncreated: ${today}\nimported_from: ${plan.source || 'unknown'}${plan.file}\n---\n\n`;
      content = fmBlock + content;
    }

    writeFileSync(destPath, content);

    appendHistory(projectRoot, {
      plan: plan.file,
      event: 'imported',
      actor: 'cli:plan-discovery',
      detail: `Imported from ${plan.source || ''}${plan.file}`,
    });

    imported++;
  }

  return { imported, skipped };
}
