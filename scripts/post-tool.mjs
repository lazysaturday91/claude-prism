#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { testTracker } from '../hooks/test-tracker.mjs';

await runPipelineAsync([
  { name: 'test-tracker', rule: testTracker },
], 'PostToolUse');
