/**
 * claude-prism — Hook Message Templates
 */

const MESSAGES = {
  'commit-guard.block.failed': '🌈 Prism ✋ Commit blocked: last test run FAILED. Fix tests before committing.',
  'commit-guard.warn.no-test': '🌈 Prism > No test run detected this session. Run tests before committing.',
  'commit-guard.warn.stale': '🌈 Prism > Last test run was {minutes}min ago. Run tests before committing.',
  'debug-loop.block.divergent': '🌈 Prism ✋ Debug Loop blocked: {name} edited {count} times on same area. Discuss approach with user before continuing.',
  'debug-loop.warn.divergent': '🌈 Prism > Debug Loop: {name} edited {count} times on same area. Stop and investigate root cause.',
  'debug-loop.warn.convergent': '🌈 Prism > Debug Loop: {name} edited {count} times (different areas). Consider if this is expected.',
  'scope-guard.block': '🌈 Prism ✋ Scope Guard: {count} unique files modified without a plan. Run /prism to decompose before continuing.',
  'scope-guard.warn': '🌈 Prism > Scope Guard: {count} unique files modified. Consider running /prism to decompose the task.',
  'scope-guard.plan-detected': '🌈 Prism 📋 Plan file detected. Scope thresholds raised.',
  'test-tracker.warn.failed': '🌈 Prism 📊 Tests FAILED. Fix before committing.',
};

export function getMessage(_lang, key, params = {}) {
  const template = MESSAGES[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}
