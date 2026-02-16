---
name: prism
description: AI coding problem decomposition tool — UDEC methodology
triggers:
  - "prism"
  - "decompose"
  - "udec"
argument-hint: "[task description]"
---

<Purpose>
Prism applies the UDEC methodology (Understand, Decompose, Execute, Checkpoint) to any coding task. It prevents the biggest AI coding failure mode: building the wrong thing by skipping understanding and decomposition.
</Purpose>

<Use_When>
- User says "prism", "decompose", or "udec"
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

## U — UNDERSTAND

1. **Explore first**: Read package.json, project structure, related files before asking anything
2. **Assess information sufficiency**:
   - [Sufficient] Specific file, function, symptom mentioned → skip to DECOMPOSE
   - [Partial] Direction clear but details missing → explore then ask 1-2 questions
   - [Insufficient] Abstract, vague, multiple interpretations → must ask questions first
3. **Check for hidden assumptions** (Red Flag Detection):

   | Red Flag | Question to Ask Yourself |
   |----------|-------------------------|
   | "Obviously they want X" | Did they actually say X? Or is it my inference? |
   | "Similar to Y" | What are the differences? Similar ≠ identical |
   | "Standard approach is..." | Is this what the user wants, or my default? |
   | "Simple fix" | Did I read surrounding code? What could break? |
   | Request < 2 sentences | Likely missing context. Explore first. |
   | No file/function names | [Insufficient]. Must ask. |
   | "just", "simply" | Complexity being underestimated |

4. **Question rules** (if questions needed):
   - One question at a time
   - Multiple choice with 2-3 options + recommendation
   - Include reasoning based on code exploration
   - Maximum 3 rounds of questions
5. **Confirm alignment**: Summarize goal in one sentence, get user approval
6. **Analysis-only requests**: If no code change is needed, report findings and ask: "Further action needed?" Do NOT proceed to D/E/C unless the user requests implementation.

## D — DECOMPOSE

7. **Assess complexity** (consider BOTH file count AND logic complexity):
   - [Simple] 1-2 files, minor changes (<50 LOC) → execute directly, no decomposition needed
   - [Medium] 3-5 files, OR 1-2 files with significant logic changes (50-150 LOC) → 2-3 batches
   - [Complex] 6+ files, OR substantial architectural changes → 5+ batches, must create plan file
   - [Complex system] Unclear scope → reduce scope first, then decompose
8. **Create batches** following the 5 principles:
   - Unit size: 2-5 minutes each (test/implement/verify as separate steps)
   - Test first: test before implementation in each unit
   - Independent verification: each unit has a pass criterion
   - Files specified: list files to create/modify per unit
   - Dependencies noted: mark if unit depends on a previous one
9. **Save plan** to `docs/plans/YYYY-MM-DD-<topic>.md`
10. **Get approval**: "Proceed with this plan?"

## E — EXECUTE

11. Execute one batch at a time (3-4 tasks per batch)
12. Follow TDD: write failing test → implement → verify → commit
13. **Scope Guard**: Before each change, ask: "Was this requested?" If no → don't do it
14. **Self-correction triggers**:
    - Same file edited 3+ times on the same region/logic → stop, investigate root cause
    - File not in plan → pause, ask about scope change
    - 3 consecutive test failures → stop, reconsider approach
    - New package needed → ask user first
    - Adding workarounds on workarounds → design problem, step back
15. **Verification scoping**: When running build checks, filter output to only changed files.
16. **Agent failure recovery**: If a delegated agent partially fails:
    1. Verify actual file state (read the file, not just the agent's report)
    2. If partially correct → complete the remaining work directly
    3. If fully wrong → retry with clearer instructions or execute directly

## C — CHECKPOINT

17. After each batch, report using this format:

    | Item | Before | After |
    |------|--------|-------|
    | [what changed] | [old behavior] | [new behavior] |

18. Include: verification results, files modified, tests status
19. Ask: "Continue to next batch?"
20. User can redirect, adjust scope, or stop at any checkpoint

## OMC Integration

If oh-my-claudecode is detected in this environment:
- Use `explore` agent for codebase exploration in the UNDERSTAND phase
- Use `architect` agent for complex decomposition decisions
- Use `executor` agents for parallel batch execution when tasks are independent
- Use `verifier` agent for checkpoint verification

</Steps>
