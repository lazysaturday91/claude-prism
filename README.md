```
                        ╱╲
           ━━━━━━━━━▶  ╱  ╲  ──── U  Understand
           complex    ╱    ╲ ──── D  Decompose
           problem   ╱ PRISM╲──── E  Execute
                    ╱________╲─── C  Checkpoint
                                    spectrum
```

[![npm version](https://img.shields.io/npm/v/claude-prism)](https://www.npmjs.com/package/claude-prism)
[![license](https://img.shields.io/npm/l/claude-prism)](https://github.com/lazysaturday91/claude-prism/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/claude-prism)](https://nodejs.org)

> `ai-coding` · `problem-decomposition` · `claude-code-hooks` · `claude-code-plugin` · `udec` · `scope-guard`

# claude-prism

An AI coding problem decomposition tool for Claude Code. Installs the **UDEC** methodology — Understand, Decompose, Execute, Checkpoint — directly into your project's Claude Code environment.

**The biggest failure mode of AI coding isn't bad code — it's building the wrong thing.** AI agents skip understanding, skip decomposition, and run autonomously for 30 minutes only to produce something nobody wanted. Prism fixes this by injecting discipline into how Claude thinks.

**Core philosophy:** Never implement what you haven't understood. Never execute what you haven't decomposed.

## The Problem

Without structure, Claude does this:

| Without Prism | With Prism |
|---|---|
| Reads request → assumes understanding | Reads request → assesses sufficiency |
| Starts coding immediately | Asks 1-2 clarifying questions first |
| Builds one 30-minute mega-feature | Decomposes into 2-5 minute verifiable units |
| Runs autonomously (no checkpoints) | Adaptive batches (1-8 tasks by complexity) → checkpoint → ask permission |
| Produces working code that's wrong | Produces code that's correct *and* wanted |

## Installation

```bash
npx claude-prism init              # English, with hooks
npx claude-prism init --lang=ko    # Korean
npx claude-prism init --lang=ja    # Japanese
npx claude-prism init --lang=zh    # Chinese
npx claude-prism init --no-hooks   # Rules only, no hooks
npx claude-prism init --global     # Install as global skill (available in all projects)
npx claude-prism update            # Update rules and commands to latest
npx claude-prism update --global   # Update global skill too
prism check                        # Verify installation
```

### What Gets Installed

After running `prism init`, your project gains:

**UDEC Rules** — Injected into `CLAUDE.md` between `PRISM:START` and `PRISM:END` markers. Explains the four-phase methodology:
- **U** — Assess information sufficiency before acting. Ask one question at a time, multiple choice, max 3 rounds.
- **D** — Decompose complex problems into 2-5 minute units with TDD. Create a plan file for 6+ file changes.
- **E** — Execute in adaptive batches. Apply context-aware verification by file path (TDD / build / lint-only).
- **C** — Checkpoint after each batch. Report progress, show next batch preview, get confirmation before continuing.

**Slash Commands** — Added to `.claude/commands/claude-prism/`:
- `/claude-prism:prism` — Full UDEC workflow (understand → decompose → execute → checkpoint). Also handles analysis-only requests.
- `/claude-prism:checkpoint` — Check batch progress, show next batch preview
- `/claude-prism:plan` — List, create, or view plan files
- `/claude-prism:doctor` — Diagnose installation health via Claude
- `/claude-prism:stats` — Show project statistics, hook status, and plan progress
- `/claude-prism:update` — Update rules and commands to latest version
- `/claude-prism:help` — Command reference

**Hooks** (optional, unless `--no-hooks` is set) — Four CLI guards that enforce discipline:
- `commit-guard` — Prevents commits when tests haven't run recently
- `debug-loop` — Detects divergent editing patterns on the same file (catches infinite debugging loops)
- `test-tracker` — Detects test command execution (npm test, jest, vitest, pytest, etc.) and records pass/fail state
- `scope-guard` — Warns at 4 unique files modified, blocks at 7 (agent-aware: warns at 8, blocks at 12)

**Configuration** — `.prism.json` stores language preference and hook settings. Includes OMC (oh-my-claudecode) detection.

## File Structure After Installation

```
your-project/
├── CLAUDE.md                 # (modified) UDEC rules injected
├── .claude-prism.json       # claude-prism config
├── .claude/
│   ├── commands/
│   │   └── claude-prism/        # Namespaced commands
│   │       ├── prism.md         # /claude-prism:prism
│   │       ├── checkpoint.md    # /claude-prism:checkpoint
│   │       ├── plan.md          # /claude-prism:plan
│   │       ├── doctor.md        # /claude-prism:doctor
│   │       ├── stats.md         # /claude-prism:stats
│   │       ├── update.md        # /claude-prism:update
│   │       └── help.md          # /claude-prism:help
│   ├── hooks/               # (optional, if --no-hooks not set)
│   │   ├── commit-guard.mjs
│   │   ├── debug-loop.mjs
│   │   ├── test-tracker.mjs
│   │   └── scope-guard.mjs
│   ├── rules/               # Hook logic modules
│   │   ├── commit-guard.mjs
│   │   ├── debug-loop.mjs
│   │   ├── test-tracker.mjs
│   │   └── scope-guard.mjs
│   ├── lib/                 # Hook dependencies
│   │   ├── adapter.mjs
│   │   ├── state.mjs
│   │   ├── config.mjs
│   │   └── utils.mjs
│   └── settings.json        # Claude Code hook registration
└── docs/plans/
    └── YYYY-MM-DD-topic.md  # Plan files (created during /claude-prism:prism execution)
```

## The UDEC Cycle

```
        START
          |
          v
    [ UNDERSTAND ]  ← Assess sufficiency, ask clarifying questions
          |
          v
    [ DECOMPOSE ]   ← Break into 2-5 min units, create plan file
          |
          v
    [ EXECUTE ]     ← Run adaptive batch, verify each unit
          |
          v
    [ CHECKPOINT ]  ← Report, show next batch, ask to continue
          |
       [LOOP or STOP]
```

## Commands

### Command Reference

| Command | When to Use | Purpose |
|---------|-------------|---------|
| `/claude-prism:prism` | Any task (code or analysis) | Run full UDEC cycle; stops at U phase for analysis-only requests |
| `/claude-prism:plan` | Manage plan files | List, create, or view plans |
| `/claude-prism:checkpoint` | Mid-project | Check batch progress, preview next batch |
| `/claude-prism:doctor` | Installation issues | Diagnose health, suggest fixes |
| `/claude-prism:stats` | Check current state | Version, hooks, language, plan progress |
| `/claude-prism:update` | After `npm update` | Update rules and commands to latest |
| `/claude-prism:help` | Forgot commands | Quick reference |

### Workflow

```
User request arrives
       │
       ▼
  Vague? ──Yes──▶ /claude-prism:prism  (U phase clarifies, then proceeds or stops)
       │
       No
       ▼
  Complex? ──Yes──▶ /claude-prism:prism     (full UDEC cycle)
       │
       No
       ▼
  Just execute
       │
       ▼
  Mid-check ──────▶ /claude-prism:checkpoint (between batches)
       │
       ▼
  Plan mgmt ──────▶ /claude-prism:plan       (list/create)
```

### Use Case Patterns

**Pattern 1: Feature Implementation**
```
/claude-prism:prism → "Add login functionality"
                    → Claude asks: "JWT or sessions?" "OAuth needed?"
                    → Plan created: docs/plans/2026-02-16-auth.md
                    → Batch 1 executes (3 tasks)
/claude-prism:checkpoint  → "Batch 1 done. Continue to batch 2?"
```

**Pattern 2: Clarify a Vague Request**
```
/claude-prism:prism → "Improve performance"
                    → Claude: [Insufficient] "What kind?"
                      1. Build time (next build)
                      2. Runtime (page load/render)
                      3. Bundle size (recommended)
                    → Agreement reached → proceeds to D/E/C or stops if analysis-only
                         → /claude-prism:prism to start execution
```

**Pattern 3: Resume Previous Work**
```
/claude-prism:plan        → List existing plans, show progress
/claude-prism:checkpoint  → "Plan X: 5/12 tasks done. Batch 3 next."
                          → "Continue" → Resume execution
```

**Pattern 4: Quick Troubleshooting**
```
/claude-prism:doctor → Check installation health
/claude-prism:stats  → Verify hooks, language, OMC status
```

### Before & After

**Before (AI agent's default behavior)**
1. User: "Refactor auth module"
2. AI: (no thinking) 30 minutes autonomous execution
3. Result: Completed structure nobody wanted

**After (Prism applied)**
1. User: "Refactor auth module"
2. Claude (automatic questions):
   - "Goal: Keep existing API and only improve internal structure? (Yes/No)"
   - "Scope: Authentication/authorization both? Or authentication only?"
   - "Tests: Keep existing tests as-is?"
3. User confirms → decomposition starts
4. Result: Completed as intended

## Hooks

Hooks are optional CLI guards that enforce discipline during development. Install with `prism init`, skip with `--no-hooks`.

### commit-guard

Blocks commits if tests haven't been run in the last 5 minutes (configurable via `maxTestAge` in `.claude-prism.json`). Works with `test-tracker` to know when tests last ran.

```json
{
  "hooks": {
    "commit-guard": {
      "enabled": true,
      "maxTestAge": 300
    }
  }
}
```

**Behavior:**
- Detects test run via `test-tracker`
- Blocks commit if: (current time - last test run) > maxTestAge
- Prevents shipping untested code

### debug-loop

Detects editing patterns on the same file. Distinguishes between **divergent** edits (same code area repeatedly — likely thrashing) and **convergent** edits (different areas like imports, logic, JSX — normal progressive work).

```json
{
  "hooks": {
    "debug-loop": {
      "enabled": true,
      "warnAt": 3,
      "blockAt": 5
    }
  }
}
```

**Behavior:**
- Tracks edit patterns using snippet analysis
- **Divergent pattern** (same area): warns at 3 edits, blocks at 5
- **Convergent pattern** (different areas): passes silently, downgrades block to warn
- Catches infinite debugging loops while allowing normal multi-area edits

### test-tracker

Detects test command execution and records the timestamp and pass/fail state. Used by `commit-guard` to verify tests ran recently.

**Detects:**
- `npm test`, `npm run test`
- `jest`, `vitest`
- `node --test`
- `npx mocha`, `mocha`
- `pytest`
- `cargo test`
- `go test`
- `make test`

**Configuration:**
```json
{
  "hooks": {
    "test-tracker": {
      "enabled": true
    }
  }
}
```

**Behavior:**
- Runs on every Bash command
- If command matches test pattern, records timestamp
- Records result (pass/fail based on exit code)
- `commit-guard` reads this state to allow/block commits

### scope-guard

Tracks unique source files modified per session. Warns when scope grows without a plan (catches scope creep). Agent-aware: sub-agents get higher thresholds.

```json
{
  "hooks": {
    "scope-guard": {
      "enabled": true,
      "warnAt": 4,
      "blockAt": 7,
      "agentWarnAt": 8,
      "agentBlockAt": 12
    }
  }
}
```

**Behavior:**
- Tracks unique source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.svelte`, `.vue`)
- Excludes test files (`.test.`, `.spec.`, `_test.`)
- Standard thresholds: warns at 4 files, blocks at 7
- Agent thresholds (when OMC sub-agents running): warns at 8, blocks at 12
- Warning: "Consider running /claude-prism:prism to decompose the task"
- Block: "Run /claude-prism:prism to decompose before continuing"
- **Plan-aware**: When a plan file is created (`docs/plans/*.md`), thresholds are automatically doubled
  - Standard with plan: warns at 8, blocks at 14
  - Agent with plan: warns at 16, blocks at 24

## Configuration

Edit `.claude-prism.json` to customize behavior:

```json
{
  "language": "en",
  "hooks": {
    "commit-guard": { "enabled": true, "maxTestAge": 300 },
    "debug-loop": { "enabled": true, "warnAt": 3, "blockAt": 5 },
    "test-tracker": { "enabled": true },
    "scope-guard": { "enabled": true, "warnAt": 4, "blockAt": 7, "agentWarnAt": 8, "agentBlockAt": 12 }
  }
}
```

**Settings:**
- `language` — Rule language: `en` (English), `ko` (Korean), `ja` (Japanese), `zh` (Chinese)
- `hooks.*` — Enable/disable individual hooks or customize thresholds
- `hooks.commit-guard.maxTestAge` — Seconds before test is considered stale (default: 300)
- `hooks.debug-loop.warnAt/blockAt` — Edit counts that trigger warnings/blocks
- `hooks.scope-guard.warnAt/blockAt` — File counts for standard mode
- `hooks.scope-guard.agentWarnAt/agentBlockAt` — File counts for OMC agent mode

## CLI Commands

### prism check

Verify installation after `prism init`:

```bash
prism check
```

Output:
```
  Commands:  ✅
  Rules:     ✅
  Hooks:     ✅
  Config:    ✅

  Status:    ✅ All good
```

For CI integration, use `--ci` flag for JSON output:

```bash
prism check --ci
```

### prism doctor

Diagnose installation issues with actionable fix suggestions. Also detects oh-my-claudecode (OMC) presence.

```bash
prism doctor
```

Output:
```
  ✅ Installation is healthy. No issues found.

  OMC:       ✅ v4.1.1
```

If issues are found:
```
  Issues found:

  ❌ CLAUDE.md rules not found
  ❌ /claude-prism:prism command not installed

  Suggested fixes:

  💡 Run: npx claude-prism init
  💡 Check: .claude/commands/claude-prism/prism.md exists
```

### prism stats

Show installation summary including version, language, hook status, plan file count, and OMC detection:

```bash
prism stats
```

Output:
```
  Version:   v0.3.1
  Language:  en
  Plans:     2 file(s)
  OMC:       ✅ v4.1.1
  Hooks:
    ✅ commit-guard
    ✅ debug-loop
    ✅ test-tracker
    ✅ scope-guard
```

### prism reset

Clear all hook state (edit counters, test timestamps, scope tracking). Use when starting a fresh task or after major refactor:

```bash
prism reset
```

Output:
```
  ✅ Hook state cleared (edit counters, test timestamps)

  🌈 Fresh start. All hooks reset.
```

## Uninstall

```bash
npx claude-prism uninstall
```

This removes CLAUDE.md rules, slash commands, and hooks.

## Languages

Supported languages for UDEC rules:

- **en** — English (default)
- **ko** — Korean
- **ja** — Japanese
- **zh** — Chinese

Change language (or re-install with different language):

```bash
npx claude-prism init --lang=ko    # Install Korean rules
npx claude-prism init --lang=ja    # Install Japanese rules
npx claude-prism init --lang=zh    # Install Chinese rules
```

## OMC (oh-my-claudecode) Integration

Prism auto-detects if [oh-my-claudecode](https://github.com/raidenppl/oh-my-claudecode) is installed in your environment. When OMC is present:

- **Higher scope thresholds for agents** — Sub-agents get `agentWarnAt: 8, agentBlockAt: 12` instead of standard `warnAt: 4, blockAt: 7`
- **Visible in status commands** — `prism stats` and `prism doctor` show OMC detection with version
- **No configuration needed** — Detection happens automatically

Check OMC status:

```bash
prism stats       # Shows "OMC: ✅ v4.1.1" or "OMC: ⏭️ not detected"
prism doctor      # Shows OMC detection in diagnostics
```

This allows OMC agents (executor, architect, etc.) to modify more files per task without triggering scope warnings, recognizing that coordinated multi-agent work has different constraints than single-agent development.

## Verification Strategy

Prism uses context-aware verification — the right level of rigor for each file type:

| Path Pattern | Strategy | Escalation |
|---|---|---|
| `lib/`, `utils/`, `store/`, `hooks/`, `services/` | **TDD required** — failing test → implement → verify | Always TDD |
| `components/`, `pages/`, `views/` | **Build verification** — build passes + visual check | Escalate to TDD if complex logic |
| `config/`, `styles/`, `types/`, `*.json` | **Build/lint only** | Never |

**Core rules (all paths):**
1. Never claim completion without fresh verification evidence
2. Never commit code that doesn't build
3. TDD paths: write failing test → minimal code → verify
4. Build paths: run build/lint → confirm no regressions

## Design Philosophy

Prism is built on the insight that **AI needs structure more than humans do.** Humans naturally ask clarifying questions and break problems down. AI doesn't — it optimizes for speed. Prism enforces the discipline that makes AI-assisted coding reliable:

- Explicit understanding phase (no assumptions)
- Enforced decomposition (no mega-tasks)
- Batched execution with checkpoints (human in the loop)
- Context-aware verification (TDD, build, or lint — matched to file type)

The prism metaphor: white light (complex problem) enters from one side and decomposes into a spectrum of colors (manageable units). Each color (unit) is individually verified, then recombined into a working whole.

## License

MIT

## Author

lazysaturday91
