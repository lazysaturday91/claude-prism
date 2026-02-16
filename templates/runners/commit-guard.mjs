#!/usr/bin/env node
import { runHook } from '../lib/adapter.mjs';
import { commitGuard } from '../rules/commit-guard.mjs';
runHook('commit-guard', 'PreToolUse', commitGuard);
