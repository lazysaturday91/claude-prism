# /claude-prism:checkpoint — Progress Check

When this command is invoked:

1. **Read the plan file** from `docs/plans/` (most recent matching file)
2. **Auto-count progress** by running:
   - `grep -c '\- \[x\]' <plan-file>` → completed count
   - `grep -c '\- \[ \]' <plan-file>` → remaining count
   - Calculate percentage: completed / (completed + remaining)
3. **Freshness check**: grep for plan's change targets to verify they still exist in codebase
4. **Report current status** using this standard format:

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

   ```
   Phase: [current phase] | Batch: [N/M] | Tasks: [done/total] ([%])
   [████████░░] 80% — Next: [next batch name]
   ```

   - Batches complete: N/M
   - Current batch: [name] — [X/Y tasks done]
   - Remaining: [batch names]
   - Blockers: [any issues encountered]

   ### Task Size Distribution

   | Size | Count | Done |
   |------|-------|------|
   | [S] Small | N | N |
   | [M] Medium | N | N |
   | [L] Large | N | N |

4. **Show summary**:
   - Files created/modified so far
   - Tests added and their status
   - Commits made
5. **Checkpoint policy check**:
   - If 3+ consecutive approvals → suggest expanding batch size to 5-8
   - If phase boundary → always stop
6. **Ask**: "Continue with the current plan, adjust, or stop?"
