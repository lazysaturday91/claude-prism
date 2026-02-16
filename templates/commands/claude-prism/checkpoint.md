# /claude-prism:checkpoint — Progress Check

When this command is invoked:

1. **Read the plan file** from `docs/plans/` (most recent matching file)
2. **Check completed tasks** (marked with [x] in the plan)
3. **Report current status** using this standard format:

   ### Changes

   | Item | Before | After |
   |------|--------|-------|
   | [what changed] | [old behavior/state] | [new behavior/state] |

   ### Verification

   | Check | Result |
   |-------|--------|
   | TypeScript | ✅/❌ [details] |
   | Tests | ✅/❌ [pass count] |
   | Lint | ✅/❌ or N/A |

   ### Progress

   - Batches complete: N/M
   - Current batch: [name] — [X/Y tasks done]
   - Remaining: [batch names]
   - Blockers: [any issues encountered]

4. **Show summary**:
   - Files created/modified so far
   - Tests added and their status
   - Commits made
5. **Ask**: "Continue with the current plan, adjust, or stop?"
