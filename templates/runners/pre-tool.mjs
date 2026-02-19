#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { commitGuard } from '../rules/commit-guard.mjs';

await runPipelineAsync([
  { name: 'commit-guard', rule: commitGuard },
], 'PreToolUse');
