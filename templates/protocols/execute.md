# EUDEC 4. EXECUTE — Execution Protocol

## 4-1. Batch Execution

1. **Adaptive batch size**:
   - Simple/mechanical changes (imports, types, config, migration): 5-8 per batch
   - Standard changes (feature add/modify): 3-4 per batch
   - Complex changes (new module, architecture): 1-2 per batch
2. **Git-as-Memory**: commit after each completed batch as a rollback point. Use `git diff` summaries to maintain context in long sessions.
3. **Checkpoint**: report results after each batch + wait for user feedback
4. **Report content**: what was done / verification results / next batch preview
5. **On blockers**: stop immediately and report (do not guess)

## 4-2. Verification Strategy (Risk-Based)

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

| Level | Method | When |
|-------|--------|------|
| 1. Tests | Automated tests (unit, integration, e2e) | Test infrastructure exists |
| 2. Build | Compiles + lint without new errors | No tests for this area |
| 3. Diff | `git diff` reviewed for regressions | No build tooling |

**Every change must have SOME verification.** If no tooling exists, `git diff` review is the minimum.

**Verification scoping**: When running build checks (tsc, lint, etc.), filter output to only changed files. Pre-existing errors in other files are not your concern. Example: `tsc --noEmit 2>&1 | grep -i "<changed-file>"`

**Core Rules:**
1. Never claim completion without fresh **auto** verification evidence
2. Never commit code that doesn't build
3. For high-risk: write failing test first → minimal code to pass → verify
4. For high-risk: write at least one **negative test** (what should this code NOT do? what input should it reject?)
5. For medium/low: run build/lint after changes → confirm no regressions
6. Never list manual verification as a pass criterion — it won't be enforced consistently

## 4-3. Systematic Debugging (Bugfix path)

| Step | Action | Output |
|------|--------|--------|
| 1. Root cause | Read error → reproduce → check recent changes → trace data flow | Hypothesis |
| 2. Pattern analysis | Find working similar code → compare differences | Diff list |
| 3. Hypothesis test | Single hypothesis → minimal change → test one at a time | Result |
| 4. Fix | Write failing test → single fix → verify | Fix complete |

**After 3 failed fixes: STOP. The problem is likely architectural, not local. Discuss with user.**

## 4-4. Self-Correction Triggers

- Same file edited 3+ times → "Possible thrashing. Investigate root cause." → **Fallback: UNDERSTAND (re-examine the problem)**
- Editing file not in plan → "Scope change needed?" → **Fallback: DECOMPOSE (re-classify scope)**
- 3 consecutive test failures → "Approach problem." → **Fallback: ESSENCE (was the essence wrong?)**
- New package needed → "Confirm with user"
- 5 turns autonomous → "Report progress before continuing"
- Adding workarounds to fix workarounds → "Design problem." → **Fallback: ESSENCE (re-extract)**
- Copy-pasting similar code 3+ times → "Need abstraction? Ask user."
- Dependency version mismatch detected → "Resolve before continuing."
- Plan file checkboxes not updated after batch → "Update plan checkboxes and frontmatter before continuing"
- Scope expanding beyond plan → "Scope creep." → **Fallback: DECOMPOSE (re-run scope classification)**
- Error messages changing type across fixes → "Chasing symptoms, not root cause." → **Fallback: ESSENCE**

**Goal Recitation** (prevents drift in long sessions):
- At every batch boundary, re-read the plan file and confirm: "Current work aligns with: [original goal]"
- If current work does not serve the original goal → STOP, report drift, return to plan

**Thrashing Detector** (beyond simple edit counting):
- Successive edits reverting previous changes (oscillation) → "Reverting own work. Wrong approach." → **Fallback: ESSENCE**

## 4-5. Scope Guard

**Only change what was requested. Nothing more, nothing less.**

1. **Was this change explicitly requested?** → proceed
2. **Is it required to make the requested change work?** → proceed
3. **Is it an improvement I noticed while working?** → STOP. Note it, don't do it.
4. **Is it "while I'm here" cleanup?** → STOP. Not your job right now.

**If tempted:** Note it for the user. Ask: "I noticed X could be improved. Want me to address it after the current task?"

## 4-6. Agent Delegation Verification

When delegating work to sub-agents:

1. **Clear instructions**: specify inputs, expected outputs, invariants, and pass criteria
2. **Resource ownership**: each file/module has exactly one agent writing at a time — define non-overlapping scopes upfront
3. **Read actual files** after agent completes — never trust the agent's report alone
4. **Run build/test** to verify the agent's changes work
5. **Fix or retry** if incomplete

**Agent failure recovery**: If a delegated agent partially fails or produces incomplete results:
1. Verify actual file state (read the file, not just the agent's report)
2. If partially correct → complete the remaining work directly
3. If fully wrong → retry with clearer instructions or execute directly

**Never mark a delegated task as complete without reading the actual file state.**

## 4-7. Project-Type Verification Examples

| Project Type | Syntax Check | Smoke Test | Approval Test |
|-------------|-------------|------------|---------------|
| **PHP/WordPress** | `php -l file.php` | `curl` key pages, `wp-cli` commands | Capture page output before/after, diff |
| **Static Sites** | Build completes | Link checker, visual diff of HTML | Compare output directory before/after |
| **Scripts/CLI** | Language syntax check | Run with known inputs, compare outputs | Capture stdout before/after |
| **Infra/Config** | `terraform plan`, `docker build` | Dry-run deploy | Compare plan output before/after |

## 4-8. Checkpoint Integration

Claude Code creates automatic checkpoints on every edit. Use `Esc+Esc` or `/rewind` to restore.
- Before risky changes: checkpoint exists automatically
- After failed batch: consider `/rewind` to restore clean state before retry
- Checkpoints complement Git-as-Memory: git for cross-session, checkpoints for intra-session
