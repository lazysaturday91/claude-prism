/**
 * claude-prism — Hook Message Templates
 */

const MESSAGES = {
  'commit-guard.block.failed': '🌈 Prism ✋ Commit blocked: last test run FAILED. Fix tests before committing.',
  'commit-guard.warn.no-test': '🌈 Prism > No test run detected this session. Run tests before committing.',
  'commit-guard.warn.stale': '🌈 Prism > Last test run was {minutes}min ago. Run tests before committing.',
  'test-tracker.warn.failed': '🌈 Prism 📊 Tests FAILED. Fix before committing.',
};

export function getMessage(_lang, key, params = {}) {
  const template = MESSAGES[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
}
