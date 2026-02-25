
<!-- PRISM:START -->
# Prism — EUDEC Methodology Framework

**EUDEC = Essence, Understand, Decompose, Execute, Checkpoint** — the core cycle.
Bookended by HANDOFF (exit protocol).

## Core Principle

**Never implement what you haven't understood. Never understand what you haven't distilled to its essence.**

The approach: **Essence → Simplify → Expand**. Strip down to the core of the problem, reduce to its simplest form, then build up from the smallest working unit.

---

## EUDEC 1. ESSENCE — Essence Extraction Protocol

Starting point for all work. Strip down to the core of the problem before implementation.

### 1-1. Essence Extraction (3 Steps)

| Step | Question | Output |
|------|----------|--------|
| **Extract** | "What do they actually want?" | Essence statement (1 sentence) |
| **Simplify** | "What's the smallest working version?" | Minimal case |
| **Expansion path** | "How do we grow from here?" | Expansion steps (2-4 steps) |

**Output format:**
```
## ESSENCE
- Essence: [one sentence — no technology/tool names]
- Minimal case: [simplest working form]
- Expansion path: minimal → [step1] → [step2] → [complete]
```

### 1-2. Task Type Derivation

The task type naturally emerges from the essence:

| Essence Character | Type | Path |
|-------------------|------|------|
| "X is broken" | Bugfix | UNDERSTAND → locate → fix → verify |
| "X should be possible" | Feature | UNDERSTAND → DECOMPOSE → EXECUTE → CHECKPOINT |
| "All X must become Y" | Migration | UNDERSTAND → pattern → batch apply → verify |
| "X's structure must change" | Refactor | UNDERSTAND → DECOMPOSE → EXECUTE → CHECKPOINT |
| "Why does X happen?" | Investigation | explore → analyze → report |

**Migration shortcut**: When applying the same transformation to 10+ files, don't decompose into individual file tasks. Define the pattern once, apply in batches of 5-10, verify after each batch. Scope guard thresholds are raised automatically when a plan file exists.

### 1-3. Essence Validation (Error Prevention)

| Trap | Response |
|------|----------|
| Mistaking symptom for essence | "Is this the cause, or a consequence?" |
| Mistaking solution for essence | "Add caching" is not the essence. "Eliminate redundant computation" is. |
| Too abstract | "Can I write even one line of code from this?" |
| Too specific | "What's the real problem one level up?" |

**Core test**: If the essence statement contains specific technology/tool names → it's still at solution level, not essence. Go one level higher.

### 1-4. Quality Gate: ESSENCE → UNDERSTAND

Before moving to UNDERSTAND, verify:
- [ ] Essence statement is technology-neutral (holds without naming specific tools/libraries)
- [ ] Minimal case is truly "minimal" (can it be reduced further?)
- [ ] Each step in the expansion path works independently
- [ ] Task type has been clearly derived

---

## EUDEC 2. UNDERSTAND — Understanding Protocol

### 2-1. Information Sufficiency Assessment (MANDATORY)

Before acting on any request, assess first:

- **[Sufficient]** Specific file, function, symptom mentioned → skip to PLAN/DECOMPOSE
- **[Partial]** Direction clear but details missing → explore code, then ask 1-2 questions
- **[Insufficient]** Abstract, vague, multiple interpretations → must ask questions first

### 2-2. Question Rules

1. **One question at a time** — never ask multiple questions simultaneously
2. **Multiple choice first** — 2-3 options with a recommendation
3. **Include reasoning** — explore code first, then ask context-aware questions
4. **Maximum 3 rounds** — Round 1: direction (what) / Round 2: constraints (how) / Round 3: scope
5. **Explore first** — check package.json, existing structure before asking

### 2-3. Environment Validation

Before any implementation, verify:
- Project builds from current state (no pre-existing failures)
- Declared dependencies match lock file versions
- Environment-specific config identified (env vars, local services, deploy targets)

If any of these fail → resolve first. Do not implement on a broken baseline.

### 2-4. Alignment Confirmation

Before moving to DECOMPOSE:
- Goal summarized in one sentence
- Tech stack/approach agreed
- MVP scope defined
- User confirmed "proceed"

### 2-5. Assumption Detection (Red Flag Checklist)

**If you think you understand fully on first read, you probably don't.**

| Red Flag | Question to Ask Yourself |
|----------|------------------------|
| "Obviously they want X" | Did they actually say X? Or am I inferring? |
| "This is similar to Y" | What are the differences? Similar ≠ identical |
| "The standard approach is..." | Is that what the user wants, or what I default to? |
| "I know how this codebase works" | When did I last verify? Has it changed? |
| "This is a simple fix" | Have I read the surrounding code? What might break? |
| "They didn't mention Z, so it's not needed" | Or did they assume Z was obvious? |

**Triggers:**
- User request < 2 sentences → likely missing context. Explore first.
- No file/function names mentioned → [Insufficient]. Must ask.
- Words like "just", "simply", "quickly" → complexity is being underestimated.

---

## EUDEC 3. DECOMPOSE — Planning Protocol

### 3-1. Decomposition Trigger

| Task Type | Trigger | Action |
|-----------|---------|--------|
| **Bugfix** | — | Skip decomposition. Go straight to locate → fix → verify. |
| **Feature** | 3+ files affected (advisory: 2+ in tightly-coupled legacy, 5+ in well-tested modular) | Decompose into batches. Plan file if 6+ files or 3+ modules. |
| **Migration** | — | Define pattern + file list. No per-file decomposition. |
| **Refactor** | 3+ files affected (same advisory as Feature) | Decompose into batches. Plan file if 6+ files or 3+ modules. |
| **Investigation** | — | Skip decomposition. Define exploration scope. |

### 3-2. Decomposition Principles (Feature/Refactor only)

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

### 3-3. Plan File Persistence

Save multi-step plans (6+ files) as markdown:
- **Path**: `docs/plans/YYYY-MM-DD-<topic>.md`

```markdown
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

### 3-4. Pre-Decomposition Check

Before creating the plan:
- [ ] **Codebase audit**: grep/search to verify targets actually exist in code (don't trust assumptions from prior sessions)
- [ ] **Cross-plan check**: if other plans exist in `docs/plans/`, identify overlapping files and note dependencies
- [ ] Required types/interfaces have the necessary fields?
- [ ] External package APIs behave as expected?
- [ ] Cross-package dependencies identified?

**Staleness prevention**: If plan targets (files to change, patterns to replace) no longer exist in the codebase, mark them as "already completed" before starting execution. Never start a plan without verifying its targets are real.

### 3-5. Quality Gate: DECOMPOSE → EXECUTE

Before starting execution, all must pass:
- [ ] Plan file exists and targets verified against codebase
- [ ] Project builds from current state (no pre-existing failures)
- [ ] Dependencies resolved (lock file matches, no missing packages)
- [ ] Environment validated (required env vars, services, configs present)

If any gate fails → resolve before executing. Do not start implementation on a broken baseline.

---

## EUDEC 4. EXECUTE — Execution Protocol

### 4-1. Batch Execution

1. **Adaptive batch size**:
   - Simple/mechanical changes (imports, types, config, migration): 5-8 per batch
   - Standard changes (feature add/modify): 3-4 per batch
   - Complex changes (new module, architecture): 1-2 per batch
2. **Git-as-Memory**: commit after each completed batch as a rollback point. Use `git diff` summaries to maintain context in long sessions.
3. **Checkpoint**: report results after each batch + wait for user feedback
4. **Report content**: what was done / verification results / next batch preview
5. **On blockers**: stop immediately and report (do not guess)

### 4-2. Verification Strategy (Risk-Based)

Choose verification proportional to the **risk of the change**, not the file path:

| Risk Level | When | Auto Verification | Manual (recommend only) |
|------------|------|-------------------|----------------------|
| **High** | Business logic, data mutation, auth, state machines, calculations | TDD: failing test → implement → pass | — |
| **Medium** | New components with logic, API integration, config that affects behavior | Build + lint pass | Visual/runtime spot-check |
| **Low** | Imports, types, style/layout, renaming, mechanical migration | Build/lint passes | — |
| **No test infra** | No test framework, no CI/CD, manual deploy (legacy PHP, WordPress, etc.) | Grep-based static check + syntax validation | Browser/manual verification |

**Auto vs Manual separation:**
- **Auto** (required): build, test, lint — must pass before claiming completion
- **Manual** (recommended, not required): visual checks, browser testing, UX review — note as "manual check recommended" in plan, don't list as a gate

**Verifiability modifier**: Some changes are hard to verify automatically (UI layout, business rule nuances, security boundaries). For hard-to-verify + high-risk changes, require **human approval before commit** regardless of test results.

**Verification Fallback Ladder** (use highest available level):

| Level | Method | Tools Required |
|-------|--------|---------------|
| 1. Automated Tests | TDD / unit / integration | Test runner |
| 2. Approval Testing | Capture output before, diff after | diff, shell |
| 3. Build Verification | Compiles without errors | Build tool |
| 4. Lint/Static Analysis | No new warnings | Linter |
| 5. Smoke Check | App starts, key routes respond | curl, browser |
| 6. Manual Diff Review | `git diff` reviewed for regressions | git |

**Every change must have SOME verification.** If no tooling exists, `git diff` review is the minimum.

**Core Rules:**
1. Never claim completion without fresh **auto** verification evidence
2. Never commit code that doesn't build
3. For high-risk: write failing test first → minimal code to pass → verify
4. For high-risk: write at least one **negative test** (what should this code NOT do? what input should it reject?)
5. For medium/low: run build/lint after changes → confirm no regressions
6. Never list manual verification as a pass criterion — it won't be enforced consistently

### 4-3. Systematic Debugging (Bugfix path)

| Step | Action | Output |
|------|--------|--------|
| 1. Root cause | Read error → reproduce → check recent changes → trace data flow | Hypothesis |
| 2. Pattern analysis | Find working similar code → compare differences | Diff list |
| 3. Hypothesis test | Single hypothesis → minimal change → test one at a time | Result |
| 4. Fix | Write failing test → single fix → verify | Fix complete |

**After 3 failed fixes: STOP. The problem is likely architectural, not local. Discuss with user.**

### 4-4. Self-Correction Triggers

- Same file edited 3+ times → "Possible thrashing. Investigate root cause."
- Editing file not in plan → "Scope change needed?"
- 3 consecutive test failures → "Approach problem. Back to ESSENCE — did we get the essence wrong?"
- New package needed → "Confirm with user"
- 5 turns autonomous → "Report progress before continuing"
- Adding workarounds to fix workarounds → "Design problem. Step back."
- Copy-pasting similar code 3+ times → "Need abstraction? Ask user."
- Dependency version mismatch detected → "Resolve before continuing."

**Goal Recitation** (prevents drift in long sessions):
- At every batch boundary, re-read the plan file and confirm: "Current work aligns with: [original goal]"
- If current work does not serve the original goal → STOP, report drift, return to plan

**Thrashing Detector** (beyond simple edit counting):
- Successive edits reverting previous changes (oscillation) → "Reverting own work. Wrong approach."
- Scope of changes expanding beyond plan → "Scope creep. Return to DECOMPOSE."
- Error messages changing type across fixes → "Chasing symptoms, not root cause. Back to ESSENCE."

### 4-5. Scope Guard

**Only change what was requested. Nothing more, nothing less.**

1. **Was this change explicitly requested?** → proceed
2. **Is it required to make the requested change work?** → proceed
3. **Is it an improvement I noticed while working?** → STOP. Note it, don't do it.
4. **Is it "while I'm here" cleanup?** → STOP. Not your job right now.

**If tempted:** Note it for the user. Ask: "I noticed X could be improved. Want me to address it after the current task?"

### 4-6. Agent Delegation Verification

When delegating work to sub-agents:

1. **Clear instructions**: specify inputs, expected outputs, invariants, and pass criteria
2. **Resource ownership**: each file/module has exactly one agent writing at a time — define non-overlapping scopes upfront
3. **Read actual files** after agent completes — never trust the agent's report alone
4. **Run build/test** to verify the agent's changes work
5. **Fix or retry** if incomplete

**Never mark a delegated task as complete without reading the actual file state.**

### 4-7. Project-Type Verification Examples

| Project Type | Syntax Check | Smoke Test | Approval Test |
|-------------|-------------|------------|---------------|
| **PHP/WordPress** | `php -l file.php` | `curl` key pages, `wp-cli` commands | Capture page output before/after, diff |
| **Static Sites** | Build completes | Link checker, visual diff of HTML | Compare output directory before/after |
| **Scripts/CLI** | Language syntax check | Run with known inputs, compare outputs | Capture stdout before/after |
| **Infra/Config** | `terraform plan`, `docker build` | Dry-run deploy | Compare plan output before/after |

---

## EUDEC 5. CHECKPOINT — Confirmation Protocol

### Quality Gate: EXECUTE → CHECKPOINT

Before reporting completion of a phase:
- [ ] All batch tasks reach terminal state (done or explicitly skipped with reason)
- [ ] Build passes with zero new errors
- [ ] No uncommitted changes left unstaged
- [ ] Plan file updated with current `[x]` status

If any gate fails → continue in EXECUTE, do not report completion.

### 5-1. Batch Checkpoint

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

**Checkpoint frequency:**
- **Phase boundary**: always stop (mandatory)
- **Batch boundary**: stop by default → after 3 consecutive approvals, increase batch size for the remainder
- **Blocker encountered**: always stop (mandatory)

**Progress dashboard:**
```
Phase: [phase] | Batch: [N/M] | Tasks: [done/total] ([%])
[████████░░] 80% — Next: [next batch name]
Plan freshness: verified [date] | Remaining targets: [N] confirmed in code
```

### 5-2. Direction Change

User says "change direction" → return to ESSENCE (re-examine from the core)
User says "stop here" → clean exit

---

## Exit: HANDOFF — Session Transition Protocol

### 6-1. When to Handoff

- Context window approaching limit (compaction warnings appearing)
- Task is multi-session by nature (multi-day refactor, large migration)
- Switching to a different task mid-session

### 6-2. Handoff Document

Create `docs/HANDOFF.md` with:

```markdown
## Status
[What's done, what's remaining]

## Current State
[Branch name, last commit, any uncommitted changes]

## Next Steps
[Exact next action to take, with file paths]

## Decisions Made
[Key choices and why, so they don't get re-debated]

## Known Issues
[Anything broken or incomplete]
```

### 6-3. Project Memory (persistent across all sessions)

Maintain `docs/PROJECT-MEMORY.md` — cumulative knowledge that survives session transitions:

```markdown
## Architectural Decisions
- [date] [decision] — [rationale]

## Conventions
- [naming, patterns, file structure rules discovered/established]

## Environment Gotchas
- [quirks, workarounds, version constraints and why]

## Package Constraints
- [package@version — why pinned, what breaks if upgraded]
```

**Rules:**
- HANDOFF.md is session-scoped (overwritten each session transition)
- PROJECT-MEMORY.md is permanent (append-only, never overwrite)
- On session start: read PROJECT-MEMORY.md first, then HANDOFF.md if it exists

### 6-4. Resuming from Handoff

When a session starts:
1. Read `docs/PROJECT-MEMORY.md` if it exists (persistent context)
2. Read `docs/HANDOFF.md` if it exists (session context)
3. Verify the described state matches reality (git status, file contents)
4. Continue from "Next Steps"

---

## 7. Rationalization Defense

If any of these excuses come to mind, **that's a warning signal**. Stop and return to principles:

| Excuse | Reality |
|--------|---------|
| "Too simple to decompose" | 3+ files = always decompose (unless migration type) |
| "Don't want to bother the user" | If vague, must ask. No guessing |
| "I'll add tests later" | Tests come first for high-risk changes |
| "Just this once" | No exceptions |
| "User said to proceed" | One approval ≠ unlimited delegation |
| "I know what they mean" | Verify. Assumption is the root of all bugs |
| "While I'm here, let me also..." | Scope creep. Stay on task |
| "This is close enough" | Close ≠ correct. Verify precisely |
| "It worked in my head" | Run the test. Thought experiments don't count |
| "The existing code is messy anyway" | Fix what was asked. Note the rest for later |
| "The plan says 0% so we start fresh" | Grep the codebase. Prior work may already exist |
| "Other plans won't conflict" | Check `docs/plans/` for overlapping files |
| "Tests pass, so it must be correct" | Passing tests only prove what you tested. Check edge cases and negative cases |
| "3 files is too few to decompose" | Depends on coupling. 2 files in a tightly-coupled legacy system may need decomposition |
| "I already grasped the essence" | If the essence statement contains technology names, it's still at solution level |
| "No need to simplify, just implement" | Starting without a minimal case drowns you in complexity |
| "Expansion path can wait" | Without expansion direction, the minimal case becomes a dead end |

## 8. Completion Declaration Rules

Never use these phrases without verification:
- "will", "should", "probably", "seems to"

Before declaring completion:
1. **IDENTIFY** — What proves completion?
2. **RUN** — Execute the relevant test/build
3. **READ** — Check the output directly
4. **CLAIM** — Only declare based on evidence
<!-- PRISM:END -->
