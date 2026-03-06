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

**AI agent harness implementing the EUDEC methodology for reliable AI-assisted coding.**

Prism is an [agent harness](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html) —
the infrastructure that channels AI coding agents toward correct, verified output.
It combines a behavioral methodology (EUDEC), deterministic hooks for enforcement,
session lifecycle automation, and adaptive process weight that scales with task complexity.

Installs the EUDEC methodology — **Essence, Understand, Decompose, Execute, Checkpoint** — directly into your project's Claude Code environment. Includes a session transition protocol (Handoff) that bookends the core cycle. Seven hooks enforce the methodology and automate session management.

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
┌──────────────────── EUDEC Core Cycle ───────────────────┐
│ ESSENCE ── Extract core problem → simplify → expand      │
│   │        Task type derivation from essence             │
│ UNDERSTAND ── Sufficiency assessment → ask → align       │
│   │          Environment validation                      │
│   │          Analysis-only branch (skip D/E/C if no code │
│   │          change needed)                              │
│ DECOMPOSE ── Batches → plan file → quality gate          │
│   │          Codebase audit → cross-plan check           │
│ EXECUTE ── Adaptive batches → Git-as-Memory (commit per  │
│   │        batch) → risk-based verification              │
│   │        Goal recitation → thrashing detection         │
│   │        Verification scoping (changed files only)     │
│ CHECKPOINT ── Report with evidence → plan-reality sync   │
│              (loops back for next batch)                  │
└──────────────────────────────────────────────────────────┘
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
- Fallback Ladder: Tests → Build → Diff (use highest available)

**Quality gates** between phases prevent executing on broken baselines.

**v1.5.0:**
- **Adaptive Weight**: EUDEC auto-scales — lightweight (1-2 files), standard, or full path
- **Bugfix Fast Path**: symptom → cause → fix → verify (skips formal EUDEC cycle)
- **Streamlined verification**: 3-level fallback ladder (Tests → Build → Diff)
- **Adaptive checkpoints**: no pause for small tasks, summary for medium, full for large

**New in v1.7.0:**
- **Plan Lifecycle Management** — 6 states (`draft` → `active` → `completed` → `archived`, plus `blocked` and `abandoned`) with validated state machine transitions
- **Auto-transitions** — plans auto-activate on first task check, auto-complete when all tasks done, with progress milestones (25/50/75%) logged
- **Plan History** — `.prism/plans/.history.jsonl` records all status changes and milestones as timestamped events
- **8 new `/plan` subcommands** — `complete`, `archive`, `block`, `unblock`, `abandon`, `reopen`, `history`, `status`
- **Plan Discovery** — `prism init`/`update` scans `docs/` for existing plan files and offers to import them (originals preserved, frontmatter auto-derived from task progress)

**v1.6.0:**
- **Session Bootstrap** — agents auto-read `PROJECT-MEMORY.md`, `HANDOFF.md`, active plans, and registry on session start
- **Plan Frontmatter** — frontmatter (`status`, `created`, `depends_on`), `/plan check` for cross-plan file conflict detection
- **Docs Scaffolding** — `prism init --docs` creates `docs/` with templates + `.prism/registry.json`
- **Lightweight Recording** — even small tasks append a 1-line summary to `docs/PROJECT-MEMORY.md`

**New in v1.4.0:**
- **Native Claude Code plugin** — `claude plugin install claude-prism` for zero-config setup
- **4 new hook events** — PreCompact (auto-HANDOFF), SessionEnd (session protection), SubagentStart (scope injection), TaskCompleted (plan auto-update)
- **HTTP webhooks** — fire-and-forget notifications on compaction, session-end, batch-complete
- **Checkpoint integration** — `Esc+Esc` / `/rewind` references complement Git-as-Memory

**v1.3.0:**
- `.prism/` brand directory — config, version, and plans live under `.prism/`
- Automatic 3-stage migration from legacy paths

**v1.2.5:**
- **Analysis-only branch**: When no code change is needed, UNDERSTAND reports findings without entering DECOMPOSE/EXECUTE/CHECKPOINT
- **Git-as-Memory**: Commits after each batch as rollback points; `git diff` summaries maintain context in long sessions
- **Verification scoping**: Build check output filtered to changed files only — pre-existing errors are ignored
- **Agent failure recovery**: 3-step protocol when delegated agents produce incomplete results

### 2. Seven Focused Hooks

Hooks enforce the methodology at critical points:

| Hook | Event | What It Does |
|---|---|---|
| **commit-guard** | PreToolUse | Blocks commits when tests failed or haven't run |
| **plan-enforcement** | PreToolUse | Warns when editing 6+ files without a plan |
| **test-tracker** | PostToolUse | Records test pass/fail results |
| **precompact-handler** | PreCompact | Auto-generates `docs/HANDOFF.md` before compaction |
| **session-end-handler** | SessionEnd | Saves HANDOFF + appends to `docs/PROJECT-MEMORY.md` |
| **scope-injector** | SubagentStart | Injects current plan batch context into subagent |
| **plan-sync** | TaskCompleted | Auto-updates plan file checkboxes on task completion |

The original three hooks (commit-guard, test-tracker, plan-enforcement) are deterministic enforcers. The four new hooks (v1.4.0) are **session lifecycle automations** — they don't block or warn, they auto-save context and sync plan state.

### 3. Slash Commands

| Command | Purpose |
|---------|---------|
| `/claude-prism:prism` | Run full EUDEC cycle |
| `/claude-prism:checkpoint` | Check batch progress with plan-reality sync |
| `/claude-prism:plan` | Plan lifecycle (list/create/complete/archive/block/unblock/abandon/reopen/history/status) |
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
📊 45%(30m) │ Wkly 93%(Wed 19:00)
```

| Line | Content |
|------|---------|
| 1 | Project:branch · model · context % · time |
| 2 | Active plan progress · last commit · test status |
| 3 | Session and weekly usage (auto-refreshed every 30s via Anthropic OAuth API) |

The HUD fetches usage data directly from the Anthropic API using your OAuth credentials (macOS Keychain or `~/.claude/.credentials.json`). Results are cached for 30 seconds to minimize API calls.

Enable during install (interactive prompt) or at any time:

```bash
prism hud enable    # Install script + update ~/.claude/settings.json
prism hud disable   # Remove statusLine setting
prism hud           # Show current status
```

Or from within Claude Code: `/claude-prism:hud enable`

### 5. Analytics

Hook events (blocks, warnings) are automatically logged to session files. View aggregated statistics:

```bash
prism analytics             # Summary across all sessions
prism analytics --detail    # Include per-session breakdown
```

## Installation

### Option A: Plugin Mode (recommended)

```bash
claude plugin install claude-prism
```

Plugin mode auto-registers hooks and skills. Run `prism init` additionally if you want CLAUDE.md methodology injection (plugins cannot modify CLAUDE.md).

### Option B: CLI Mode

```bash
npx claude-prism init              # Install with hooks (prompts for HUD)
npx claude-prism init --docs       # Install + docs scaffolding (PROJECT-MEMORY, HANDOFF, registry)
npx claude-prism init --hud        # Install + auto-enable HUD
npx claude-prism init --no-hooks   # Methodology only, no hooks
npx claude-prism init --global     # Global skill (all projects)
npx claude-prism init --dry-run    # Preview what would be installed
```

### What Gets Installed

```
your-project/
├── CLAUDE.md                    # EUDEC methodology injected (CLI mode only)
├── .prism/
│   ├── config.json              # Hook configuration (committed)
│   ├── .version                 # Installed version (gitignored)
│   ├── .gitignore               # Ignores .version
│   └── plans/                   # Plan files (created during work)
├── .claude/
│   ├── commands/claude-prism/   # 9 slash commands
│   ├── hooks/                   # 6 runners (pre-tool, post-tool, precompact,
│   │                            #   session-end, subagent-start, task-completed)
│   ├── rules/                   # 7 rule modules
│   ├── lib/                     # 9 shared dependencies
│   └── settings.json            # Hook registration (6 events)

~/.claude/                       # (global install / HUD)
├── commands/claude-prism/       # 9 slash commands (--global)
├── skills/prism/SKILL.md        # /prism skill (--global)
└── hud/omc-hud.mjs              # Statusline script (--hud)
```

## Configuration

Edit `.prism/config.json`:

```json
{
  "version": 1,
  "hooks": {
    "commit-guard": { "enabled": true, "maxTestAge": 300 },
    "test-tracker": { "enabled": true },
    "plan-enforcement": { "enabled": true, "warnAt": 6 },
    "precompact-handler": { "enabled": true },
    "session-end-handler": { "enabled": true },
    "subagent-scope-injector": { "enabled": true },
    "task-plan-sync": { "enabled": true, "matchThreshold": 0.3 }
  },
  "webhooks": [
    {
      "url": "https://your-server.com/webhook",
      "events": ["compaction", "session-end", "batch-complete"],
      "headers": { "Authorization": "Bearer token" }
    }
  ]
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `version` | 1 | Config schema version (for future migrations) |
| `rulesMode` | `"full"` | `"full"` injects the complete ~500-line EUDEC methodology; `"lean"` injects ~80-line behavioral modifiers and routes to `/claude-prism:prism` for full guidance |
| `commit-guard.maxTestAge` | 300 | Seconds before test run is considered stale |
| `plan-enforcement.warnAt` | 6 | Unique source file count that triggers plan warning |
| `task-plan-sync.matchThreshold` | 0.3 | Keyword overlap ratio for fuzzy task matching |
| `webhooks` | `[]` | HTTP endpoints for event notifications |

### Lean Router (beta)

By default, Prism injects the full EUDEC methodology (~500 lines) into `CLAUDE.md`. This provides passive absorption — the agent always has the complete framework in context.

**Lean mode** injects only ~80 lines of behavioral modifiers (Scope Guard, Verification Ladder, Bugfix Fast Path, etc.) and routes Standard/Full tasks to the `/claude-prism:prism` slash command for on-demand full guidance. This saves context window for code.

```bash
# Switch to lean mode
echo '{"version":1,"rulesMode":"lean"}' > .prism/config.json
prism update

# Switch back to full mode
echo '{"version":1,"rulesMode":"full"}' > .prism/config.json
prism update
```

## CLI Commands

```bash
prism init [--no-hooks] [--docs] [--global] [--dry-run]  # Install
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

Prism auto-detects [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode). When present, `prism stats` and `prism doctor` show OMC version. No configuration needed.

## Upgrading

### To v1.7.0

```bash
npx claude-prism update
```

v1.7.0 adds plan lifecycle management with 6 states and auto-transitions. During `update`, Prism will scan `docs/` and `docs/plans/` for existing plan files and offer to import them into `.prism/plans/` (originals are preserved). Plans without frontmatter get auto-assigned status based on task progress.

New lib file (`plan-lifecycle.mjs`) is installed automatically. No manual steps needed.

### To v1.4.0

```bash
npx claude-prism update
```

v1.4.0 adds 4 new hook runners + 4 rule files + 2 new libs. `prism update` installs them automatically. Existing hooks and configuration are preserved.

**Optional**: Install as a native plugin for auto-registration:
```bash
claude plugin install claude-prism
```

### To v1.3.0

v1.3.0 moves project files to `.prism/` directory. Migration is automatic via `prism update`.

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
