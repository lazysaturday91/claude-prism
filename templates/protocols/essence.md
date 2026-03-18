# EUDEC 1. ESSENCE — Essence Extraction Protocol

Starting point for all work. Strip down to the core of the problem before implementation.

Essence = "the thing without which it ceases to be what it is."

## 1-1. Entry Judgment

Before extracting essence, determine the approach:

> "Can existing elements be removed from this problem?" (Are there references, prior art, existing solutions?)

| Answer | Meaning | Path |
|--------|---------|------|
| **YES** | References, existing products, prior art exist | → Top-down (removal method) |
| **NO** | No precedent, blank slate, novel domain | → Bottom-up (competitive exploration) |
| **PARTIAL** | Some parts have references, some don't | → Hybrid (split, apply each path independently, merge in output) |

Most coding tasks are **YES** (top-down). Bottom-up is for genuinely novel problems (new product direction, undefined feature space).

## 1-2. Essence Extraction — Top-Down (Removal Method)

The default path. Remove non-essential elements to reveal what remains.

```
Step 1. List all components of the problem/system
Step 2. Remove one at a time, asking:
        "Without this, is it still the thing?"
          → YES (still the thing) → not essential, remove
          → NO  (no longer the thing) → essence candidate
Step 3. Validate remaining candidates:
        "Do these alone justify the thing's existence?"
          → YES → essence confirmed
          → NO  → restore one removed item, re-test
Step 4. Counterexample test:
        "Can I name one scenario where this essence is wrong?"
          → NO  → proceed
          → YES → weaken confidence, document the counterexample, and verify the essence still holds from a different angle (e.g., different user persona, edge case, or opposing assumption)
```

**Output format:**
```
## ESSENCE
- Essence: [one sentence — no technology/tool names]
- Minimal case: [simplest working form]
- Expansion path: minimal → [step1] → [step2] → [complete]
```

## 1-3. Essence Extraction — Bottom-Up (Competitive Exploration)

For novel problems with no prior art. Generate multiple essence candidates, compete them, select the survivor.

```
Step 1. Collect broadly (don't judge yet — quantity > quality)
        Stop when: information saturates OR 3+ independent perspectives gathered OR time box hit
Step 2. Filter (two-pass):
        1st pass: gut feel — strong / moderate / weak (drop weak)
        2nd pass: score remaining on frequency (1-3), impact (1-3), connectivity (1-3)
        → 7-9 points: essence candidate
        → 4-6 points: support element (reuse in DECOMPOSE)
Step 3. Cluster similar candidates → select top 2-3
        If only 1 candidate remains → create its opposite, compete them
Step 4. Parallel exploration: "If this were the essence, what would we build?"
        → Score difference ≤2 or irreversible decision → explore all equally
        → Score difference >2 and reversible → staged elimination
Step 5. Converge: which candidate solves the user's problem more directly?
        Feasibility is NOT a factor here (that's DECOMPOSE's job)
```

## 1-4. Task Type Derivation

The task type naturally emerges from the essence:

| Essence Character | Type | Path |
|-------------------|------|------|
| "X is broken" | Bugfix | Fast Path (1-5) |
| "X should be possible" | Feature | UNDERSTAND → DECOMPOSE → EXECUTE → CHECKPOINT |
| "All X must become Y" | Migration | UNDERSTAND → pattern → batch apply → verify |
| "X's structure must change" | Refactor | UNDERSTAND → DECOMPOSE → EXECUTE → CHECKPOINT |
| "Why does X happen?" | Investigation | explore → analyze → report |

**Migration shortcut**: When applying the same transformation to 10+ files, don't decompose into individual file tasks. Define the pattern once, apply in batches of 5-10, verify after each batch. Scope guard thresholds are raised automatically when a plan file exists.

## 1-5. Essence Validation (Error Prevention)

| Trap | Response |
|------|----------|
| Mistaking symptom for essence | "Is this the cause, or a consequence?" |
| Mistaking solution for essence | "Add caching" is not the essence. "Eliminate redundant computation" is. |
| Too abstract | "Can I write even one line of code from this?" |
| Too specific | "What's the real problem one level up?" |

**Core test**: If the essence statement contains specific technology/tool names → it's still at solution level, not essence. Go one level higher.

## 1-6. Adaptive Weight (Task Size Routing)

After extracting essence and task type, assess task weight to select the appropriate EUDEC path:

| Weight | Criteria | Path |
|--------|----------|------|
| **Lightweight** | 1-2 files, <50 LOC, clear scope | Essence (1 line) → Execute → Verify → Done |
| **Standard** | 3-5 files, 50-200 LOC | Full EUDEC, summary checkpoints |
| **Full** | 6+ files, 200+ LOC, or unclear scope | Full EUDEC with plan file + full checkpoints |

**Lightweight path** skips formal UNDERSTAND (sufficiency assessment, question rounds, alignment confirmation) and DECOMPOSE. The essence statement still grounds the work but takes one line, not a full section. Record: append 1-line summary to `docs/PROJECT-MEMORY.md` (what was changed and why).

**Bugfix fast path** (regardless of file count):
1. Reproduce the symptom
2. Trace to root cause
3. Minimal fix (smallest change that resolves the cause)
4. Verify (test/build/diff)

Bugfixes skip ESSENCE extraction, UNDERSTAND ceremony, and DECOMPOSE entirely. The 4-step debugging protocol (4-3) is the complete path.

## 1-7. Quality Gate: ESSENCE → UNDERSTAND

Before moving to UNDERSTAND, verify:
- [ ] Essence statement is technology-neutral (holds without naming specific tools/libraries)
- [ ] Minimal case is truly "minimal" (can it be reduced further?)
- [ ] Each step in the expansion path works independently
- [ ] Task type has been clearly derived
- [ ] Counterexample test passed (no unresolved counterexamples)
