# /claude-prism:prism — Problem Decomposition

When this command is invoked, follow the EUDEC framework strictly:

## E — ESSENCE

0. **Extract the essence**: Before exploring code, ask: "What is the core problem here — in one sentence, without naming specific tools?"
   - Output: `Essence: [one sentence]`
   - Output: `Minimal case: [simplest working version]`
   - Output: `Expansion path: minimal → [step1] → [step2] → [complete]`
1. **Verify essence quality**:
   - Does the essence sentence avoid specific technology names? If not → still at solution level, go higher
   - Is the minimal case truly minimal? Can it be reduced further?
   - Symptom vs cause: "Is this the cause, or a consequence?"
   - Solution vs essence: "Caching" is a solution. "Eliminating redundant computation" is the essence.
2. **Derive task type** from the essence:

   | Essence Character | Type | Path |
   |-------------------|------|------|
   | "X is broken" | Bugfix | UNDERSTAND → locate → fix → verify |
   | "X should be possible" | Feature | UNDERSTAND → DECOMPOSE → EXECUTE → CHECKPOINT |
   | "All X must become Y" | Migration | UNDERSTAND → pattern → batch apply → verify |
   | "X's structure must change" | Refactor | UNDERSTAND → DECOMPOSE → EXECUTE → CHECKPOINT |
   | "Why does X happen?" | Investigation | explore → analyze → report |

## U — UNDERSTAND

3. **Explore first**: Read package.json, project structure, related files before asking anything
4. **Assess information sufficiency**:
   - [Sufficient] Specific file, function, symptom mentioned → skip to DECOMPOSE
   - [Partial] Direction clear but details missing → explore then ask 1-2 questions
   - [Insufficient] Abstract, vague, multiple interpretations → must ask questions first
5. **Check for hidden assumptions** (Red Flag Detection):

   | Red Flag | Question to Ask Yourself |
   |----------|-------------------------|
   | "Obviously they want X" | Did they actually say X? Or is it my inference? |
   | "Similar to Y" | What are the differences? Similar ≠ identical |
   | "Standard approach is..." | Is this what the user wants, or my default? |
   | "Simple fix" | Did I read surrounding code? What could break? |
   | Request < 2 sentences | Likely missing context. Explore first. |
   | No file/function names | [Insufficient]. Must ask. |
   | "just", "simply" | Complexity being underestimated |

6. **Question rules** (if questions needed):
   - One question at a time
   - Multiple choice with 2-3 options + recommendation
   - Include reasoning based on code exploration
   - Maximum 3 rounds of questions
7. **Confirm alignment**: Summarize goal in one sentence, get user approval
8. **Analysis-only requests**: If no code change is needed (architecture review, cause analysis, investigation), report findings and ask: "Further action needed?" Do NOT proceed to D/E/C unless the user requests implementation.

## D — DECOMPOSE

9. **Assess complexity** (consider BOTH file count AND logic complexity):
   - [Simple] 1-2 files, minor changes (<50 LOC) → execute directly, no decomposition needed
   - [Medium] 3-5 files, OR 1-2 files with significant logic changes (50-150 LOC) → 2-3 batches
   - [Complex] 6+ files, OR substantial architectural changes → 5+ batches, must create plan file
   - [Complex system] Unclear scope → reduce scope first, then decompose
10. **Create batches** following the 5 principles:
    - Unit size: 2-5 minutes each (test/implement/verify as separate steps)
    - Test first: test before implementation in each unit
    - Independent verification: each unit has a pass criterion
    - Files specified: list files to create/modify per unit
    - Dependencies noted: mark if unit depends on a previous one
11. **Assign size tags** to every task: [S] <30 LOC, [M] 30-100 LOC, [L] >100 LOC
    - Batch composition: S+S+M = 1 batch, L = 1 batch alone
12. **Assign verification strategy** per task: `| Verify: TDD` or `| Verify: Build` or `| Verify: Visual`
13. **Pre-decomposition checklist**:
    - Required types/interfaces have the necessary fields?
    - External package APIs behave as expected?
    - Cross-package dependencies identified and noted as prerequisites?
14. **Save plan** to `docs/plans/YYYY-MM-DD-<topic>.md`
15. **Get approval**: "Proceed with this plan?"

## E — EXECUTE

16. Execute in adaptive batches:
    - Simple changes (imports, types, config): 5-8 per batch
    - Standard changes (feature add/modify): 3-4 per batch
    - Complex changes (new module, architecture): 1-2 per batch
17. Apply context-aware verification:
    - `lib/`, `utils/`, `store/`, `hooks/`, `services/` → TDD (failing test → implement → verify)
    - `components/`, `pages/`, `views/` → Build verification (escalate to TDD if complex logic)
    - `config/`, `styles/`, `types/` → Build/lint only
18. **Scope Guard**: Before each change, ask: "Was this requested?" If no → don't do it
19. **Self-correction triggers**:
    - Same file edited 3+ times **on the same region/logic** → stop, investigate root cause (progressive edits across different regions — imports, logic, JSX — are normal)
    - File not in plan → pause, ask about scope change
    - 3 consecutive test failures → stop, reconsider approach
    - New package needed → ask user first
    - Adding workarounds on workarounds → design problem, step back
20. **Verification scoping**: When running build checks (tsc, lint, etc.), filter output to only changed files. Pre-existing errors in other files are not your concern. Example: `tsc --noEmit 2>&1 | grep -i "<changed-file>"`
21. **Agent failure recovery**: If a delegated agent partially fails or produces incomplete results:
    1. Verify actual file state (read the file, not just the agent's report)
    2. If partially correct → complete the remaining work directly
    3. If fully wrong → retry with clearer instructions or execute directly

## C — CHECKPOINT

22. After each batch, report using this format:

    | Item | Before | After |
    |------|--------|-------|
    | [what changed] | [old behavior] | [new behavior] |

    ```
    Phase: [current] | Batch: [N/M] | Tasks: [done/total] ([%])
    [████████░░] 80% — Next: [next batch name]
    ```

23. Include: verification results, files modified, tests status
24. **Checkpoint policy**: after 3 consecutive approvals, increase batch size to 5-8 for the rest of the phase
25. Ask: "Continue to next batch?"
26. User can redirect, adjust scope, or stop at any checkpoint

## OMC Integration

If oh-my-claudecode is detected in this environment:
- Use `explore` agent for codebase exploration in the UNDERSTAND phase
- Use `architect` agent for complex decomposition decisions
- Use `executor` agents for parallel batch execution when tasks are independent
- Use `verifier` agent for checkpoint verification
- Scope Guard thresholds are automatically raised for sub-agents (8 warn / 12 block vs default 4 warn / 7 block for standalone mode)
