/**
 * claude-prism — Hook Message Templates
 */

const MESSAGES = {
  'commit-guard.block.failed': '🌈 Prism ✋ Commit blocked: last test run FAILED. Fix tests before committing.',
  'commit-guard.warn.no-test': '🌈 Prism > No test run detected this session. Run tests before committing.',
  'commit-guard.warn.stale': '🌈 Prism > Last test run was {minutes}min ago. Run tests before committing.',
  'test-tracker.warn.failed': '🌈 Prism 📊 Tests FAILED. Fix before committing.',
  'plan-enforcement.warn.no-plan': '🌈 Prism > Editing {count} unique source files without a plan. Create a plan at .prism/plans/ per EUDEC DECOMPOSE protocol.',
  'precompact-handler.info.saved': '🌈 Prism > HANDOFF.md auto-saved before compaction.',
  'session-end-handler.info.saved': '🌈 Prism > Session summary saved to PROJECT-MEMORY.md.',
  'subagent-scope-injector.info.scope': '🌈 Prism Scope >',
  'task-plan-sync.info.updated': '🌈 Prism > Plan updated: {task}. Progress: {done}/{total} ({pct}%)',
  'plan-lifecycle.completed': '🌈 Prism > Plan completed: {plan}. All {total} tasks done.',
  'plan-lifecycle.status-changed': '🌈 Prism > Plan {plan}: {from} → {to}',
  'plan-lifecycle.auto-activated': '🌈 Prism > Plan {plan} activated (first task checked)',
};

export function getMessage(_lang, key, params = {}) {
  const template = MESSAGES[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}
