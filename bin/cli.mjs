#!/usr/bin/env node

/**
 * claude-prism CLI
 * Usage: prism init [--no-hooks]
 *        prism check [--ci]
 *        prism doctor
 *        prism stats
 *        prism reset
 *        prism uninstall
 *        prism update
 */

import { init, check, uninstall, update, doctor, stats, reset, initGlobal, uninstallGlobal, installHud, uninstallHud, hudStatus } from '../lib/installer.mjs';

const args = process.argv.slice(2);
const command = args[0];

function hasFlag(name) {
  return args.includes(`--${name}`) || args.includes(`-${name}`);
}

// --version / -v
if (hasFlag('version') || hasFlag('v')) {
  const { stats: getStats } = await import('../lib/installer.mjs');
  const s = getStats(process.cwd());
  console.log(`claude-prism v${s.version}`);
  process.exit(0);
}

const cwd = process.cwd();

try {
switch (command) {
  case 'init': {
    if (hasFlag('global')) {
      console.log('🌈 claude-prism init --global\n');
      initGlobal();
      console.log('✅ Commands installed → ~/.claude/commands/claude-prism/');
      console.log('✅ OMC skill installed → ~/.claude/skills/prism/');
      console.log('\n🌈 Done. /claude-prism:prism available in all projects.');
      break;
    }

    const hooks = !hasFlag('no-hooks');

    if (hasFlag('dry-run')) {
      const { dryRun } = await import('../lib/installer.mjs');
      const result = dryRun(cwd, { hooks });
      console.log('🌈 claude-prism init --dry-run\n');
      console.log('  Files that would be created/updated:\n');
      for (const action of result.actions) {
        const icon = action.status === 'create' ? '🆕' : '🔄';
        console.log(`  ${icon} [${action.status}] ${action.path}`);
      }
      console.log(`\n  Total: ${result.actions.length} files`);
      break;
    }

    console.log('🌈 claude-prism init\n');
    await init(cwd, { hooks });

    console.log('✅ EUDEC methodology → CLAUDE.md');
    console.log('✅ Commands → /prism, /checkpoint, /plan');
    if (hooks) {
      console.log('✅ Commit guard → blocks commits with failing tests');
    } else {
      console.log('⏭️  Hooks skipped (--no-hooks)');
    }

    // HUD prompt — only ask interactively if not already installed and no flag given
    if (!hasFlag('no-hud') && process.stdin.isTTY) {
      const status = hudStatus();
      if (!status.enabled) {
        const { createInterface } = await import('readline');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise(resolve =>
          rl.question('\n🖥️  Enable Prism HUD statusline? Shows project/branch/plan in Claude Code (y/N): ', a => {
            rl.close();
            resolve(a.trim().toLowerCase());
          })
        );
        if (answer === 'y' || answer === 'yes') {
          const { scriptPath } = installHud();
          console.log(`✅ HUD enabled → ${scriptPath}`);
          console.log('   Restart Claude Code to activate.');
        } else {
          console.log('⏭️  HUD skipped (run `prism hud enable` anytime)');
        }
      } else {
        console.log('✅ HUD already enabled');
      }
    } else if (hasFlag('hud')) {
      const { scriptPath } = installHud();
      console.log(`✅ HUD enabled → ${scriptPath}`);
    }

    console.log('\n🌈 Done. Use /prism before complex tasks.');
    break;
  }

  case 'check': {
    const result = check(cwd);
    const ci = hasFlag('ci');

    if (ci) {
      console.log(JSON.stringify(result));
      process.exit(result.ok ? 0 : 1);
    }

    console.log('🌈 claude-prism check\n');
    console.log(`  Commands:  ${result.commands ? '✅' : '❌'}`);
    console.log(`  Rules:     ${result.rules ? '✅' : '❌'}`);
    console.log(`  Hooks:     ${result.hooks ? '✅' : '⏭️  (optional)'}`);
    console.log(`  Config:    ${result.config ? '✅' : '❌'}`);
    console.log(`\n  Status:    ${result.ok ? '✅ All good' : '❌ Issues found'}`);
    process.exit(result.ok ? 0 : 1);
    break;
  }

  case 'doctor': {
    console.log('🌈 claude-prism doctor\n');
    const result = doctor(cwd);

    if (result.healthy) {
      console.log('  ✅ Installation is healthy. No issues found.');
    } else {
      console.log('  Issues found:\n');
      for (const issue of result.issues) {
        console.log(`  ❌ ${issue}`);
      }
      console.log('\n  Suggested fixes:\n');
      for (const fix of result.fixes) {
        console.log(`  💡 ${fix}`);
      }
    }
    console.log(`\n  OMC:       ${result.omc.detected ? `✅ v${result.omc.version || 'unknown'}` : '⏭️  not detected'}`);
    process.exit(result.healthy ? 0 : 1);
    break;
  }

  case 'stats': {
    const result = stats(cwd);
    console.log('🌈 claude-prism stats\n');
    console.log(`  Version:   v${result.version}`);
    console.log(`  Plans:     ${result.planFiles} file(s)`);
    console.log(`  OMC:       ${result.omc.detected ? `✅ v${result.omc.version || 'unknown'}` : '⏭️  not detected'}`);
    console.log('  Hooks:');
    for (const [name, enabled] of Object.entries(result.hooks)) {
      console.log(`    ${enabled ? '✅' : '⏭️ '} ${name}`);
    }
    break;
  }

  case 'reset': {
    console.log('🌈 claude-prism reset\n');
    reset();
    console.log('✅ Hook state cleared');
    console.log('\n🌈 Fresh start.');
    break;
  }

  case 'hud': {
    const subcommand = args[1];

    if (subcommand === 'enable') {
      console.log('🌈 claude-prism hud enable\n');
      const { scriptPath } = installHud();
      console.log(`  ✅ HUD script → ${scriptPath}`);
      console.log('  ✅ statusLine → ~/.claude/settings.json');
      console.log('\n  Restart Claude Code to activate.');
      break;
    }

    if (subcommand === 'disable') {
      console.log('🌈 claude-prism hud disable\n');
      uninstallHud();
      console.log('  ✅ statusLine removed from ~/.claude/settings.json');
      console.log('\n  Restart Claude Code to apply.');
      break;
    }

    // Default: show status
    console.log('🌈 claude-prism hud\n');
    const status = hudStatus();
    console.log(`  Status:  ${status.enabled ? '✅ enabled' : '⏭️  disabled'}`);
    if (status.scriptExists) {
      console.log(`  Script:  ~/.claude/hud/omc-hud.mjs`);
    } else {
      console.log('  Script:  ❌ not installed');
    }
    if (status.command) {
      console.log(`  Command: ${status.command}`);
    }
    if (!status.enabled) {
      console.log('\n  Run `prism hud enable` to activate.');
    }
    break;
  }

  case 'uninstall': {
    if (hasFlag('global')) {
      console.log('🌈 claude-prism uninstall --global\n');
      uninstallGlobal();
      console.log('✅ Global commands removed');
      console.log('✅ OMC skill removed');
      console.log('\n🌈 Global prism uninstalled.');
      break;
    }

    console.log('🌈 claude-prism uninstall\n');
    uninstall(cwd);
    console.log('✅ Rules removed from CLAUDE.md');
    console.log('✅ Commands removed');
    console.log('✅ Hooks removed');
    console.log('✅ Config removed');
    console.log('\n🌈 Prism uninstalled.');
    break;
  }

  case 'update': {
    if (hasFlag('global')) {
      console.log('🌈 claude-prism update --global\n');
      initGlobal();
      console.log('✅ Global commands updated');
      console.log('✅ OMC skill updated');
      console.log('\n🌈 Global prism updated to latest.');
      break;
    }

    console.log('🌈 claude-prism update\n');
    const result = await update(cwd);
    if (result?.sourceRepo) {
      console.log('✅ EUDEC methodology updated (from local templates)');
    } else {
      console.log('✅ EUDEC methodology updated');
    }
    console.log('✅ Commands updated');
    console.log('✅ Commit guard updated');
    console.log('\n🌈 Prism updated to latest.');
    break;
  }

  case 'analytics': {
    const { listSessions, getSessionSummary } = await import('../lib/session.mjs');
    console.log('🌈 claude-prism analytics\n');

    const sessions = listSessions();
    if (sessions.length === 0) {
      console.log('  No session data yet. Analytics will populate as hooks run.');
      break;
    }

    let totalBlocks = 0;
    let totalWarnings = 0;
    let totalTestsRun = 0;
    let totalTestsPassed = 0;
    let totalTestsFailed = 0;
    let totalFilesModified = 0;
    let totalFilesCreated = 0;
    let totalTurns = 0;
    let sessionCount = 0;

    for (const sid of sessions) {
      const summary = getSessionSummary(sid);
      if (!summary) continue;
      sessionCount++;
      totalBlocks += summary.blocks;
      totalWarnings += summary.warnings;
      totalTestsRun += summary.testsRun;
      totalTestsPassed += summary.testsPassed;
      totalTestsFailed += summary.testsFailed;
      totalFilesModified += summary.filesModified;
      totalFilesCreated += summary.filesCreated;
      totalTurns += summary.turns;
    }

    console.log(`  Sessions:        ${sessionCount}`);
    console.log(`  Total events:    ${totalTurns + totalBlocks + totalWarnings + totalTestsRun + totalFilesModified + totalFilesCreated}`);
    console.log('');
    console.log('  Hook Effectiveness:');
    console.log(`    Blocks:        ${totalBlocks}`);
    console.log(`    Warnings:      ${totalWarnings}`);
    console.log('');
    console.log('  Test Activity:');
    console.log(`    Runs:          ${totalTestsRun}`);
    console.log(`    Passed:        ${totalTestsPassed}`);
    console.log(`    Failed:        ${totalTestsFailed}`);
    console.log('');
    console.log('  File Activity:');
    console.log(`    Modified:      ${totalFilesModified}`);
    console.log(`    Created:       ${totalFilesCreated}`);

    if (hasFlag('detail')) {
      console.log('\n  Recent Sessions:\n');
      const recent = sessions.slice(-5);
      for (const sid of recent) {
        const s = getSessionSummary(sid);
        if (!s) continue;
        const date = new Date(s.startedAt).toISOString().slice(0, 19).replace('T', ' ');
        console.log(`    ${date} | events: ${s.totalEvents} | blocks: ${s.blocks} | warns: ${s.warnings} | tests: ${s.testsRun}`);
      }
    }
    break;
  }

  default: {
    console.log(`🌈 claude-prism — EUDEC methodology framework for AI coding agents

Usage:
  prism init [--no-hooks]                Install prism in current project
  prism init --global                    Install globally (~/.claude/) + OMC skill
  prism check [--ci]                     Verify installation
  prism doctor                           Diagnose issues with fix suggestions
  prism stats                            Show installation summary
  prism reset                            Clear hook state
  prism analytics [--detail]             Show usage analytics
  prism update                           Re-install using current config
  prism update --global                  Update global commands + OMC skill
  prism uninstall                        Remove prism from current project
  prism uninstall --global               Remove global commands + OMC skill
  prism hud                              Show HUD statusline status
  prism hud enable                       Install and activate the HUD
  prism hud disable                      Deactivate the HUD

Options:
  --no-hooks   Skip commit guard hook
  --hud        Auto-enable HUD during init (no prompt)
  --no-hud     Skip HUD prompt during init
  --dry-run    Show what init would do without making changes
  --global     Install/uninstall globally (all projects)
  --ci         Output JSON for CI integration
  --version    Show version`);
  }
}
} catch (err) {
  const msg = err.message || String(err);
  process.stderr.write(`🌈 Prism Error: ${msg}\n`);

  if (/EACCES|permission/i.test(msg)) {
    process.stderr.write('💡 Check directory permissions\n');
  } else if (/JSON|parse/i.test(msg)) {
    process.stderr.write('💡 Config file may be corrupted. Try `prism reset` or delete .claude-prism.json\n');
  } else if (/ENOENT.*package\.json/i.test(msg)) {
    process.stderr.write('💡 Not in a project directory?\n');
  }

  process.exit(1);
}
