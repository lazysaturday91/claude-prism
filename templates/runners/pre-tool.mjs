#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { commitGuard } from '../rules/commit-guard.mjs';
import { alignment } from '../rules/alignment.mjs';

await runPipelineAsync([
  { name: 'commit-guard', rule: commitGuard },
  { name: 'alignment', rule: alignment },
], 'PreToolUse');
