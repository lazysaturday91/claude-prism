# /claude-prism:hud — HUD Management

When this command is invoked, manage the Prism statusline HUD.

## Usage

- No argument → show current HUD status
- `enable`    → install and activate the HUD
- `disable`   → deactivate the HUD

## Steps

### No argument — Show status

Run:
```bash
npx claude-prism@latest hud status
```

Report format:
```
🌈 claude-prism hud

  Status:   ✅ enabled
  Script:   ~/.claude/hud/omc-hud.mjs
  Command:  node /Users/<you>/.claude/hud/omc-hud.mjs

  Lines:
    1  ⚡ project:branch | Model | 🔋ctx% | HH:MM
    2  📋 plan name XX%(done/total) | 💾 commit msg (elapsed)
    3  📊 XX%(Xm) │ Wkly XX%(Day HH:MM)
```

### enable

1. Run:
   ```bash
   npx claude-prism@latest hud enable
   ```

2. Report:
   ```
   🌈 claude-prism hud enabled

     ✅ HUD script → ~/.claude/hud/omc-hud.mjs
     ✅ statusLine → ~/.claude/settings.json

     Restart Claude Code to see the HUD.
   ```

### disable

1. Run:
   ```bash
   npx claude-prism@latest hud disable
   ```

2. Report:
   ```
   🌈 claude-prism hud disabled

     ✅ statusLine removed from ~/.claude/settings.json

     Restart Claude Code to apply.
   ```
