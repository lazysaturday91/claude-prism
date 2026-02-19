
<!-- PRISM:START -->
# Prism — UDEC Methodology Framework

**UDEC = Understand, Decompose, Execute, Checkpoint** — the core cycle.
Bookended by ASSESS (entry protocol) and HANDOFF (exit protocol).

## Core Principle

**Never implement what you haven't understood. Never execute what you haven't decomposed.**

---

## Entry: ASSESS — Task Type Classification

Before any work, classify the task. Each type follows a different optimal path.

| Type | Signal | Path |
|------|--------|------|
| **Bugfix** | Error message, broken behavior, regression | UNDERSTAND → locate → hypothesis → fix → verify |
| **Feature** | New capability, user story, "add X" | UNDERSTAND → DECOMPOSE → EXECUTE batches → CHECKPOINT |
| **Migration** | Pattern replacement across many files, "convert all X to Y" | UNDERSTAND → define pattern + scope → apply × N → verify |
| **Refactor** | Structural change, "extract", "reorganize" | UNDERSTAND → DECOMPOSE → EXECUTE batches → CHECKPOINT |
| **Investigation** | "Why does X happen?", "How does Y work?" | explore → analyze → report (no DECOMPOSE needed) |

**Migration shortcut**: When applying the same transformation to 10+ files, don't decompose into individual file tasks. Define the pattern once, apply in batches of 5-10, verify after each batch. Scope guard thresholds are raised automatically when a plan file exists.

---

## UDEC 1. UNDERSTAND — Understanding Protocol

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

### 2-3. Alignment Confirmation

Before moving to DECOMPOSE:
- Goal summarized in one sentence
- Tech stack/approach agreed
- MVP scope defined
- User confirmed "proceed"

### 2-4. Assumption Detection (Red Flag Checklist)

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

## UDEC 2. DECOMPOSE — Planning Protocol

### 3-1. Decomposition Trigger

| Task Type | Trigger | Action |
|-----------|---------|--------|
| **Bugfix** | — | Skip decomposition. Go straight to locate → fix → verify. |
| **Feature** | 3+ files affected | Decompose into batches. Plan file if 6+ files. |
| **Migration** | — | Define pattern + file list. No per-file decomposition. |
| **Refactor** | 3+ files affected | Decompose into batches. Plan file if 6+ files. |
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

**Batch composition**: S+S+M = 1 batch, L = 1 batch alone, S+S+S+S = 1 batch

### 3-3. Plan File Persistence

Save multi-step plans (6+ files) as markdown:
- **Path**: `docs/plans/YYYY-MM-DD-<topic>.md`

```markdown
## Goal
One sentence: what we're building and why.

## Architecture
Tech stack, key decisions, 2-3 sentences max.

## Files in Scope
- `path/to/file1.ts` — [what changes]
- `path/to/file2.ts` — [what changes]

## Batch 1: [Name]
- [ ] Task 1.1: [S] [description] | Verify: [method]
- [ ] Task 1.2: [M] [description] | Verify: [method]
  - Prerequisite: Task 1.1

## Risks / Open Questions
- [Known unknowns or potential blockers]
```

### 3-4. Pre-Decomposition Check

Before creating the plan:
- [ ] Required types/interfaces have the necessary fields?
- [ ] External package APIs behave as expected?
- [ ] Cross-package dependencies identified?

---

## UDEC 3. EXECUTE — Execution Protocol

### 4-1. Batch Execution

1. **Adaptive batch size**:
   - Simple/mechanical changes (imports, types, config, migration): 5-10 per batch
   - Standard changes (feature add/modify): 3-4 per batch
   - Complex changes (new module, architecture): 1-2 per batch
2. **Checkpoint**: report results after each batch + wait for user feedback
3. **Report content**: what was done / verification results / next batch preview
4. **On blockers**: stop immediately and report (do not guess)

### 4-2. Verification Strategy (Risk-Based)

Choose verification proportional to the **risk of the change**, not the file path:

| Risk Level | When | Verification |
|------------|------|-------------|
| **High** | Business logic, data mutation, auth, state machines, calculations | TDD required: failing test → implement → pass |
| **Medium** | New components with logic, API integration, config that affects behavior | Build + runtime check (dev server, API call, etc.) |
| **Low** | Imports, types, style/layout, renaming, mechanical migration | Build/lint passes |

**Core Rules:**
1. Never claim completion without fresh verification evidence
2. Never commit code that doesn't build
3. For high-risk: write failing test first → minimal code to pass → verify
4. For medium/low: run build/lint after changes → confirm no regressions

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
- 3 consecutive test failures → "Approach problem. Back to UNDERSTAND."
- New package needed → "Confirm with user"
- 5 turns autonomous → "Report progress before continuing"
- Adding workarounds to fix workarounds → "Design problem. Step back."
- Copy-pasting similar code 3+ times → "Need abstraction? Ask user."

### 4-5. Scope Guard

**Only change what was requested. Nothing more, nothing less.**

1. **Was this change explicitly requested?** → proceed
2. **Is it required to make the requested change work?** → proceed
3. **Is it an improvement I noticed while working?** → STOP. Note it, don't do it.
4. **Is it "while I'm here" cleanup?** → STOP. Not your job right now.

**If tempted:** Note it for the user. Ask: "I noticed X could be improved. Want me to address it after the current task?"

### 4-6. Agent Delegation Verification

When delegating work to sub-agents:

1. **Clear instructions**: specify expected output, files to modify, pass criteria
2. **Read actual files** after agent completes — never trust the agent's report alone
3. **Run build/test** to verify the agent's changes work
4. **Fix or retry** if incomplete

**Never mark a delegated task as complete without reading the actual file state.**

---

## UDEC 4. CHECKPOINT — Confirmation Protocol

### 5-1. Batch Checkpoint

After each batch:
- Report what was completed
- Report verification results (with evidence)
- Preview next batch
- "Continue?"

**Checkpoint frequency:**
- **Phase boundary**: always stop (mandatory)
- **Batch boundary**: stop by default → after 3 consecutive approvals, increase batch size for the remainder
- **Blocker encountered**: always stop (mandatory)

**Progress dashboard:**
```
Phase: [phase] | Batch: [N/M] | Tasks: [done/total] ([%])
[████████░░] 80% — Next: [next batch name]
```

### 5-2. Direction Change

User says "change direction" → return to UNDERSTAND
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

### 6-3. Resuming from Handoff

When a session starts and `docs/HANDOFF.md` exists:
1. Read it first
2. Verify the described state matches reality (git status, file contents)
3. Continue from "Next Steps"

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

## 8. Completion Declaration Rules

Never use these phrases without verification:
- "will", "should", "probably", "seems to"

Before declaring completion:
1. **IDENTIFY** — What proves completion?
2. **RUN** — Execute the relevant test/build
3. **READ** — Check the output directly
4. **CLAIM** — Only declare based on evidence
<!-- PRISM:END -->
