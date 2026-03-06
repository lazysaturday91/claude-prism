#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { testTracker } from '../rules/test-tracker.mjs';
import { planProgressTracker } from '../rules/plan-progress-tracker.mjs';

await runPipelineAsync([
  { name: 'test-tracker', rule: testTracker },
  { name: 'plan-progress-tracker', rule: planProgressTracker },
], 'PostToolUse');
