#!/usr/bin/env node
import { runHook } from '../lib/adapter.mjs';
import { scopeGuard } from '../rules/scope-guard.mjs';
runHook('scope-guard', 'PostToolUse', scopeGuard);
