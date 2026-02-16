# /claude-prism:doctor — Installation Diagnostics

When this command is invoked, check all components of the prism installation:

## Checks

1. **CLAUDE.md**: Does it contain `<!-- PRISM:START -->` marker?
2. **Config**: Does `.claude-prism.json` exist? Is it valid JSON?
3. **Commands**: Do these files exist in `.claude/commands/claude-prism/`?
   - prism.md, checkpoint.md, plan.md, doctor.md, stats.md, help.md
4. **Hooks**: Do these files exist in `.claude/hooks/`?
   - commit-guard.mjs, debug-loop.mjs, test-tracker.mjs, scope-guard.mjs
5. **Rules**: Do these files exist in `.claude/rules/`?
   - commit-guard.mjs, debug-loop.mjs, test-tracker.mjs, scope-guard.mjs
6. **Lib**: Do these files exist in `.claude/lib/`?
   - adapter.mjs, state.mjs, config.mjs, utils.mjs
7. **Settings**: Does `.claude/settings.json` contain prism hook registrations?
8. **Legacy**: Are there old flat commands (`/prism`, `/checkpoint`) that need migration?

## Report Format

```
🌈 claude-prism doctor

  CLAUDE.md:   ✅ PRISM rules present
  Config:      ✅ .claude-prism.json valid
  Commands:    ✅ 7/7 installed
  Hooks:       ✅ 4/4 installed
  Rules:       ✅ 4/4 installed
  Lib:         ✅ 4/4 installed
  Settings:    ✅ Hooks registered
  Legacy:      ✅ No old commands found

  Status: ✅ Healthy
```

## Fix Suggestions

For each issue found, suggest the fix:
- Missing files → "Run `prism update` to restore"
- Legacy commands → "Run `prism update` to migrate to namespaced commands"
- Missing PRISM block → "Run `prism update` to re-inject rules"
