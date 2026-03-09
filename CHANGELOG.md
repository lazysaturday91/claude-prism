# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.1] — 2026-03-09

### Changed
- **ESSENCE phase expanded** — Entry Judgment (Top-down/Bottom-up/Hybrid), Top-Down Removal Method with Counterexample test, Bottom-Up Competitive Exploration for novel problems
- **Scope Classification** added to DECOMPOSE — Core/Support/Out of Scope concentric circle model; "Out of Scope must not be empty" constraint
- **Self-Correction Triggers** — each trigger now specifies explicit fallback phase (→ ESSENCE/UNDERSTAND/DECOMPOSE); new triggers for scope expansion and error type oscillation
- `rules-lean.md` synced with Entry Judgment summary and fallback annotations

## [1.8.0] — 2026-03-06

### Added
- **Plan progress auto-tracking** — `PostToolUse [Edit|Write]` hook tracks file-level progress against active plan's "Files in Scope"
- `plan-progress-tracker` rule: matches edited files to scoped files, records milestones (25/50/75%), auto-transitions `draft → active` on first edit
- `PostToolUse [Edit|Write]` event matcher added to `settings.json` — enables hooks on file edits, not just Bash commands
- `parseScopedFiles(content)` in `plan-lifecycle.mjs` — extracts file paths from "Files in Scope" section
- `ensureFrontmatter(planPath, content)` in `plan-lifecycle.mjs` — auto-backfills frontmatter for plans without status (derives from checkbox progress)
- Self-Correction Trigger: "Plan file checkboxes not updated after batch"
- 27 new tests covering parseScopedFiles, ensureFrontmatter, plan-progress-tracker, and regression guards

### Fixed
- `mergeSettings()` now compares both command and matcher — prevents skipping new matchers for existing hook commands during `prism update`

## [1.7.2] — 2026-03-06

### Fixed
- **Plan template frontmatter** — EUDEC plan template now includes `status: draft` frontmatter, so plans created during DECOMPOSE phase participate in lifecycle management automatically

## [1.7.1] — 2026-03-06

### Fixed
- **Monorepo hook compatibility** — hooks now use `input.cwd` from Claude Code instead of `process.cwd()` to resolve the correct project root
- `findProjectRoot()` upward search for nearest `.prism/config.json` — prevents wrong config in monorepo setups
- `config.projectRoot` injection for all hook rules — existing `config.projectRoot || process.cwd()` fallbacks now receive the correct value
- All 4 template runners (`precompact`, `session-end`, `subagent-start`, `task-completed`) updated to use `findProjectRoot(input.cwd)`
- `pipeline.mjs` — `runPipeline()`, `runPipelineAsync()`, `loadCustomRules()` all resolve project root from hook input

## [1.7.0] — 2026-03-06

### Added
- **Plan Lifecycle Management** — 6 states (`draft`, `active`, `blocked`, `completed`, `archived`, `abandoned`) with validated state machine transitions
- **Plan History Log** — `.prism/plans/.history.jsonl` records all status changes and progress milestones as timestamped JSONL events
- **8 new `/plan` subcommands** — `complete`, `archive`, `block`, `unblock`, `abandon`, `reopen`, `history`, `status`
- **Auto-complete** — plan auto-transitions to `completed` when all tasks are checked (via task-plan-sync hook)
- **Draft-to-active** — plan auto-transitions from `draft` to `active` on first task check
- **Progress milestones** — 25%, 50%, 75% progress events recorded to history log
- `lib/plan-lifecycle.mjs` — core lifecycle functions (`validateTransition`, `updatePlanStatus`, `appendHistory`, `readHistory`, `resolvePlan`)
- `STATUS_ICONS` export — emoji mapping for all 6 plan statuses
- 3 new message templates (`plan-lifecycle.completed`, `plan-lifecycle.status-changed`, `plan-lifecycle.auto-activated`)
- **Plan Discovery** — `prism init`/`prism update` automatically scans `docs/`, `docs/plans/` for existing plan files and offers to import them into `.prism/plans/` (copy, originals preserved). Plans without frontmatter get auto-assigned status based on task progress (draft/active/completed).

### Changed
- `hooks/task-plan-sync.mjs` — integrates lifecycle auto-transitions (draft→active, active→completed, progress milestones)
- `lib/installer.mjs` — installs 9 lib files (was 8, added `plan-lifecycle.mjs`)
- Backward compatible: plans without frontmatter default to `active` status

## [1.6.1] — 2026-03-06

### Fixed
- Version sync with npm registry (1.6.0 content, version bump only)

## [1.6.0] — 2026-03-05

### Added
- **Session Bootstrap** — `<!-- PRISM:BOOT -->` block auto-injected into CLAUDE.md; instructs agents to read `docs/PROJECT-MEMORY.md`, `docs/HANDOFF.md`, active plans, and `.prism/registry.json` on session start
- **Plan Frontmatter** — plans support YAML frontmatter (`status`, `created`, `depends_on`); `/plan list` shows status icons (📋 active, ✅ completed, 📦 archived, 🚫 blocked)
- **Plan Check** — `/plan check` subcommand detects file overlaps across active plans (cross-plan conflict detection)
- **Docs Scaffolding** — `prism init --docs` creates `docs/` structure with `PROJECT-MEMORY.md`, `HANDOFF.md` templates and `.prism/registry.json` (auto-scans existing docs)
- **Project Registry** — `.prism/registry.json` catalogs SSOT documents, session files, and reference/archive paths
- **Lightweight Recording** — lightweight tasks now record a 1-line summary to `docs/PROJECT-MEMORY.md`
- **HANDOFF Auto-triggers** — rules.md documents PreCompact/SessionEnd hook auto-generation of HANDOFF.md

### Changed
- `getActivePlanInfo()` now filters by frontmatter `status: active` (backward-compatible: no frontmatter = active)
- `dryRun()` shows docs scaffolding actions when `--docs` is used
- `stats.md` plan list shows frontmatter status icons
- `rules-lean.md` Session Handoff section updated with auto-generation info

### New exports
- `parseFrontmatter(content)` — parse YAML-like frontmatter from markdown
- `getAllPlans(projectRoot)` — list all plans with frontmatter + progress info merged
- `detectPlanConflicts(projectRoot)` — find file overlaps across active plans

## [1.6.0-beta.1] — 2026-03-04

### Added
- **Lean Router** — `rulesMode: "lean"` in `.prism/config.json` injects ~80-line behavioral modifiers instead of the full ~500-line methodology
  - Core principle, Adaptive Weight routing, Bugfix Fast Path, Scope Guard, Verification Fallback Ladder, Self-correction triggers, Rationalization Defense, Completion Declaration
  - Standard/Full tasks routed to `/claude-prism:prism` slash command for full EUDEC guidance
  - Fallback: if `rules-lean.md` missing, automatically uses `rules.md`
- `getRulesMode()` export in `lib/config.mjs`
- 5 new lean mode tests

## [1.5.0] — 2026-03-04

### Changed
- **Adaptive Weight routing** — EUDEC path auto-scales by task size (Lightweight/Standard/Full)
- **Bugfix Fast Path** — 4-step lightweight path: symptom → cause → fix → verify (skips formal EUDEC)
- **Verification Fallback Ladder** simplified from 6 levels to 3 (Tests/Build/Diff)
- **Adaptive checkpoints** — frequency proportional to task weight (no pause for lightweight)
- **Rationalization Defense** compressed from 17 to 4 highest-impact items
- Section numbering corrected (4-8 moved after 4-7)
- Package description and keywords updated with "agent harness" positioning

## [1.4.0] — 2026-03-03

### Added
- **4 new hook events** — PreCompact, SessionEnd, SubagentStart, TaskCompleted
  - `precompact-handler` — auto-generates `docs/HANDOFF.md` before context compaction
  - `session-end-handler` — saves HANDOFF + appends session summary to `docs/PROJECT-MEMORY.md`
  - `subagent-scope-injector` — injects current plan batch context into subagent via `additionalContext`
  - `task-plan-sync` — auto-updates plan file checkboxes on task completion (fuzzy keyword match)
- **Native Claude Code plugin** — `.claude-plugin/plugin.json` + `plugin-hooks.json`
  - `claude plugin install claude-prism` for plugin mode
  - `prism init` (CLI mode) remains for CLAUDE.md injection
  - 6 plugin script runners in `scripts/`
- **HTTP webhook dispatcher** (`lib/webhook.mjs`) — non-blocking fire-and-forget notifications
  - Configure via `.prism/config.json` `webhooks` array
  - Events: `compaction`, `session-end`, `batch-complete`
- **HANDOFF.md generator** (`lib/handoff.mjs`) — shared logic for auto-generating session handoff documents
  - Plan progress parsing (checkbox counting, batch detection)
  - Git status integration (branch, uncommitted, recent commits)
- **Checkpoint integration** in EUDEC rules — `Esc+Esc` / `/rewind` references in EXECUTE protocol
- 30 new tests covering all new handlers, utilities, plugin structure, and installer paths

### Changed
- `templates/settings.json` — 6 events (was 2)
- `lib/installer.mjs` — installs 6 runners, 7 rules, 8 libs (was 2/3/6)
- `lib/config.mjs` — defaults include `webhooks` and 4 new hook configs
- `lib/messages.mjs` — 4 new message templates
- `package.json` `files` includes `scripts/`, `.claude-plugin/`, `plugin-hooks.json`

## [1.3.0] — 2026-03-03

### Added
- **`.prism/` brand directory** — unified home for all Prism project files
  - `.prism/config.json` — hook configuration (committed to git, visible on GitHub)
  - `.prism/.version` — installed version (gitignored via `.prism/.gitignore`)
  - `.prism/plans/` — plan files (committed)
- **3-stage migration chain** in `prism update`:
  - `.prism.json` → `.claude-prism.json` → `.prism/config.json`
  - `.claude/.prism-version` → `.prism/.version`
  - `docs/plans/` → `.prism/plans/` (moves files, cleans empty dirs)
- **Backward-compatible fallback** in plan-enforcement hook (`docs/plans/` still checked)
- Migration tests (4 new: config, version, plans, `.claude-prism.json` detection)
- `.prism/.gitignore` auto-creation (ignores `.version`)

### Changed
- Config path: `.claude-prism.json` → `.prism/config.json`
- Version path: `.claude/.prism-version` → `.prism/.version`
- Plans path: `docs/plans/` → `.prism/plans/`
- `.claude-prism.json` removed from `.gitignore` (config is now committed via `.prism/`)
- All templates, commands, and docs updated to reference new paths
- `prism doctor` now detects legacy `.claude-prism.json` as a migration target
- `prism stats` reads plans from `.prism/plans/` with `docs/plans/` fallback
- `prism uninstall` cleans both new and legacy paths

### Migration
Existing users: run `prism update` — all files are automatically migrated. No manual steps needed. The `docs/plans/` fallback ensures hooks work even without migration.

## [1.2.6] — 2026-02-28

### Fixed
- CHANGELOG.md added to npm package `files` (was missing from published tarball)

## [1.2.5] — 2026-02-28

### Fixed
- **Global skill missing Essence phase** — `~/.claude/commands/claude-prism/prism.md` was still UDEC (no Essence). `/claude-prism:prism` and `/prism` now correctly start from ESSENCE.
- **E/E header collision** — `## E — EXECUTE` → `## X — EXECUTE` in slash command/skill files to disambiguate from `## E — ESSENCE`
- **SKILL.md step numbering** — was `3,2,3,4...`, now continuous `0-32`

### Added
- **Analysis-only branch** in UNDERSTAND — skip D/E/C when no code change is needed
- **Verification scoping** in EXECUTE — filter build output to changed files only
- **Agent failure recovery** in EXECUTE — 3-step protocol (verify → complete → retry)
- Backported Git-as-Memory, Goal Recitation, Thrashing Detector, quality gates, Plan-Reality sync to `templates/commands/prism.md` (was only in SKILL.md)

### Changed
- All 4 EUDEC entry points fully synchronized (rules.md, commands/prism.md, SKILL.md, CLAUDE.md)
- README: updated EUDEC Core Cycle diagram, added v1.2.5 feature highlights, documented global install file tree

## [1.2.4] — 2026-02-25

### Fixed
- `prism update` in source repo now updates commands/hooks/lib (was early-returning after rules only)
- All Korean labels → English across all templates (prism.md, SKILL.md, hud.md, omc-hud.mjs)

## [1.2.2] — 2026-02-25

### Fixed
- HUD statusline Korean labels → English (주간→Wkly, day names)

## [1.2.1] — 2026-02-25

### Fixed
- Stats template version now matches package.json (was stuck at v0.1.0)

### Changed
- HUD statusline now fetches usage data directly from Anthropic OAuth API (30s cache TTL)
- No longer depends on OMC for usage cache refresh
- Stale cache fallback when API is unreachable

## [1.0.0] — 2026-02-24

### Added
- `prism analytics [--detail]` CLI command and slash command for usage statistics
- Session event logging in hook pipeline (blocks/warns automatically recorded)
- session.mjs included in installed lib files
- CHANGELOG.md (this file)
- GitHub Actions CI workflow (test on push/PR)
- Config schema versioning (config version field)
- Verification Fallback Ladder (7-level, from automated tests to manual diff)
- Quality Gates between DECOMPOSE→EXECUTE and EXECUTE→CHECKPOINT
- Goal Recitation mechanism at batch boundaries
- Thrashing Detector (oscillation, scope creep, symptom chasing)
- Git-as-Memory protocol (commit per batch as rollback point)
- Environment Validation in UNDERSTAND phase
- Agent Delegation Verification with resource ownership
- Project-type verification examples (PHP, Static Sites, Scripts, Infra)
- Negative testing requirement for high-risk changes
- Project Memory (persistent docs/PROJECT-MEMORY.md)

### Changed
- SKILL.md fully synchronized with rules.md v3 features (10 items)
- doctor.md updated to reflect current file structure (was referencing deleted files)
- plan.md template now includes Related Plans, Codebase Audit, Files in Scope
- checkpoint.md now includes Plan-Reality sync and freshness verification
- prism.md + SKILL.md EXECUTE step numbers fixed (no longer collide with DECOMPOSE)
- Batch size guidance unified to 5-8 for simple/mechanical changes
- OMC Scope Guard thresholds explained (4 warn / 7 block standalone vs 8/12 with OMC)
- Section numbering: Assumption Detection now 2-5 (was duplicate 2-4)
- Command count increased from 7 to 8 (added analytics.md)

### Fixed
- Self-update detection: source repo now uses local templates instead of npx cache (v0.8.1)

## [0.8.0] — 2026-02-22

### Added
- UDEC v3 methodology upgrade based on field feedback and research
- Plan freshness validation and auto/manual verify separation
- Codebase Audit section in plan template
- Related Plans section for cross-plan dependency tracking
- No-test-infra verification row (legacy PHP, WordPress support)
- [S]-only batch size rule (up to 8 per batch)
- Advisory decomposition thresholds (coupling-aware)
- Rationalization Defense entries (4 new)
- Auto-counting in checkpoint command

### Changed
- Verification strategy now risk-based (not path-based)
- Auto vs Manual verification explicitly separated

## [0.7.2] — 2026-02-22

### Added
- Plan freshness validation at checkpoints
- Cross-plan overlap detection

## [0.7.0] — 2026-02-20

### Added
- plan-enforcement hook (warns when editing 6+ files without a plan)
- Reverted from premature 1.0.0 release

### Changed
- Restored 3-hook model (commit-guard, test-tracker, plan-enforcement)

## [0.6.0] — 2026-02-19

### Added
- UDEC v2 methodology
- Scope guard, debug loop, alignment detection hooks

### Removed
- Hooks with high false-positive rate (scope-guard, debug-loop, alignment)

## [0.5.0] — 2026-02-18

### Changed
- English-only base (removed i18n support for simplicity)
- Unified pipeline runners (pre-tool.mjs, post-tool.mjs)

## [0.4.0] — 2026-02-17

### Added
- Pipeline engine for running multiple rules per hook
- Session logging infrastructure
- Alignment detection hook
- i18n support (later removed in 0.5.0)

## [0.3.0] — 2026-02-16

### Added
- Context-aware verification (TDD for logic, build for UI)
- Adaptive batch sizes

## [0.2.2] — 2026-02-15

### Added
- Global install (`prism init --global`)
- OMC skill support

## [0.1.0] — 2026-02-14

### Added
- Initial release
- UDEC methodology framework (Understand, Decompose, Execute, Checkpoint)
- Commit guard hook
- Test tracker hook
- 6 slash commands (prism, checkpoint, plan, doctor, stats, help)
