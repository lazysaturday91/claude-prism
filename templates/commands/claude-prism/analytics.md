# /claude-prism:analytics — Usage Analytics

When this command is invoked, show aggregated statistics from session event logs:

## Report

1. **Read session data** using `listSessions()` and `getSessionSummary()` from session.mjs
2. **Aggregate across all sessions**:
   - Total sessions count
   - Hook effectiveness: blocks and warnings by rule type
   - Test activity: runs, passed, failed
   - File activity: modified, created
3. **Display using this format**:

```
🌈 claude-prism analytics

  Sessions:        N
  Total events:    N

  Hook Effectiveness:
    Blocks:        N
    Warnings:      N

  Test Activity:
    Runs:          N
    Passed:        N
    Failed:        N

  File Activity:
    Modified:      N
    Created:       N
```

4. **With --detail flag**, also show last 5 sessions with timestamps and per-session counts
