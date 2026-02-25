```
                           ╱╲
              ━━━━━━━━━▶  ╱  ╲  ── E  Essence
              complex    ╱    ╲ ── U  Understand
              problem   ╱ PRISM╲── D  Decompose
                       ╱        ╲─ E  Execute
                      ╱__________╲─ C  Checkpoint
```

[![npm version](https://img.shields.io/npm/v/claude-prism)](https://www.npmjs.com/package/claude-prism)
[![license](https://img.shields.io/npm/l/claude-prism)](https://github.com/lazysaturday91/claude-prism/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/claude-prism)](https://nodejs.org)
[![CI](https://github.com/lazysaturday91/claude-prism/actions/workflows/ci.yml/badge.svg)](https://github.com/lazysaturday91/claude-prism/actions/workflows/ci.yml)

> `ai-coding` · `methodology` · `eudec` · `claude-code`

# claude-prism

**EUDEC methodology framework for AI coding agents.**

Installs the EUDEC methodology — **Essence, Understand, Decompose, Execute, Checkpoint** — directly into your project's Claude Code environment. Includes a session transition protocol (Handoff) that bookends the core cycle. Three lightweight hooks enforce the methodology where it matters most.

## The Problem

AI coding agents fail in predictable ways:

| Failure Mode | What Happens | EUDEC Fix |
|---|---|---|
| Skip essence extraction | Solves the wrong problem entirely | ESSENCE phase |
| Skip understanding | Builds the wrong thing for 30 minutes | UNDERSTAND phase |
| No decomposition | One massive change that's hard to review | DECOMPOSE into verifiable batches |
| No verification | "should work" without evidence | Risk-based verification + Fallback Ladder |
| Scope creep | "While I'm here..." changes nobody asked for | Scope Guard + Thrashing Detector |
| Context loss | New session = start from scratch | HANDOFF + Project Memory |

**The biggest failure mode of AI coding isn't bad code — it's building the wrong thing.**

## Core Philosophy

> Never implement what you haven't understood. Never understand what you haven't distilled to its essence.

## What Prism Provides

### 1. EUDEC Methodology (the core product)

Injected into `CLAUDE.md`, EUDEC is a behavioral framework that corrects how AI agents approach tasks:

```
┌─────────────────── EUDEC Core Cycle ──────────────────┐
│ ESSENCE ── Extract core problem → simplify → expand    │
│   │        Task type derivation from essence           │
│ UNDERSTAND ── Sufficiency assessment → ask → align     │
│   │          Environment validation                    │
│ DECOMPOSE ── Batches → plan file → quality gate        │
│   │          Codebase audit → cross-plan check         │
│ EXECUTE ── Adaptive batches → risk-based verification  │
│   │        Goal recitation → thrashing detection       │
│ CHECKPOINT ── Report with evidence → plan-reality sync │
│              (loops back for next batch)                │
└────────────────────────────────────────────────────────┘
    │
    ▼
  HANDOFF ── Session transition doc + Project Memory
                                           (exit protocol)
```

**Task-type aware**: Each task type (bugfix, feature, migration, refactor, investigation) follows a different optimal path. Migrations skip per-file decomposition. Bugfixes skip straight to locate-fix-verify. Investigations skip decomposition entirely.

**Risk-based verification** with Fallback Ladder:
- **High risk** (business logic, auth, state machines): TDD required + negative tests
- **Medium risk** (new components, API integration): Build + runtime check
- **Low risk** (imports, types, renaming): Build/lint passes
- **No test infra** (legacy PHP, WordPress): Grep-based static check + syntax validation
- Fallback: Automated Tests → Approval Testing → Build → Lint → Smoke Check → Manual Diff

**Quality gates** between phases prevent executing on broken baselines.

### 2. Three Focused Hooks

Hooks enforce the methodology at critical points. All three are deterministic (no heuristics, no state accumulation issues):

| Hook | What It Does | Trigger |
|---|---|---|
| **commit-guard** | Blocks commits when tests failed or haven't run | `git commit` |
| **test-tracker** | Records test pass/fail results | Test commands (20 patterns) |
| **plan-enforcement** | Warns when editing 6+ files without a plan | `Edit` / `Write` |

**Why only three?** Previous versions had 6 hooks (scope-guard, debug-loop, alignment, turn-reporter). They produced false positives that undermined the methodology they were supposed to enforce. These three survive because they're deterministic: file count + plan existence, test result parsing, commit detection. No ambiguity.

### 3. Slash Commands

| Command | Purpose |
|---------|---------|
| `/claude-prism:prism` | Run full EUDEC cycle |
| `/claude-prism:checkpoint` | Check batch progress with plan-reality sync |
| `/claude-prism:plan` | List/create/view plan files |
| `/claude-prism:analytics` | Show usage analytics (blocks, warns, tests) |
| `/claude-prism:doctor` | Diagnose installation health |
| `/claude-prism:stats` | Version, hooks, plan count |
| `/claude-prism:update` | Update to latest version |
| `/claude-prism:hud` | Manage the statusline HUD |
| `/claude-prism:help` | Command reference |

### 4. HUD Statusline

Prism includes an optional statusline HUD for Claude Code that shows live project context at the bottom of the terminal:

```
⚡ my-project:main | Opus 4.6 | 🔋84% | 11:17
📋 auth-refactor 60%(6/10) | 💾 fix: token validation (2h)
📊 세션 45%(30m) │ 주간92%(목 19:00)
```

| Line | Content |
|------|---------|
| 1 | Project:branch · model · context % · time |
| 2 | Active plan progress · last commit · test status |
| 3 | Session and weekly usage (when available) |

Enable during install (interactive prompt) or at any time:

```bash
prism hud enable    # Install script + update ~/.claude/settings.json
prism hud disable   # Remove statusLine setting
prism hud           # Show current status
```

Or from within Claude Code: `/claude-prism:hud enable`

### 4. Analytics

Hook events (blocks, warnings) are automatically logged to session files. View aggregated statistics:

```bash
prism analytics             # Summary across all sessions
prism analytics --detail    # Include per-session breakdown
```

## Installation

```bash
npx claude-prism init              # Install with hooks (prompts for HUD)
npx claude-prism init --hud        # Install + auto-enable HUD
npx claude-prism init --no-hooks   # Methodology only, no hooks
npx claude-prism init --global     # Global skill (all projects)
npx claude-prism init --dry-run    # Preview what would be installed
```

### What Gets Installed

```
your-project/
├── CLAUDE.md                    # EUDEC methodology injected
├── .claude-prism.json           # Hook configuration
├── .claude/
│   ├── commands/claude-prism/   # 9 slash commands
│   ├── hooks/                   # pre-tool.mjs, post-tool.mjs
│   ├── rules/                   # commit-guard, test-tracker, plan-enforcement
│   ├── lib/                     # Shared dependencies
│   └── settings.json            # Hook registration
└── docs/plans/                  # Plan files (created during work)

~/.claude/                       # (HUD — global, opt-in)
└── hud/omc-hud.mjs              # Statusline script
```

## Configuration

Edit `.claude-prism.json`:

```json
{
  "version": 1,
  "hooks": {
    "commit-guard": { "enabled": true, "maxTestAge": 300 },
    "test-tracker": { "enabled": true },
    "plan-enforcement": { "enabled": true, "warnAt": 6 }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `version` | 1 | Config schema version (for future migrations) |
| `commit-guard.maxTestAge` | 300 | Seconds before test run is considered stale |
| `plan-enforcement.warnAt` | 6 | Unique source file count that triggers plan warning |

## CLI Commands

```bash
prism init [--no-hooks] [--global] [--dry-run]   # Install
prism init --hud                                   # Install + auto-enable HUD
prism check [--ci]                                 # Verify installation
prism doctor                                       # Diagnose issues
prism stats                                        # Installation summary
prism analytics [--detail]                         # Usage analytics
prism reset                                        # Clear hook state
prism update [--global]                            # Update to latest
prism uninstall [--global]                         # Remove
prism hud                                          # HUD status
prism hud enable                                   # Activate HUD statusline
prism hud disable                                  # Deactivate HUD statusline
```

## Before & After

**Before** (AI agent default behavior):
1. User: "Refactor auth module"
2. AI: 30 minutes autonomous execution, no questions asked
3. Result: Structure nobody wanted, untested, scope creep everywhere

**After** (with EUDEC):
1. User: "Refactor auth module"
2. AI extracts **essence**: "Separate concerns in auth module", classifies as **Refactor**, assesses information as **[Partial]**
3. Asks: "Keep existing API surface? Or allowed to change public interface?"
4. Decomposes into 3 batches with size tags, creates plan file
5. Executes batch 1 → checkpoints with evidence → continues on approval
6. Result: Exactly what was asked, verified, documented

## OMC Integration

Prism auto-detects [oh-my-claudecode](https://github.com/raidenppl/oh-my-claudecode). When present, `prism stats` and `prism doctor` show OMC version. No configuration needed.

## Design Philosophy

EUDEC is the product. Everything else serves it.

The methodology works because it targets the specific failure modes of AI agents — not human developers. Humans naturally ask questions and break things down. AI optimizes for speed and skips these steps. EUDEC forces the discipline that makes AI-assisted coding reliable — starting from the essence of the problem.

The hooks exist to enforce the two most critical rules:
1. **Don't commit untested code** (commit-guard + test-tracker)
2. **Don't edit many files without a plan** (plan-enforcement)

Everything else is handled by the methodology itself, living in CLAUDE.md where the AI reads and follows it.

## License

MIT

## Author

lazysaturday91
