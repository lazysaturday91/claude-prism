#!/usr/bin/env node

/**
 * claude-prism CLI
 * Usage: prism init [--lang=ko] [--no-hooks]
 *        prism check [--ci]
 *        prism doctor
 *        prism stats
 *        prism reset
 *        prism uninstall
 *        prism update
 */

import { init, check, uninstall, update, doctor, stats, reset, initGlobal, uninstallGlobal } from '../lib/installer.mjs';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name) {
  const flag = args.find(a => a.startsWith(`--${name}=`));
  return flag ? flag.split('=')[1] : null;
}

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

    const language = getFlag('lang') || 'en';
    const hooks = !hasFlag('no-hooks');

    if (hasFlag('dry-run')) {
      const { dryRun } = await import('../lib/installer.mjs');
      const result = dryRun(cwd, { language, hooks });
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
    await init(cwd, { language, hooks });

    console.log('✅ Rules injected → CLAUDE.md');
    console.log('✅ Commands installed → /prism, /checkpoint');
    if (hooks) {
      console.log('✅ Hooks installed → commit-guard, debug-loop, test-tracker, scope-guard');
    } else {
      console.log('⏭️  Hooks skipped (use --no-hooks to skip)');
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
    console.log(`  Language:  ${result.language}`);
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
    console.log('✅ Hook state cleared (edit counters, test timestamps)');
    console.log('\n🌈 Fresh start. All hooks reset.');
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
    await update(cwd);
    console.log('✅ Rules updated');
    console.log('✅ Commands updated');
    console.log('✅ Hooks updated');
    console.log('\n🌈 Prism updated to latest.');
    break;
  }

  default: {
    console.log(`🌈 claude-prism — AI coding problem decomposition tool

Usage:
  prism init [--lang=XX] [--no-hooks]   Install prism in current project
  prism init --global                    Install globally (~/.claude/) + OMC skill
  prism check [--ci]                     Verify installation
  prism doctor                           Diagnose issues with fix suggestions
  prism stats                            Show installation summary
  prism reset                            Clear hook state (edit counters, etc.)
  prism update                           Re-install using current config
  prism update --global                  Update global commands + OMC skill
  prism uninstall                        Remove prism from current project
  prism uninstall --global               Remove global commands + OMC skill

Options:
  --lang=XX    Language: en (default), ko, ja, zh
  --no-hooks   Skip enforcement hooks
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
