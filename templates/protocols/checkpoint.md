# EUDEC 5. CHECKPOINT — Confirmation Protocol

## Quality Gate: EXECUTE → CHECKPOINT

Before reporting completion of a phase:
- [ ] All batch tasks reach terminal state (done or explicitly skipped with reason)
- [ ] Build passes with zero new errors
- [ ] No uncommitted changes left unstaged
- [ ] Plan file updated with current `[x]` status

If any gate fails → continue in EXECUTE, do not report completion.

## 5-1. Batch Checkpoint

After each batch:
- Report what was completed
- Report verification results (with evidence)
- **Freshness check**: verify remaining plan targets still exist in codebase (quick grep)
- Update plan file: mark completed tasks `[x]`, note any targets already done
- Preview next batch
- "Continue?"

**Plan-Reality sync** (run at every checkpoint):
1. Grep for plan's change targets (patterns, files, functions to modify)
2. If target no longer exists → mark task as "already completed (prior work)"
3. If new targets discovered → add to plan's "Risks / Open Questions"
4. Update plan file's `Codebase Audit` section with fresh counts

**Checkpoint frequency** (proportional to task weight):
- **Lightweight tasks**: no checkpoint pause — report completion with evidence
- **Standard tasks**: summary checkpoint (1-2 lines: what done, verification result, next)
- **Full tasks**: full checkpoint with progress dashboard + "Continue?"
- **Phase boundary**: always stop (mandatory, all weights)
- **Blocker encountered**: always stop (mandatory, all weights)

**Progress dashboard:**
```
Phase: [phase] | Batch: [N/M] | Tasks: [done/total] ([%])
[████████░░] 80% — Next: [next batch name]
Plan freshness: verified [date] | Remaining targets: [N] confirmed in code
```

## 5-2. Direction Change

User says "change direction" → return to ESSENCE (re-examine from the core)
User says "stop here" → clean exit
