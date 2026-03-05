# /claude-prism:plan — Plan File Management

When this command is invoked:

## List Plans

1. **Check** if `.prism/plans/` exists. If not, report "No plans directory found. Create one with `/claude-prism:plan create <topic>`."
2. **Scan** `.prism/plans/` for all `.md` files
3. **Parse frontmatter** for each plan (between `---` markers at file start):
   - `status: active` → 📋
   - `status: completed` → ✅
   - `status: archived` → 📦
   - `status: blocked` → 🚫
   - No frontmatter → 📋 (default: active)
4. **Show each plan** with:
   - Status icon, filename and date
   - Goal (first line after `## Goal`)
   - Progress: count [x] vs [ ] tasks
   - Frontmatter status + task-based progress

## Create New Plan

If user requests a new plan:

1. **Determine topic** from user's description
2. **Create file** at `.prism/plans/YYYY-MM-DD-<topic>.md`
3. **Use EUDEC template** (with frontmatter):

```
---
status: active
created: YYYY-MM-DD
depends_on: []
---

## Goal
One sentence: what we're building and why.

## Architecture
Tech stack, key decisions, 2-3 sentences max.

## Related Plans
- Depends on: `YYYY-MM-DD-<prior-plan>.md` (status: complete/in-progress)
- Shared files: list files that overlap with other active plans
- (Omit this section if no other plans exist)

## Codebase Audit
- Audit date: YYYY-MM-DD
- Targets remaining: N files (verified by grep/search)
- Already completed: N items (by prior work or other branches)
- Evidence: `grep -r "pattern" --include="*.ext" | wc -l` → N

## Files in Scope
- `path/to/file1.ts` — [what changes]
- `path/to/file2.ts` — [what changes]

## Batch 1: [Name]
- [ ] Task 1.1: [S] [description] | Verify: [auto: build/test/lint]
- [ ] Task 1.2: [M] [description] | Verify: [auto: test] [manual: visual check]
  - Prerequisite: Task 1.1

## Risks / Open Questions
- [Known unknowns or potential blockers]
```

4. **Announce**: "Plan file created. Use /claude-prism:prism to start execution."

## Check (file overlap detection)

If user requests a conflict check:

1. **Read all active plans** from `.prism/plans/` (frontmatter `status: active` or no frontmatter)
2. **Parse "Files in Scope"** section from each plan — extract backtick-wrapped file paths
3. **Detect file overlaps** across plans
4. **Report**:
   - ⚠️ File overlap: `path/to/file`
     ← plan-a.md (active)
     ← plan-b.md (active)
   - Recommendation: check dependency order or merge plans
5. If no overlaps found: "✅ No file conflicts across active plans."

## View Specific Plan

If user specifies a plan file:

1. **Read** the specified plan file
2. **Show progress** with completion percentage
3. **Highlight** current batch (first batch with incomplete tasks)
4. **List blockers** from "Risks / Open Questions" section
