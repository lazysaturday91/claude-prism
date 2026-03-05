# /claude-prism:stats — Project Statistics

When this command is invoked:

## Gather Information

1. **Read `.prism/config.json`** for:
   - Language setting
   - Hook configurations and enabled status
2. **Scan plan files** in `.prism/plans/*.md`:
   - Count total files
   - For each plan, count `[x]` (done) vs `[ ]` (pending) tasks
   - Calculate completion percentage
3. **Detect OMC** (oh-my-claudecode) presence by checking `~/.claude/CLAUDE.md` for `OMC:START` marker

## Report Format

```
🌈 claude-prism stats

  Version:     v1.2.4
  Language:    ko
  Plans:       3 file(s)
  OMC:         ✅ detected

  Hooks:
    ✅ commit-guard   (maxTestAge: 300s)
    ✅ debug-loop     (warn: 3, block: 5)
    ✅ test-tracker
    ✅ scope-guard    (warn: 4/8, block: 7/12)

  Plans:
    📋 2026-02-15-p3-inspector.md    [3/5] 60%  (active)
    ✅ 2026-02-15-p8-templates.md    [5/5] 100% (completed)
    🚫 2026-02-16-p4-token.md        [0/4] 0%  (blocked)
```
