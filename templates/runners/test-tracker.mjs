#!/usr/bin/env node
import { runHook } from '../lib/adapter.mjs';
import { testTracker } from '../rules/test-tracker.mjs';
runHook('test-tracker', 'PostToolUse', testTracker);
