# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Config schema versioning (`.claude-prism.json` version field)
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
