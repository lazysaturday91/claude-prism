/**
 * claude-prism — Plan Enforcement
 * Warns when editing many files without a plan file
 * Reinforces UDEC's DECOMPOSE phase
 */

import { readJsonState, writeJsonState } from '../lib/state.mjs';
import { getMessage } from '../lib/messages.mjs';
import { buildSourcePattern, buildTestPattern } from '../lib/config.mjs';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export const planEnforcement = {
  name: 'plan-enforcement',

  evaluate(ctx, config, stateDir) {
    if (ctx.action !== 'edit' && ctx.action !== 'write') {
      return { type: 'pass' };
    }

    const filePath = ctx.filePath;
    if (!filePath) return { type: 'pass' };

    // Only track source files
    const srcPattern = buildSourcePattern(config.sourceExtensions || []);
    if (!srcPattern.test(filePath)) return { type: 'pass' };

    // Skip test files
    const testPattern = buildTestPattern(config.testPatterns || []);
    if (testPattern.test(filePath)) return { type: 'pass' };

    // Track unique files
    const files = readJsonState(stateDir, 'plan-files') || [];
    if (!files.includes(filePath)) {
      files.push(filePath);
      writeJsonState(stateDir, 'plan-files', files);
    }

    const threshold = config.warnAt || 6;
    if (files.length < threshold) return { type: 'pass' };

    // Check for plan file in docs/plans/
    const projectRoot = config.projectRoot || process.cwd();
    const plansDir = join(projectRoot, 'docs', 'plans');
    if (existsSync(plansDir)) {
      const plans = readdirSync(plansDir).filter(f => f.endsWith('.md'));
      if (plans.length > 0) return { type: 'pass' };
    }

    return {
      type: 'warn',
      message: getMessage('en', 'plan-enforcement.warn.no-plan', {
        count: files.length,
        threshold
      })
    };
  }
};
