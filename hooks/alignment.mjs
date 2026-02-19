/**
 * claude-prism — Alignment Detection
 * Detects scope drift and major unconfirmed decisions
 */

import { readJsonState, writeJsonState } from '../lib/state.mjs';
import { getMessage } from '../lib/messages.mjs';

// Major decision patterns — commands that represent significant choices
const MAJOR_DECISION_PATTERNS = [
  { pattern: /\bnpm\s+install\b|\bpnpm\s+add\b|\byarn\s+add\b|\bbun\s+add\b/, label: 'package-install' },
  { pattern: /\bprisma\s+migrate\b|\bsequelize\b|\bknex\s+migrate\b/, label: 'db-migration' },
  { pattern: /\brm\s+-rf?\b|\brmdir\b/, label: 'destructive-delete' },
];

// Config files that represent major changes when modified
const MAJOR_CONFIG_FILES = [
  'tsconfig.json', 'package.json', '.env', 'docker-compose.yml',
  'Dockerfile', '.github/workflows', 'webpack.config', 'vite.config',
  'next.config', 'tailwind.config',
];

export const alignment = {
  name: 'alignment',

  evaluate(ctx, config, stateDir) {
    if (!config.enabled) return { type: 'pass' };

    const messages = [];

    // 1. Directory scope tracking
    if (ctx.filePath) {
      const dir = ctx.filePath.split('/').slice(0, -1).join('/') || '.';
      let scopeDirs = readJsonState(stateDir, 'scope-directories') || [];

      // Check if dir is within any existing base scope (subdirectory match)
      const isWithinScope = scopeDirs.some(base =>
        dir === base || dir.startsWith(base + '/')
      );
      // Also check if dir is a parent of an existing scope dir
      const isParentOfScope = scopeDirs.some(base =>
        base.startsWith(dir + '/')
      );

      if (!isWithinScope && !isParentOfScope && !scopeDirs.includes(dir)) {
        // First 3 unique directories establish the "base scope"
        if (scopeDirs.length < 3) {
          scopeDirs.push(dir);
          writeJsonState(stateDir, 'scope-directories', scopeDirs);
        } else {
          // New directory outside base scope — potential drift
          const driftCount = parseInt(
            (readJsonState(stateDir, 'drift-count') || 0).toString(), 10
          ) || 0;
          const newDriftCount = driftCount + 1;
          writeJsonState(stateDir, 'drift-count', newDriftCount);

          if (newDriftCount >= (config.driftThreshold || 2)) {
            return {
              type: 'warn',
              message: `🌈 Prism 🧭 Scope drift: editing ${dir} (outside base scope: ${scopeDirs.slice(0, 3).join(', ')}). Verify this is intended.`
            };
          }
        }
      }

      // 2. Major config file detection
      const fileName = ctx.filePath.split('/').pop();
      const isMajorConfig = MAJOR_CONFIG_FILES.some(f =>
        ctx.filePath.includes(f) || fileName === f
      );
      if (isMajorConfig) {
        messages.push(`🌈 Prism 🔧 Config change: ${fileName}. Ensure this was discussed with user.`);
      }
    }

    // 3. Major command detection
    if (ctx.command) {
      for (const { pattern, label } of MAJOR_DECISION_PATTERNS) {
        if (pattern.test(ctx.command)) {
          if (label === 'destructive-delete') {
            return {
              type: 'warn',
              message: `🌈 Prism ⚠️ Destructive command detected: ${ctx.command.slice(0, 60)}. Confirm with user before proceeding.`
            };
          }
          if (label === 'package-install') {
            messages.push(`🌈 Prism 📦 New dependency being installed. Verify this was agreed upon.`);
          }
          if (label === 'db-migration') {
            messages.push(`🌈 Prism 🗄️ Database migration detected. This is a major decision — confirm with user.`);
          }
        }
      }
    }

    if (messages.length > 0) {
      return { type: 'pass', message: messages.join('\n') };
    }

    return { type: 'pass' };
  }
};
