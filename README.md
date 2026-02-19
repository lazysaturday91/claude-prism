```
                         ╱╲
            ━━━━━━━━━▶  ╱  ╲  ── A  Assess
            complex    ╱    ╲ ── U  Understand
            problem   ╱ PRISM╲── D  Decompose
                     ╱        ╲─ E  Execute
                    ╱__________╲ C  Checkpoint
                                 H  Handoff
```

[![npm version](https://img.shields.io/npm/v/claude-prism)](https://www.npmjs.com/package/claude-prism)
[![license](https://img.shields.io/npm/l/claude-prism)](https://github.com/lazysaturday91/claude-prism/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/claude-prism)](https://nodejs.org)

> `ai-coding` · `methodology` · `udec` · `claude-code`

# claude-prism

**UDEC methodology framework for AI coding agents.**

Installs the UDEC methodology — Assess, Understand, Decompose, Execute, Checkpoint, Handoff — directly into your project's Claude Code environment. Three lightweight hooks enforce the methodology where it matters most.

## The Problem

AI coding agents fail in predictable ways:

| Failure Mode | What Happens | UDEC Fix |
|---|---|---|
| Skip understanding | Builds the wrong thing for 30 minutes | ASSESS + UNDERSTAND phases |
| No decomposition | One massive change that's hard to review | DECOMPOSE into verifiable batches |
| No verification | "should work" without evidence | Risk-based verification strategy |
| Scope creep | "While I'm here..." changes nobody asked for | Scope Guard in methodology |
| Context loss | New session = start from scratch | HANDOFF protocol |

**The biggest failure mode of AI coding isn't bad code — it's building the wrong thing.**

## Core Philosophy

> Never implement what you haven't understood. Never execute what you haven't decomposed.

## What Prism Provides

### 1. UDEC v2 Methodology (the core product)

Injected into `CLAUDE.md`, UDEC is a behavioral framework that corrects how AI agents approach tasks:

```
ASSESS ─── Classify: bugfix / feature / migration / refactor / investigation
  │
UNDERSTAND ── Assess sufficiency → ask 1 question at a time → align
  │
DECOMPOSE ── Break into batches → plan file for 6+ files → size tags [S][M][L]
  │
EXECUTE ── Adaptive batches → risk-based verification → scope guard
  │
CHECKPOINT ── Report with evidence → preview next batch → get approval
  │
HANDOFF ── Session transition doc → next steps → decisions made
```

**Task-type aware**: Each task type (bugfix, feature, migration, refactor, investigation) follows a different optimal path. Migrations skip per-file decomposition. Bugfixes skip straight to locate-fix-verify. Investigations skip decomposition entirely.

**Risk-based verification**: Verification matches the risk of the change, not the file path:
- **High risk** (business logic, auth, state machines): TDD required
- **Medium risk** (new components, API integration): Build + runtime check
- **Low risk** (imports, types, renaming): Build/lint passes

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
| `/claude-prism:prism` | Run full UDEC cycle |
| `/claude-prism:checkpoint` | Check batch progress |
| `/claude-prism:plan` | List/create/view plan files |
| `/claude-prism:doctor` | Diagnose installation health |
| `/claude-prism:stats` | Version, hooks, plan count |
| `/claude-prism:update` | Update to latest version |
| `/claude-prism:help` | Command reference |

## Installation

```bash
npx claude-prism init              # Install with hooks
npx claude-prism init --no-hooks   # Methodology only, no hooks
npx claude-prism init --global     # Global skill (all projects)
npx claude-prism init --dry-run    # Preview what would be installed
```

### What Gets Installed

```
your-project/
├── CLAUDE.md                    # UDEC methodology injected
├── .claude-prism.json           # Hook configuration
├── .claude/
│   ├── commands/claude-prism/   # 7 slash commands
│   ├── hooks/                   # pre-tool.mjs, post-tool.mjs
│   ├── rules/                   # commit-guard, test-tracker, plan-enforcement
│   ├── lib/                     # Shared dependencies
│   └── settings.json            # Hook registration
└── docs/plans/                  # Plan files (created during work)
```

## Configuration

Edit `.claude-prism.json`:

```json
{
  "hooks": {
    "commit-guard": { "enabled": true, "maxTestAge": 300 },
    "test-tracker": { "enabled": true },
    "plan-enforcement": { "enabled": true, "warnAt": 6 }
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `commit-guard.maxTestAge` | 300 | Seconds before test run is considered stale |
| `plan-enforcement.warnAt` | 6 | Unique source file count that triggers plan warning |

## CLI Commands

```bash
prism init [--no-hooks] [--global] [--dry-run]   # Install
prism check [--ci]                                 # Verify installation
prism doctor                                       # Diagnose issues
prism stats                                        # Installation summary
prism reset                                        # Clear hook state
prism update [--global]                            # Update to latest
prism uninstall [--global]                         # Remove
```

## Before & After

**Before** (AI agent default behavior):
1. User: "Refactor auth module"
2. AI: 30 minutes autonomous execution, no questions asked
3. Result: Structure nobody wanted, untested, scope creep everywhere

**After** (with UDEC):
1. User: "Refactor auth module"
2. AI classifies as **Refactor** type, assesses information as **[Partial]**
3. Asks: "Keep existing API surface? Or allowed to change public interface?"
4. Decomposes into 3 batches with size tags, creates plan file
5. Executes batch 1 → checkpoints with evidence → continues on approval
6. Result: Exactly what was asked, verified, documented

## OMC Integration

Prism auto-detects [oh-my-claudecode](https://github.com/raidenppl/oh-my-claudecode). When present, `prism stats` and `prism doctor` show OMC version. No configuration needed.

## Design Philosophy

UDEC is the product. Everything else serves it.

The methodology works because it targets the specific failure modes of AI agents — not human developers. Humans naturally ask questions and break things down. AI optimizes for speed and skips these steps. UDEC forces the discipline that makes AI-assisted coding reliable.

The hooks exist to enforce the two most critical rules:
1. **Don't commit untested code** (commit-guard + test-tracker)
2. **Don't edit many files without a plan** (plan-enforcement)

Everything else is handled by the methodology itself, living in CLAUDE.md where the AI reads and follows it.

## License

MIT

## Author

lazysaturday91
