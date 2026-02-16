/**
 * claude-prism — Shared Utilities
 */

export function sanitizeId(id) {
  if (!id || typeof id !== 'string') return 'default';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'default';
}
