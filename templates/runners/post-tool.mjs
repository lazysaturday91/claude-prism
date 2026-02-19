#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { testTracker } from '../rules/test-tracker.mjs';

await runPipelineAsync([
  { name: 'test-tracker', rule: testTracker },
], 'PostToolUse');
