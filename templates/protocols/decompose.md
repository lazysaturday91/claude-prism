# EUDEC 3. DECOMPOSE — Planning Protocol

## 3-1. Decomposition Trigger

| Task Type | Trigger | Action |
|-----------|---------|--------|
| **Bugfix** | — | Skip decomposition. Go straight to locate → fix → verify. |
| **Feature** | 3+ files affected (advisory: 2+ in tightly-coupled legacy, 5+ in well-tested modular) | Decompose into batches. Plan file if 6+ files or 3+ modules. |
| **Migration** | — | Define pattern + file list. No per-file decomposition. |
| **Refactor** | 3+ files affected (same advisory as Feature) | Decompose into batches. Plan file if 6+ files or 3+ modules. |
| **Investigation** | — | Skip decomposition. Define exploration scope. |

## 3-2. Scope Classification (before decomposing)

Before breaking into batches, classify all changes using the concentric circle model:

```
"Is this required for the essence to work?"
  → YES → Core (must be in scope)
  → NO  → "Does this amplify the essence's value?"
    → YES → Support (nice to have, lower priority)
    → NO  → Out of Scope (explicitly excluded)
```

- Only **Core** items enter batch decomposition
- **Support** items are noted for later (not in current plan)
- **Out of Scope** must not be empty — if everything is "Core", scope classification has failed (return to ESSENCE)

## 3-3. Decomposition Principles (Feature/Refactor only)

1. **Independent verification**: each unit has a pass criterion
2. **Files specified**: each task lists files to create/modify
3. **Dependencies noted**: mark if a unit depends on a previous one
4. **Test first**: tests come before implementation when tests exist for the area

**Size Tags:**
- **[S]** Small: <30 LOC, config/style/single-function changes
- **[M]** Medium: 30-100 LOC, feature implementation, component creation
- **[L]** Large: >100 LOC, multi-file rewrite, new module/architecture

**Batch composition**:
- Mixed: S+S+M = 1 batch, L = 1 batch alone
- **[S]-only: up to 8 per batch** (independent small changes can be batched aggressively)
- Aligns with 4-1 adaptive batch size (simple/mechanical: 5-8 per batch)

## 3-4. Plan File Persistence

Save multi-step plans (6+ files) as markdown:
- **Path**: `.prism/plans/YYYY-MM-DD-<topic>.md`

```markdown
---
status: draft
created: YYYY-MM-DD
---

## Goal
One sentence: what we're building and why.

## Architecture
Tech stack, key decisions, 2-3 sentences max.

## Related Plans
- Depends on: `YYYY-MM-DD-<prior-plan>.md` (status: complete/in-progress)
- Shared files: list files that overlap with other active plans
- (Omit this section if no other plans exist)

## Codebase Audit
- Audit date: YYYY-MM-DD
- Targets remaining: N files (verified by grep/search)
- Already completed: N items (by prior work or other branches)
- Evidence: `grep -r "pattern" --include="*.ext" | wc -l` → N

## Files in Scope
- `path/to/file1.ts` — [what changes]
- `path/to/file2.ts` — [what changes]

## Batch 1: [Name]
- [ ] Task 1.1: [S] [description] | Verify: [auto: build/test/lint]
- [ ] Task 1.2: [M] [description] | Verify: [auto: test] [manual: visual check]
  - Prerequisite: Task 1.1

## Risks / Open Questions
- [Known unknowns or potential blockers]
```

## 3-5. Pre-Decomposition Check

Before creating the plan:
- [ ] **Codebase audit**: grep/search to verify targets actually exist in code (don't trust assumptions from prior sessions)
- [ ] **Cross-plan check**: if other plans exist in `.prism/plans/`, identify overlapping files and note dependencies
- [ ] Required types/interfaces have the necessary fields?
- [ ] External package APIs behave as expected?
- [ ] Cross-package dependencies identified?

**Staleness prevention**: If plan targets (files to change, patterns to replace) no longer exist in the codebase, mark them as "already completed" before starting execution. Never start a plan without verifying its targets are real.

## 3-6. Quality Gate: DECOMPOSE → EXECUTE

Before starting execution, all must pass:
- [ ] Plan file exists and targets verified against codebase
- [ ] Project builds from current state (no pre-existing failures)
- [ ] Dependencies resolved (lock file matches, no missing packages)
- [ ] Environment validated (required env vars, services, configs present)

If any gate fails → resolve before executing. Do not start implementation on a broken baseline.
