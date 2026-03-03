# /claude-prism:doctor — Installation Diagnostics

When this command is invoked, check all components of the prism installation:

## Checks

1. **CLAUDE.md**: Does it contain `<!-- PRISM:START -->` marker?
2. **Config**: Does `.prism/config.json` exist? Is it valid JSON?
3. **Commands**: Do these files exist in `.claude/commands/claude-prism/`?
   - prism.md, checkpoint.md, plan.md, doctor.md, stats.md, help.md, update.md
4. **Hooks**: Do these files exist in `.claude/hooks/`?
   - pre-tool.mjs, post-tool.mjs
5. **Rules**: Do these files exist in `.claude/rules/`?
   - commit-guard.mjs, test-tracker.mjs, plan-enforcement.mjs
6. **Lib**: Do these files exist in `.claude/lib/`?
   - pipeline.mjs, state.mjs, config.mjs, utils.mjs, messages.mjs
7. **Settings**: Does `.claude/settings.json` contain prism hook registrations?
8. **Legacy**: Are there old flat commands (`/prism`, `/checkpoint`) or deprecated files (`debug-loop.mjs`, `scope-guard.mjs`, `adapter.mjs`) that need cleanup?

## Report Format

```
🌈 claude-prism doctor

  CLAUDE.md:   ✅ PRISM rules present
  Config:      ✅ .prism/config.json valid
  Commands:    ✅ 7/7 installed
  Hooks:       ✅ 2/2 installed
  Rules:       ✅ 3/3 installed
  Lib:         ✅ 5/5 installed
  Settings:    ✅ Hooks registered
  Legacy:      ✅ No old files found

  Status: ✅ Healthy
```

## Fix Suggestions

For each issue found, suggest the fix:
- Missing files → "Run `prism update` to restore"
- Legacy commands → "Run `prism update` to migrate to namespaced commands"
- Missing PRISM block → "Run `prism update` to re-inject rules"
- Deprecated files → "Run `prism update` to clean up legacy files"
