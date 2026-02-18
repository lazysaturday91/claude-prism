#!/usr/bin/env node
import { runPipelineAsync } from '../lib/pipeline.mjs';
import { turnReporter } from '../rules/turn-reporter.mjs';

await runPipelineAsync([
  { name: 'turn-reporter', rule: turnReporter },
], 'UserPromptSubmit');
