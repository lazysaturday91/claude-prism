#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { commitGuard } from '../hooks/commit-guard.mjs';
import { planEnforcement } from '../hooks/plan-enforcement.mjs';

await runPipelineAsync([
  { name: 'commit-guard', rule: commitGuard },
  { name: 'plan-enforcement', rule: planEnforcement },
], 'PreToolUse');
