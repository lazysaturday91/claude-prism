# /claude-prism:help — Command Reference

## Available Commands

| Command | Description |
|---------|-------------|
| `/claude-prism:prism` | Start full UDEC workflow (Understand → Decompose → Execute → Checkpoint). Also handles analysis-only requests — stops after U phase when no code change is needed. |
| `/claude-prism:checkpoint` | Check current batch progress, show next batch preview |
| `/claude-prism:plan` | List, create, or view plan files in `docs/plans/` |
| `/claude-prism:doctor` | Diagnose installation health and suggest fixes |
| `/claude-prism:stats` | Show project statistics, hook status, and plan progress |
| `/claude-prism:help` | This reference |

## Quick Start

1. Before any task (code or analysis): `/claude-prism:prism`
2. Mid-project progress check: `/claude-prism:checkpoint`
3. Create a new plan: `/claude-prism:plan`

## CLI Commands

These are also available from the terminal:

```bash
prism init [--lang=XX] [--no-hooks]   # Install prism
prism check [--ci]                     # Verify installation
prism doctor                           # Diagnose issues
prism stats                            # Show summary
prism reset                            # Clear hook state
prism update                           # Re-install / migrate
prism uninstall                        # Remove prism
```

## UDEC Framework

```
U — Understand: Assess sufficiency, ask questions, confirm alignment
     (analysis-only requests stop here with findings report)
D — Decompose: Break into 2-5 min units, create plan file
E — Execute: Batch (3-4 tasks), TDD each unit, scope guard
C — Checkpoint: Report with before/after table, get confirmation
```
