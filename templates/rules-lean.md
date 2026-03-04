
<!-- PRISM:START -->
# Prism — EUDEC Methodology (Lean Mode)

**EUDEC = Essence, Understand, Decompose, Execute, Checkpoint** — the core cycle.

> **Never implement what you haven't understood. Never understand what you haven't distilled to its essence.**

For the full methodology, run `/claude-prism:prism`.

---

## Adaptive Weight (Task Size Routing)

| Weight | Criteria | Path |
|--------|----------|------|
| **Lightweight** | 1-2 files, <50 LOC, clear scope | Essence (1 line) → Execute → Verify → Done |
| **Standard** | 3-5 files, 50-200 LOC | Run `/claude-prism:prism` for full EUDEC guidance |
| **Full** | 6+ files, 200+ LOC, or unclear scope | Run `/claude-prism:prism` for full EUDEC with plan file |

## Task Type Derivation

| Essence Character | Type | Path |
|-------------------|------|------|
| "X is broken" | Bugfix | Fast Path (below) |
| "X should be possible" | Feature | `/claude-prism:prism` |
| "All X must become Y" | Migration | Pattern → batch apply → verify |
| "X's structure must change" | Refactor | `/claude-prism:prism` |

## Bugfix Fast Path

1. Reproduce the symptom
2. Trace to root cause
3. Minimal fix (smallest change that resolves the cause)
4. Verify (test/build/diff)

After 3 failed fixes: STOP. Discuss with user.

## Scope Guard

**Only change what was requested. Nothing more, nothing less.**

1. Was this change explicitly requested? → proceed
2. Is it required to make the requested change work? → proceed
3. Is it an improvement I noticed while working? → STOP. Note it, don't do it.
4. Is it "while I'm here" cleanup? → STOP. Not your job right now.

## Verification & Fallback Ladder

| Level | Method | When |
|-------|--------|------|
| 1. Tests | Automated tests | Test infrastructure exists |
| 2. Build | Compiles + lint without new errors | No tests for this area |
| 3. Diff | `git diff` reviewed for regressions | No build tooling |

**Every change must have SOME verification.** Never claim completion without evidence.

## Self-Correction Triggers

- Same file edited 3+ times → investigate root cause
- Editing file not in plan → scope change needed?
- 3 consecutive test failures → back to essence
- 5 turns autonomous → report progress before continuing
- Adding workarounds to fix workarounds → design problem, step back

## Rationalization Defense

| Excuse | Reality |
|--------|---------|
| "I know what they mean" | Verify. Assumption is the root of all bugs |
| "While I'm here, let me also..." | Scope creep. Note it for later |
| "Too simple to decompose" | Check file count and coupling |
| "I'll add tests later" | High-risk: tests come first |

## Checkpoint Frequency

- **Lightweight**: report completion with evidence, no pause
- **Standard/Full**: run `/claude-prism:prism` for guided checkpoints
- **Blocker encountered**: always stop

## Session Handoff

When context is running low or switching tasks, create `docs/HANDOFF.md` with: Status, Current State, Next Steps, Decisions Made, Known Issues.

## Completion Declaration

Before declaring completion:
1. **IDENTIFY** — What proves completion?
2. **RUN** — Execute the relevant test/build
3. **READ** — Check the output directly
4. **CLAIM** — Only declare based on evidence
<!-- PRISM:END -->
