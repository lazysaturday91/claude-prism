# EUDEC 2. UNDERSTAND — Understanding Protocol

## 2-1. Information Sufficiency Assessment (MANDATORY)

Before acting on any request, assess first:

- **[Sufficient]** Specific file, function, symptom mentioned → skip to PLAN/DECOMPOSE
- **[Partial]** Direction clear but details missing → explore code, then ask 1-2 questions
- **[Insufficient]** Abstract, vague, multiple interpretations → must ask questions first

## 2-2. Question Rules

1. **One question at a time** — never ask multiple questions simultaneously
2. **Multiple choice first** — 2-3 options with a recommendation
3. **Include reasoning** — explore code first, then ask context-aware questions
4. **Maximum 3 rounds** — Round 1: direction (what) / Round 2: constraints (how) / Round 3: scope
5. **Explore first** — check package.json, existing structure before asking

## 2-3. Environment Validation

Before any implementation, verify:
- Project builds from current state (no pre-existing failures)
- Declared dependencies match lock file versions
- Environment-specific config identified (env vars, local services, deploy targets)

If any of these fail → resolve first. Do not implement on a broken baseline.

## 2-4. Alignment Confirmation

Before moving to DECOMPOSE:
- Goal summarized in one sentence
- Tech stack/approach agreed
- MVP scope defined
- User confirmed "proceed"

## 2-5. Assumption Detection (Red Flag Checklist)

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

## 2-6. Analysis-Only Requests

If no code change is needed (architecture review, cause analysis, investigation), report findings and ask: "Further action needed?" Do NOT proceed to DECOMPOSE/EXECUTE/CHECKPOINT unless the user requests implementation.
