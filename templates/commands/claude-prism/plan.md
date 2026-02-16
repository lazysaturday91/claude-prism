# /claude-prism:plan — Plan File Management

When this command is invoked:

## List Plans

1. **Check** if `docs/plans/` exists. If not, report "No plans directory found. Create one with `/claude-prism:plan create <topic>`."
2. **Scan** `docs/plans/` for all `.md` files
3. **Show each plan** with:
   - Filename and date
   - Goal (first line after `## Goal`)
   - Progress: count [x] vs [ ] tasks
   - Status: Complete / In Progress / Not Started

## Create New Plan

If user requests a new plan:

1. **Determine topic** from user's description
2. **Create file** at `docs/plans/YYYY-MM-DD-<topic>.md`
3. **Use UDEC template** (adapt language to project's `.claude-prism.json` language setting):

```
## Goal
One sentence: what and why.

## Architecture
Tech stack, key decisions, 2-3 sentences.

## Batch 1: [Name]
- [ ] Task 1.1: [Description] → `path/to/file`
  - Test: `path/to/test` — [what to verify]
  - Pass criterion: [specific assertion]
- [ ] Task 1.2: ...

## Batch 2: [Name]
- [ ] Task 2.1: ...

## Risks / Open Questions
- [Known uncertainties or potential blockers]
```

4. **Announce**: "Plan file created. Use /claude-prism:prism to start execution."

## View Specific Plan

If user specifies a plan file:

1. **Read** the specified plan file
2. **Show progress** with completion percentage
3. **Highlight** current batch (first batch with incomplete tasks)
4. **List blockers** from "리스크 / 미결 사항" section
