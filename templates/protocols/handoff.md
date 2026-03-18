# EUDEC 6. HANDOFF — Session Transition Protocol

## 6-1. When to Handoff

- Context window approaching limit (compaction warnings appearing)
- Task is multi-session by nature (multi-day refactor, large migration)
- Switching to a different task mid-session

**Auto-triggers (via Prism hooks):**
- PreCompact hook → auto-generates `docs/HANDOFF.md`
- SessionEnd hook → auto-generates `docs/HANDOFF.md` + appends to `docs/PROJECT-MEMORY.md`

## 6-2. Handoff Document

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

## 6-3. Project Memory (persistent across all sessions)

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

## 6-4. Resuming from Handoff

When a session starts:
1. Read `docs/PROJECT-MEMORY.md` if it exists (persistent context)
2. Read `docs/HANDOFF.md` if it exists (session context)
3. Verify the described state matches reality (git status, file contents)
4. Continue from "Next Steps"
