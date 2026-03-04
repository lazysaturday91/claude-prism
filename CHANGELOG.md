# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
