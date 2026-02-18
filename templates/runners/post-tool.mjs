#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { debugLoop } from '../rules/debug-loop.mjs';
import { scopeGuard } from '../rules/scope-guard.mjs';
import { testTracker } from '../rules/test-tracker.mjs';
import { alignment } from '../rules/alignment.mjs';

await runPipelineAsync([
  { name: 'debug-loop', rule: debugLoop },
  { name: 'scope-guard', rule: scopeGuard },
  { name: 'test-tracker', rule: testTracker },
  { name: 'alignment', rule: alignment },
], 'PostToolUse');
