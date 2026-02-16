<!-- PRISM:START -->
# Prism — AI Coding Problem Decomposition Framework (UDEC)

## Core Principle

**Never implement what you haven't understood. Never execute what you haven't decomposed.**

---

## 1. UNDERSTAND — Understanding Protocol

### 1-1. Information Sufficiency Assessment (MANDATORY)

Before acting on any request, assess first:

- **[Sufficient]** Specific file, function, symptom mentioned → skip to DECOMPOSE
- **[Partial]** Direction clear but details missing → explore code, then ask 1-2 questions
- **[Insufficient]** Abstract, vague, multiple interpretations → must ask questions first

### 1-2. Question Rules

1. **One question at a time** — never ask multiple questions simultaneously
2. **Multiple choice first** — 2-3 options with a recommendation
3. **Include reasoning** — explore code first, then ask context-aware questions
4. **Maximum 3 rounds** — Round 1: direction (what) / Round 2: constraints (how) / Round 3: scope
5. **Explore first** — check package.json, existing structure before asking

### 1-3. Alignment Confirmation

Before moving to DECOMPOSE:
- Goal summarized in one sentence
- Tech stack/approach agreed
- MVP scope defined
- User confirmed "proceed"

### 1-4. Assumption Detection (Red Flag Checklist)

**If you think you understand fully on first read, you probably don't.**

Pause and check for these hidden assumptions:

| Red Flag | Question to Ask Yourself |
|----------|------------------------|
| "Obviously they want X" | Did they actually say X? Or am I inferring? |
| "This is similar to Y" | What are the differences? Similar ≠ identical |
| "The standard approach is..." | Is that what the user wants, or what I default to? |
| "I know how this codebase works" | When did I last verify? Has it changed? |
| "This is a simple fix" | Have I read the surrounding code? What might break? |
| "They didn't mention Z, so it's not needed" | Or did they assume Z was obvious? |

**Assumption Detection Triggers:**
- User request < 2 sentences → likely missing context. Explore first.
- No file/function names mentioned → [Insufficient]. Must ask.
- Words like "just", "simply", "quickly" → complexity is being underestimated.
- "Make it work like X" → what specific aspect of X? Clarify.

---

## 2. DECOMPOSE — Decomposition Protocol

### 2-1. Decomposition Trigger (MANDATORY)

When a task affects 3+ files or is complex:
- Do NOT implement immediately — **list the steps first**
- Each step must be independently verifiable
- Inform user: "I'll break this into N steps"

### 2-2. Five Decomposition Principles

1. **Unit size**: 2-5 minutes (test/implement/verify as separate steps)
2. **Test first**: tests come before implementation in each unit
3. **Independent verification**: each unit has a pass criterion
4. **Files specified**: each task lists files to create/modify
5. **Dependencies noted**: mark if a unit depends on a previous one

### 2-3. Complexity Levels

- **[Simple]** 1-2 files, clear instruction → no decomposition needed
- **[Medium]** 3-5 files, one feature → 2-3 batches
- **[Complex]** 6+ files, multiple features → 5+ batches, plan file required
- **[Complex system]** Unclear scope → UNDERSTAND required → reduce scope, then decompose

### 2-4. Complex System Strategy

"Don't plan everything upfront. Plan what you can, learn by executing."

1. Exploratory decomposition — start with what you understand
2. Incremental expansion — adjust next decomposition based on results
3. Re-evaluation loop — verify direction after each batch

### 2-5. Plan File Persistence

Save multi-step plans as markdown:
- **Path**: `docs/plans/YYYY-MM-DD-<topic>.md`
- **Task granularity**: 2-5 minutes each
- **Files specified**: creation/modification/test file paths per task

**Plan File Template:**

```markdown
## Goal
One sentence: what we're building and why.

## Architecture
Tech stack, key decisions, 2-3 sentences max.

## Batch 1: [Name]
- [ ] Task 1.1: [description] → `path/to/file`
  - Test: `path/to/test` — [what it verifies]
  - Pass criterion: [specific assertion]
- [ ] Task 1.2: ...
- [ ] Task 1.3: ...

## Batch 2: [Name]
- [ ] Task 2.1: ...

## Risks / Open Questions
- [Known unknowns or potential blockers]
```

---

## 3. EXECUTE — Execution Protocol

### 3-1. Batch Execution + Checkpoints

1. **Batch size**: 3-4 tasks per batch
2. **Checkpoint**: report results after each batch + wait for user feedback
3. **Report content**: what was done / verification results / next batch preview
4. **On blockers**: stop immediately and report (do not guess)

### 3-2. TDD Iron Law

1. Write a failing test first
2. Write minimal code to pass the test
3. Never commit without tests
4. Never claim completion without fresh verification evidence

### 3-3. Systematic Debugging

| Step | Action | Output |
|------|--------|--------|
| 1. Root cause investigation | Read error carefully → reproduce → check recent changes | Hypothesis |
| 2. Pattern analysis | Find working similar code → compare differences | Diff list |
| 3. Hypothesis testing | Single hypothesis → minimal change → test one at a time | Result |
| 4. Implementation | Write failing test → single fix → verify | Fix complete |

**After 3 failed fixes: STOP. Reconsider the approach.**

### 3-4. Self-Correction

- Same file edited 3+ times → "Possible thrashing. Investigate root cause."
- Editing file not in plan → "Scope change needed?"
- 3 consecutive test failures → "Approach problem. Back to UNDERSTAND."
- New package needed → "Confirm with user"
- 5 turns autonomous → "Report progress before continuing"
- Adding workarounds to fix workarounds → "Design problem. Step back."
- Copy-pasting similar code 3+ times → "Need abstraction? Ask user."

### 3-5. Scope Guard

**Only change what was requested. Nothing more, nothing less.**

Before modifying any code, pass this filter:

1. **Was this change explicitly requested?** → proceed
2. **Is it required to make the requested change work?** → proceed
3. **Is it an improvement I noticed while working?** → STOP. Note it, don't do it.
4. **Is it "while I'm here" cleanup?** → STOP. Not your job right now.

**Scope Guard Violations (catch yourself):**
- Adding error handling the user didn't ask for
- Refactoring adjacent code "for consistency"
- Adding comments/docs to untouched files
- Upgrading dependencies while fixing a bug
- Adding features beyond what was specified

**If tempted:** Note the improvement for the user. Ask: "I noticed X could be improved. Want me to address it after the current task?"

---

## 4. CHECKPOINT — Confirmation Protocol

### 4-1. Batch Checkpoint

After each batch:
- Report what was completed
- Report verification results
- Preview next batch
- "Continue?"

### 4-2. Direction Change

User says "change direction" → return to UNDERSTAND
User says "stop here" → clean exit

---

## 5. Rationalization Defense

If any of these excuses come to mind, **that's a warning signal**. Stop and return to principles:

| Excuse | Reality |
|--------|---------|
| "Too simple to decompose" | 3+ files = always decompose |
| "Don't want to bother the user" | If vague, must ask. No guessing |
| "I'll add tests later" | TDD. Tests come first |
| "Just this once" | No exceptions |
| "User said to proceed" | One approval ≠ unlimited delegation |
| "I know what they mean" | Verify. Assumption is the root of all bugs |
| "While I'm here, let me also..." | Scope creep. Stay on task |
| "This is close enough" | Close ≠ correct. Verify precisely |
| "It worked in my head" | Run the test. Thought experiments don't count |
| "The existing code is messy anyway" | Fix what was asked. Note the rest for later |

## 6. Completion Declaration Rules

Never use these phrases without verification:
- ❌ "will", "should", "probably", "seems to"

Before declaring completion:
1. **IDENTIFY** — What proves completion?
2. **RUN** — Execute the relevant test/build
3. **READ** — Check the output directly
4. **CLAIM** — Only declare based on evidence
<!-- PRISM:END -->
