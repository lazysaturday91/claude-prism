# /claude-prism:checkpoint — Progress Check

When this command is invoked:

1. **Read the plan file** from `docs/plans/` (most recent matching file)
2. **Auto-count progress** by running:
   - `grep -c '\- \[x\]' <plan-file>` → completed count
   - `grep -c '\- \[ \]' <plan-file>` → remaining count
   - Calculate percentage: completed / (completed + remaining)
3. **Plan-Reality sync** (freshness check):
   - Grep for plan's change targets (patterns, files, functions to modify) to verify they still exist in codebase
   - If target no longer exists → mark task as "already completed (prior work)"
   - If new targets discovered → add to plan's "Risks / Open Questions"
   - Update plan file's `Codebase Audit` section with fresh counts if present
4. **Report current status** using this standard format:

   ### Changes

   | Item | Before | After |
   |------|--------|-------|
   | [what changed] | [old behavior/state] | [new behavior/state] |

   ### Verification

   | Check | Result |
   |-------|--------|
   | Build | ✅/❌ [details] |
   | Tests | ✅/❌ [pass count] |
   | Lint | ✅/❌ or N/A |

   ### Progress

   ```
   Phase: [current phase] | Batch: [N/M] | Tasks: [done/total] ([%])
   [████████░░] 80% — Next: [next batch name]
   Plan freshness: verified [date] | Remaining targets: [N] confirmed in code
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

5. **Show summary**:
   - Files created/modified so far
   - Tests added and their status
   - Commits made
6. **Checkpoint policy check**:
   - If 3+ consecutive approvals → suggest expanding batch size to 5-8
   - If phase boundary → always stop
7. **Ask**: "Continue with the current plan, adjust, or stop?"
