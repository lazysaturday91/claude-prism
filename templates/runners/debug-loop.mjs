#!/usr/bin/env node
import { runHook } from '../lib/adapter.mjs';
import { debugLoop } from '../rules/debug-loop.mjs';
runHook('debug-loop', 'PostToolUse', debugLoop);
