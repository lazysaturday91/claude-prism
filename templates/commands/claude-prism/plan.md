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

## View [plan]

If user specifies a plan file:

1. **Read** the specified plan file
2. **Show progress** with completion percentage
3. **Highlight** current batch (first batch with incomplete tasks)
4. **List blockers** from "Risks / Open Questions" section

## Complete [plan]

1. Resolve target plan (argument or most recent active)
2. Read frontmatter, validate transition: active → completed
3. Update frontmatter: `status: completed`, `completed_at: YYYY-MM-DD`
4. Append to `.prism/plans/.history.jsonl`
5. Report: "✅ Plan completed: <plan> (N/N tasks done)"

## Archive [plan]

1. Resolve target plan
2. Validate: must be `completed` status
3. Update frontmatter: `status: archived`, `archived_at: YYYY-MM-DD`
4. Append history event
5. Report: "📦 Plan archived: <plan>"

## Block [plan] [reason]

1. Resolve target plan
2. Validate: `active` or `draft` status
3. Update frontmatter: `status: blocked`, `blocked_reason: <reason>`
4. Append history event
5. Report: "🚫 Plan blocked: <plan> — <reason>"

## Unblock [plan]

1. Resolve target plan
2. Validate: must be `blocked` status
3. Update frontmatter: `status: active`, remove `blocked_reason`
4. Append history event
5. Report: "📋 Plan unblocked: <plan>"

## Abandon [plan]

1. Resolve target plan
2. Validate: not already terminal (archived/abandoned)
3. Update frontmatter: `status: abandoned`, `abandoned_at: YYYY-MM-DD`
4. Append history event
5. Report: "🗑️ Plan abandoned: <plan>"

## Reopen [plan]

1. Resolve target plan
2. Validate: must be `completed` status
3. Update frontmatter: `status: active`, remove `completed_at`
4. Append history event
5. Report: "📋 Plan reopened: <plan>"

## History [plan]

1. Read `.prism/plans/.history.jsonl`
2. If plan specified, filter by plan filename
3. Format as timeline:
   ```
   📜 Plan History: <plan>
   [2026-03-06 12:00] 📝 Created
   [2026-03-06 12:05] 📋 draft → active (First task checked)
   [2026-03-06 14:00] 📊 Progress: 5/8 (62%)
   [2026-03-06 15:00] ✅ active → completed (All 8 tasks done)
   ```
4. If no plan specified, show last 20 events across all plans

## Status

1. Read all plans via getAllPlans()
2. Group by status
3. Display dashboard:
   ```
   📊 Plan Status Dashboard

   📋 Active (2)
     • 2026-03-06-feature-x.md — 60% (6/10)
     • 2026-03-05-bugfix-y.md — 30% (3/10)

   🚫 Blocked (1)
     • 2026-03-04-migration.md — reason: waiting for API v2

   ✅ Completed (3)
   📦 Archived (5)
   🗑️ Abandoned (1)
   ```
