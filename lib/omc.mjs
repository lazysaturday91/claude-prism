/**
 * claude-prism — OMC (oh-my-claudecode) Detection
 * Detects OMC installation and extracts version info
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Detect oh-my-claudecode installation
 * @param {string} [homeDir] - Override home directory (for testing)
 * @returns {{ detected: boolean, version: string|null }}
 */
export function detectOmc(homeDir) {
  const home = homeDir || homedir();
  const claudeMdPath = join(home, '.claude', 'CLAUDE.md');

  if (!existsSync(claudeMdPath)) {
    return { detected: false, version: null };
  }

  try {
    const content = readFileSync(claudeMdPath, 'utf8');

    if (!content.includes('<!-- OMC:START -->')) {
      return { detected: false, version: null };
    }

    // Extract version from "Unified Agents (vX.Y.Z)" pattern
    const versionMatch = content.match(/\(v(\d+\.\d+\.\d+)\)/);
    const version = versionMatch ? versionMatch[1] : null;

    return { detected: true, version };
  } catch {
    return { detected: false, version: null };
  }
}
