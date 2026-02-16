# /claude-prism:update — Update Prism

When this command is invoked, update claude-prism to the latest version.

## Steps

1. **Run the update command**:
   ```bash
   npx claude-prism@latest update
   ```

2. **If `--global` argument is provided**, update global installation instead:
   ```bash
   npx claude-prism@latest update --global
   ```

3. **Report the result** using this format:

```
🌈 claude-prism updated

  ✅ Rules updated → CLAUDE.md
  ✅ Commands updated → /claude-prism:*
  ✅ Hooks updated → commit-guard, debug-loop, test-tracker, scope-guard
```

Or for global:

```
🌈 claude-prism updated (global)

  ✅ Commands updated → ~/.claude/commands/claude-prism/
  ✅ OMC skill updated → ~/.claude/skills/prism/
```

4. **Verify** by running `prism check` (local) or checking file existence (global).
