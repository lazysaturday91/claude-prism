---
name: prism
description: AI coding problem decomposition tool — EUDEC methodology
triggers:
  - "prism"
  - "decompose"
  - "udec"
  - "eudec"
argument-hint: "[task description]"
---

<Purpose>
Prism applies the EUDEC methodology (Essence, Understand, Decompose, Execute, Checkpoint) to any coding task. It prevents the biggest AI coding failure mode: building the wrong thing by skipping essence extraction and understanding.
</Purpose>

<Use_When>
- User says "prism", "decompose", "udec", or "eudec"
- Complex task requiring structured approach (3+ files, unclear scope)
- Vague request that needs clarification before implementation
- User wants disciplined, checkpoint-based execution
</Use_When>

<Do_Not_Use_When>
- Single-file trivial fix (typo, one-line change)
- User explicitly says "just do it" for a clearly defined small task
- Pure research/analysis with no code changes needed
</Do_Not_Use_When>

<Why_This_Exists>
AI agents optimize for speed, not correctness. Without structure, they skip understanding, skip decomposition, and run autonomously for 30 minutes producing something nobody wanted. Prism enforces the discipline that makes AI-assisted coding reliable.
</Why_This_Exists>

<Steps>

## E — ESSENCE

0. **Extract the essence**: Before exploring code, ask: "What is the core problem here — in one sentence, without naming specific tools?"
   - Output: `Essence: [one sentence — no technology/tool names]`
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
5. **Environment validation**: Verify project builds, dependencies match, env config identified. If any fail → resolve first.
6. **Check for hidden assumptions** (Red Flag Detection):

   | Red Flag | Question to Ask Yourself |
   |----------|-------------------------|
   | "Obviously they want X" | Did they actually say X? Or is it my inference? |
   | "Similar to Y" | What are the differences? Similar ≠ identical |
   | "Standard approach is..." | Is this what the user wants, or my default? |
   | "Simple fix" | Did I read surrounding code? What could break? |
   | Request < 2 sentences | Likely missing context. Explore first. |
   | No file/function names | [Insufficient]. Must ask. |
   | "just", "simply" | Complexity being underestimated |

7. **Question rules** (if questions needed):
   - One question at a time
   - Multiple choice with 2-3 options + recommendation
   - Include reasoning based on code exploration
   - Maximum 3 rounds of questions
8. **Confirm alignment**: Summarize goal in one sentence, get user approval
9. **Analysis-only requests**: If no code change is needed, report findings and ask: "Further action needed?" Do NOT proceed to D/E/C unless the user requests implementation.

## D — DECOMPOSE

10. **Assess complexity** (consider BOTH file count AND logic complexity):
    - [Simple] 1-2 files, minor changes (<50 LOC) → execute directly, no decomposition needed
    - [Medium] 3-5 files, OR 1-2 files with significant logic changes (50-150 LOC) → 2-3 batches
    - [Complex] 6+ files, OR substantial architectural changes → 5+ batches, must create plan file
    - [Complex system] Unclear scope → reduce scope first, then decompose
11. **Create batches** following the 5 principles:
    - Unit size: 2-5 minutes each (test/implement/verify as separate steps)
    - Test first: test before implementation in each unit
    - Independent verification: each unit has a pass criterion
    - Files specified: list files to create/modify per unit
    - Dependencies noted: mark if unit depends on a previous one
12. **Assign size tags** to every task: [S] <30 LOC, [M] 30-100 LOC, [L] >100 LOC
    - Batch composition: S+S+M = 1 batch, L = 1 batch alone
13. **Assign verification strategy** per task: `| Verify: TDD` or `| Verify: Build` or `| Verify: Visual`
14. **Pre-decomposition checklist**:
    - **Codebase audit**: grep/search to verify targets actually exist in code
    - **Cross-plan check**: if other plans exist in `docs/plans/`, identify overlapping files
    - Required types/interfaces have the necessary fields?
    - External package APIs behave as expected?
    - Cross-package dependencies identified and noted as prerequisites?
15. **Quality gate**: Plan file exists and targets verified, project builds, dependencies resolved, environment validated. All must pass before execution.
16. **Save plan** to `docs/plans/YYYY-MM-DD-<topic>.md`
17. **Get approval**: "Proceed with this plan?"

## X — EXECUTE

18. Execute in adaptive batches:
    - Simple changes (imports, types, config): 5-8 per batch
    - Standard changes (feature add/modify): 3-4 per batch
    - Complex changes (new module, architecture): 1-2 per batch
19. **Git-as-Memory**: commit after each completed batch as a rollback point. Use `git diff` summaries to maintain context in long sessions.
20. Apply risk-based verification:
    - **High risk** (business logic, auth, data mutation): TDD — failing test → implement → pass. Include negative tests.
    - **Medium risk** (new components with logic, API integration): Build + lint pass
    - **Low risk** (imports, types, style, renaming): Build/lint passes
    - **No test infra** (legacy PHP, WordPress, etc.): Grep-based static check + syntax validation
    - Use **Verification Fallback Ladder**: Automated Tests → Approval Testing → Build → Lint → Smoke Check → Manual Diff Review (use highest available level)
21. **Scope Guard**: Before each change, ask: "Was this requested?" If no → don't do it
22. **Goal Recitation**: At every batch boundary, re-read the plan and confirm: "Current work aligns with: [original goal]"
23. **Self-correction triggers (Thrashing Detector)**:
    - Same file edited 3+ times **on the same region/logic** → stop, investigate root cause
    - File not in plan → pause, ask about scope change
    - 3 consecutive test failures → stop, reconsider approach
    - New package needed → ask user first
    - Adding workarounds on workarounds → design problem, step back
    - Successive edits reverting previous changes (oscillation) → wrong approach
    - Scope expanding beyond plan → scope creep, return to DECOMPOSE
    - Error messages changing type across fixes → chasing symptoms, back to UNDERSTAND
24. **Verification scoping**: Filter build output to only changed files. Pre-existing errors are not your concern.
25. **Agent failure recovery**: If a delegated agent partially fails:
    1. Verify actual file state (read the file, not just the agent's report)
    2. If partially correct → complete the remaining work directly
    3. If fully wrong → retry with clearer instructions or execute directly

## C — CHECKPOINT

26. **Quality gate**: All batch tasks terminal, build passes with zero new errors, no uncommitted changes, plan file updated with `[x]` status. If any fail → continue in EXECUTE.
27. After each batch, report using this format:

    | Item | Before | After |
    |------|--------|-------|
    | [what changed] | [old behavior] | [new behavior] |

    ```
    Phase: [current] | Batch: [N/M] | Tasks: [done/total] ([%])
    [████████░░] 80% — Next: [next batch name]
    Plan freshness: verified [date] | Remaining targets: [N] confirmed in code
    ```

28. **Plan-Reality sync**: Grep for plan targets, mark vanished targets as "already completed", add newly discovered targets.
29. Include: verification results, files modified, tests status
30. **Checkpoint policy**: after 3 consecutive approvals, increase batch size to 5-8 for the rest of the phase
31. Ask: "Continue to next batch?"
32. User can redirect, adjust scope, or stop at any checkpoint

## OMC Integration

If oh-my-claudecode is detected in this environment:
- Use `explore` agent for codebase exploration in the UNDERSTAND phase
- Use `architect` agent for complex decomposition decisions
- Use `executor` agents for parallel batch execution when tasks are independent
- Use `verifier` agent for checkpoint verification
- Scope Guard thresholds are automatically raised for sub-agents (8 warn / 12 block vs default 4 warn / 7 block for standalone mode)

</Steps>
