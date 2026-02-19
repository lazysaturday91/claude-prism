/**
 * claude-prism — Scope Guard
 * Warns when too many unique files are modified without a plan
 */

import { readJsonState, writeJsonState } from '../lib/state.mjs';
import { DEFAULTS, buildSourcePattern, buildTestPattern } from '../lib/config.mjs';
import { getMessage } from '../lib/messages.mjs';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PLAN_PATTERN = /(?:^|\/)docs\/plans\/.*\.md$|(?:^|\/).*plan.*\.md$/i;

export const scopeGuard = {
  name: 'scope-guard',

  evaluate(ctx, config, stateDir) {
    const filePath = ctx.filePath;
    if (!filePath) return { type: 'pass' };

    // Plan file created → mark plan as active (thresholds will be doubled)
    const lang = config.language || 'en';
    if (PLAN_PATTERN.test(filePath)) {
      writeJsonState(stateDir, 'scope-has-plan', true);
      return { type: 'pass', message: getMessage(lang, 'scope-guard.plan-detected') };
    }

    // Only track source files
    const sourcePattern = buildSourcePattern(config.sourceExtensions || DEFAULTS.sourceExtensions);
    const testPattern = buildTestPattern(config.testPatterns || DEFAULTS.testPatterns);

    if (!sourcePattern.test(filePath)) return { type: 'pass' };

    // Don't count test files toward scope
    if (testPattern.test(filePath)) return { type: 'pass' };

    // Track unique files
    let files = readJsonState(stateDir, 'scope-files') || [];
    if (!files.includes(filePath)) {
      files.push(filePath);
      writeJsonState(stateDir, 'scope-files', files);
    }

    const count = files.length;

    // Agent-aware thresholds: sub-agents get higher limits
    const isAgent = ctx.agentId && ctx.agentId !== '' && ctx.agentId !== 'default';
    let warnAt = isAgent ? (config.agentWarnAt || 8) : (config.warnAt || 4);
    let blockAt = isAgent ? (config.agentBlockAt || 12) : (config.blockAt || 7);

    // Active plan → double thresholds (planned work is expected to touch many files)
    let hasPlan = readJsonState(stateDir, 'scope-has-plan');

    // Fallback: check disk for existing plan files (survives session restart)
    if (!hasPlan) {
      try {
        const root = config.projectRoot || process.cwd();
        const plansDir = join(root, 'docs', 'plans');
        if (existsSync(plansDir)) {
          const planFiles = readdirSync(plansDir).filter(f => f.endsWith('.md'));
          if (planFiles.length > 0) {
            hasPlan = true;
            writeJsonState(stateDir, 'scope-has-plan', true);
          }
        }
      } catch {
        // Ignore filesystem errors — fail open
      }
    }

    if (hasPlan) {
      const multiplier = config.planMultiplier || 3;
      warnAt *= multiplier;
      blockAt *= multiplier;
    }

    if (count >= blockAt) {
      // With a plan: downgrade block → warn (planned large tasks are expected)
      if (hasPlan) {
        return {
          type: 'warn',
          message: getMessage(lang, 'scope-guard.block-with-plan', { count, blockAt })
        };
      }
      return {
        type: 'block',
        message: getMessage(lang, 'scope-guard.block', { count })
      };
    }

    if (count >= warnAt) {
      const msgKey = hasPlan ? 'scope-guard.warn-with-plan' : 'scope-guard.warn';
      return {
        type: 'warn',
        message: getMessage(lang, msgKey, { count, blockAt })
      };
    }

    return { type: 'pass' };
  }
};
