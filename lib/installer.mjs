/**
 * claude-prism — Installer
 * Handles init, check, update, uninstall
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir, homedir } from 'os';
import { detectOmc } from './omc.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

/**
 * Initialize prism in a project
 * @param {string} projectDir - Project root
 * @param {Object} options
 * @param {boolean} options.hooks - Install enforcement hooks
 */
export async function init(projectDir, options = {}) {
  const { hooks = true } = options;

  // 1. Create directories
  const claudeDir = join(projectDir, '.claude');
  const hooksDir = join(claudeDir, 'hooks');

  // 2. Copy namespaced slash commands
  const nsCommandsDir = join(claudeDir, 'commands', 'claude-prism');
  mkdirSync(nsCommandsDir, { recursive: true });

  const commandFiles = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md'];
  for (const cmd of commandFiles) {
    copyFileSync(
      join(TEMPLATES_DIR, 'commands', 'claude-prism', cmd),
      join(nsCommandsDir, cmd)
    );
  }

  // 3. Copy hooks (optional)
  if (hooks) {
    mkdirSync(hooksDir, { recursive: true });

    // Copy unified pipeline runners
    const runnersDir = join(TEMPLATES_DIR, 'runners');
    copyFileSync(join(runnersDir, 'pre-tool.mjs'), join(hooksDir, 'pre-tool.mjs'));
    copyFileSync(join(runnersDir, 'post-tool.mjs'), join(hooksDir, 'post-tool.mjs'));
    copyFileSync(join(runnersDir, 'user-prompt.mjs'), join(hooksDir, 'user-prompt.mjs'));

    // Copy rule logic files
    const rulesDestDir = join(claudeDir, 'rules');
    mkdirSync(rulesDestDir, { recursive: true });
    const hooksSourceDir = join(__dirname, '..', 'hooks');
    copyFileSync(join(hooksSourceDir, 'commit-guard.mjs'), join(rulesDestDir, 'commit-guard.mjs'));
    copyFileSync(join(hooksSourceDir, 'debug-loop.mjs'), join(rulesDestDir, 'debug-loop.mjs'));
    copyFileSync(join(hooksSourceDir, 'test-tracker.mjs'), join(rulesDestDir, 'test-tracker.mjs'));
    copyFileSync(join(hooksSourceDir, 'scope-guard.mjs'), join(rulesDestDir, 'scope-guard.mjs'));
    copyFileSync(join(hooksSourceDir, 'turn-reporter.mjs'), join(rulesDestDir, 'turn-reporter.mjs'));
    copyFileSync(join(hooksSourceDir, 'alignment.mjs'), join(rulesDestDir, 'alignment.mjs'));

    // Copy lib dependencies (adapter + state + config + utils)
    const libDestDir = join(claudeDir, 'lib');
    mkdirSync(libDestDir, { recursive: true });
    const libSourceDir = join(__dirname);
    for (const file of ['adapter.mjs', 'state.mjs', 'config.mjs', 'utils.mjs', 'messages.mjs', 'pipeline.mjs']) {
      copyFileSync(join(libSourceDir, file), join(libDestDir, file));
    }

    // Merge settings.json
    mergeSettings(claudeDir);
  }

  // 4. Inject rules into CLAUDE.md
  injectRules(projectDir);

  // 5. Create .claude-prism.json config
  const configPath = join(projectDir, '.claude-prism.json');
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify({
      hooks: {
        'commit-guard': { enabled: true, maxTestAge: 300 },
        'debug-loop': { enabled: true, warnAt: 3, blockAt: 5 },
        'test-tracker': { enabled: true },
        'scope-guard': { enabled: true, warnAt: 4, blockAt: 7, agentWarnAt: 8, agentBlockAt: 12 },
        'alignment': { enabled: true, driftThreshold: 2 }
      }
    }, null, 2) + '\n');
  }

  // Write version file for doctor to detect mismatches
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  writeFileSync(join(claudeDir, '.prism-version'), pkg.version);
}

/**
 * Check installation status
 * @param {string} projectDir
 * @returns {{ commands: boolean, rules: boolean, hooks: boolean, config: boolean, ok: boolean }}
 */
export function check(projectDir) {
  const claudeDir = join(projectDir, '.claude');

  const nsCommandsDir = join(claudeDir, 'commands', 'claude-prism');
  const commands = existsSync(join(nsCommandsDir, 'prism.md'))
    && existsSync(join(nsCommandsDir, 'checkpoint.md'))
    && existsSync(join(nsCommandsDir, 'plan.md'))
    && existsSync(join(nsCommandsDir, 'help.md'));

  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  const rules = existsSync(claudeMdPath)
    && readFileSync(claudeMdPath, 'utf8').includes('<!-- PRISM:START -->');

  const hooks = existsSync(join(claudeDir, 'hooks', 'pre-tool.mjs'))
    && existsSync(join(claudeDir, 'hooks', 'post-tool.mjs'));

  const config = existsSync(join(projectDir, '.claude-prism.json'));

  return {
    commands,
    rules,
    hooks,
    config,
    ok: commands && rules && config
  };
}

/**
 * Uninstall prism from a project
 * @param {string} projectDir
 */
export function uninstall(projectDir) {
  const claudeDir = join(projectDir, '.claude');

  // 1. Remove PRISM block from CLAUDE.md
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  if (existsSync(claudeMdPath)) {
    const content = readFileSync(claudeMdPath, 'utf8');
    const startMarker = '<!-- PRISM:START -->';
    const endMarker = '<!-- PRISM:END -->';
    if (content.includes(startMarker) && content.includes(endMarker)) {
      const before = content.slice(0, content.indexOf(startMarker));
      const after = content.slice(content.indexOf(endMarker) + endMarker.length);
      writeFileSync(claudeMdPath, (before + after).replace(/\n{3,}/g, '\n\n').trim() + '\n');
    }
  }

  // 2. Remove namespaced commands directory
  const nsCommandsDir = join(claudeDir, 'commands', 'claude-prism');
  if (existsSync(nsCommandsDir)) rmSync(nsCommandsDir, { recursive: true });

  // 2b. Remove legacy flat commands (migration cleanup)
  for (const cmd of ['prism.md', 'checkpoint.md']) {
    const p = join(claudeDir, 'commands', cmd);
    if (existsSync(p)) rmSync(p);
  }

  // 3. Remove prism hooks
  for (const hook of ['commit-guard.mjs', 'debug-loop.mjs', 'test-tracker.mjs', 'scope-guard.mjs', 'pre-tool.mjs', 'post-tool.mjs', 'user-prompt.mjs']) {
    const p = join(claudeDir, 'hooks', hook);
    if (existsSync(p)) rmSync(p);
  }

  // 4. Remove rules/ and lib/ directories
  const rulesDir = join(claudeDir, 'rules');
  if (existsSync(rulesDir)) rmSync(rulesDir, { recursive: true });
  const libDir = join(claudeDir, 'lib');
  if (existsSync(libDir)) rmSync(libDir, { recursive: true });

  // 5. Clean prism hooks from settings.json
  const settingsPath = join(claudeDir, 'settings.json');
  if (existsSync(settingsPath)) {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    if (settings.hooks) {
      for (const [event, hookList] of Object.entries(settings.hooks)) {
        settings.hooks[event] = hookList.filter(
          h => !h.hooks?.some(hh => hh.command?.includes('commit-guard') || hh.command?.includes('debug-loop') || hh.command?.includes('test-tracker') || hh.command?.includes('scope-guard') || hh.command?.includes('pre-tool') || hh.command?.includes('post-tool') || hh.command?.includes('user-prompt'))
        );
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  // 6. Remove .claude-prism.json and legacy .prism.json
  const configPath = join(projectDir, '.claude-prism.json');
  if (existsSync(configPath)) rmSync(configPath);
  const legacyConfigPath = join(projectDir, '.prism.json');
  if (existsSync(legacyConfigPath)) rmSync(legacyConfigPath);

  // Remove version file
  const versionFile = join(claudeDir, '.prism-version');
  if (existsSync(versionFile)) rmSync(versionFile);
}

/**
 * Update prism — re-install using existing config
 * @param {string} projectDir
 */
export async function update(projectDir) {
  // Migration: rename .prism.json to .claude-prism.json
  const oldConfigPath = join(projectDir, '.prism.json');
  const newConfigPath = join(projectDir, '.claude-prism.json');
  if (existsSync(oldConfigPath) && !existsSync(newConfigPath)) {
    renameSync(oldConfigPath, newConfigPath);
  }

  const configPath = newConfigPath;
  let hooks = true;

  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    hooks = config.hooks?.['commit-guard']?.enabled !== false;
  }

  // Migration: remove legacy flat commands before re-init
  const claudeDir = join(projectDir, '.claude');
  for (const cmd of ['prism.md', 'checkpoint.md']) {
    const p = join(claudeDir, 'commands', cmd);
    if (existsSync(p)) rmSync(p);
  }

  // Migration: remove deprecated namespaced commands
  for (const cmd of ['understand.md']) {
    const p = join(claudeDir, 'commands', 'claude-prism', cmd);
    if (existsSync(p)) rmSync(p);
  }

  // Migration: remove legacy individual runners (now using unified pipeline runners)
  for (const runner of ['commit-guard.mjs', 'debug-loop.mjs', 'test-tracker.mjs', 'scope-guard.mjs']) {
    const p = join(claudeDir, 'hooks', runner);
    if (existsSync(p)) rmSync(p);
  }

  // Remove old config so init creates a fresh one
  if (existsSync(configPath)) rmSync(configPath);

  await init(projectDir, { hooks });
}

/**
 * Diagnose installation issues with actionable fix suggestions
 * @param {string} projectDir
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 * @returns {{ healthy: boolean, issues: string[], fixes: string[], omc: Object }}
 */
export function doctor(projectDir, options = {}) {
  const claudeDir = join(projectDir, '.claude');
  const issues = [];
  const fixes = [];

  // Check namespaced commands
  const nsCommandsDir = join(claudeDir, 'commands', 'claude-prism');
  const expectedCommands = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md'];
  for (const cmd of expectedCommands) {
    if (!existsSync(join(nsCommandsDir, cmd))) {
      issues.push(`Missing command: claude-prism/${cmd}`);
      fixes.push('Run `prism update` to restore missing files');
    }
  }

  // Check for legacy flat commands (need migration)
  for (const cmd of ['prism.md', 'checkpoint.md']) {
    if (existsSync(join(claudeDir, 'commands', cmd))) {
      issues.push(`Legacy command found: ${cmd} (needs migration to namespace)`);
      fixes.push('Run `prism update` to migrate to namespaced commands');
    }
  }

  // Check hooks
  for (const hook of ['pre-tool.mjs', 'post-tool.mjs']) {
    if (!existsSync(join(claudeDir, 'hooks', hook))) {
      issues.push(`Missing hook: ${hook}`);
      fixes.push('Run `prism update` to restore missing files');
    }
  }

  // Check optional hooks (warn only, don't affect ok)
  for (const hook of ['user-prompt.mjs']) {
    if (!existsSync(join(claudeDir, 'hooks', hook))) {
      issues.push(`Missing optional hook: ${hook} (turn reporter)`);
      fixes.push('Run `prism update` to restore missing files');
    }
  }

  // Check CLAUDE.md
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  if (!existsSync(claudeMdPath)) {
    issues.push('CLAUDE.md not found');
    fixes.push('Run `prism update` to regenerate CLAUDE.md rules');
  } else {
    const content = readFileSync(claudeMdPath, 'utf8');
    if (!content.includes('<!-- PRISM:START -->')) {
      issues.push('CLAUDE.md missing PRISM rules block');
      fixes.push('Run `prism update` to re-inject rules');
    }
  }

  // Check config
  if (!existsSync(join(projectDir, '.claude-prism.json'))) {
    issues.push('Missing .claude-prism.json config');
    fixes.push('Run `prism init` to create config');
  }

  // Check for legacy .prism.json
  if (existsSync(join(projectDir, '.prism.json'))) {
    issues.push('Legacy .prism.json found (needs migration to .claude-prism.json)');
    fixes.push('Run `prism update` to migrate');
  }

  // Check rules/ and lib/
  if (!existsSync(join(claudeDir, 'rules'))) {
    issues.push('Missing .claude/rules/ directory');
    fixes.push('Run `prism update` to restore');
  }
  if (!existsSync(join(claudeDir, 'lib'))) {
    issues.push('Missing .claude/lib/ directory');
    fixes.push('Run `prism update` to restore');
  }

  // Check version mismatch
  const versionFile = join(claudeDir, '.prism-version');
  if (existsSync(versionFile)) {
    const installedVersion = readFileSync(versionFile, 'utf8').trim();
    const pkgPath = join(__dirname, '..', 'package.json');
    const currentVersion = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
    if (installedVersion !== currentVersion) {
      issues.push(`Version mismatch: installed v${installedVersion}, CLI v${currentVersion}`);
      fixes.push('Run `prism update` to sync installed files with current CLI version');
    }
  }

  // Deduplicate fixes
  const uniqueFixes = [...new Set(fixes)];

  // Detect OMC
  const omc = detectOmc(options.homeDir);

  return {
    healthy: issues.length === 0,
    issues,
    fixes: uniqueFixes,
    omc
  };
}

/**
 * Show installation statistics
 * @param {string} projectDir
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 * @returns {{ version: string, hooks: Object, planFiles: number, omc: Object }}
 */
export function stats(projectDir, options = {}) {
  // Read version from package.json
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  // Read config
  const configPath = join(projectDir, '.claude-prism.json');
  let hookConfig = {};

  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (config.hooks) {
      for (const [name, cfg] of Object.entries(config.hooks)) {
        hookConfig[name] = cfg.enabled !== false;
      }
    }
  }

  // Count plan files
  let planFiles = 0;
  const plansDir = join(projectDir, 'docs', 'plans');
  if (existsSync(plansDir)) {
    planFiles = readdirSync(plansDir).filter(f => f.endsWith('.md')).length;
  }

  // Detect OMC
  const omc = detectOmc(options.homeDir);

  return {
    version: pkg.version,
    hooks: hookConfig,
    planFiles,
    omc
  };
}

/**
 * Reset hook state (clear edit counters, test timestamps)
 * @returns {boolean}
 */
export function reset() {
  const stateRoot = join(tmpdir(), '.prism');
  if (existsSync(stateRoot)) {
    rmSync(stateRoot, { recursive: true });
  }
  return true;
}

/**
 * Install prism globally (slash commands + OMC skill)
 * Target: ~/.claude/commands/claude-prism/ and ~/.claude/skills/prism/
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 */
export function initGlobal(options = {}) {
  const home = options.homeDir || homedir();
  const claudeDir = join(home, '.claude');

  // 1. Install slash commands globally
  const commandsDir = join(claudeDir, 'commands', 'claude-prism');
  mkdirSync(commandsDir, { recursive: true });

  const commandFiles = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md'];
  for (const cmd of commandFiles) {
    copyFileSync(
      join(TEMPLATES_DIR, 'commands', 'claude-prism', cmd),
      join(commandsDir, cmd)
    );
  }

  // 2. Install OMC skill
  const skillDir = join(claudeDir, 'skills', 'prism');
  mkdirSync(skillDir, { recursive: true });
  copyFileSync(
    join(TEMPLATES_DIR, 'skills', 'prism', 'SKILL.md'),
    join(skillDir, 'SKILL.md')
  );
}

/**
 * Uninstall global prism (slash commands + OMC skill)
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 */
export function uninstallGlobal(options = {}) {
  const home = options.homeDir || homedir();
  const claudeDir = join(home, '.claude');

  const commandsDir = join(claudeDir, 'commands', 'claude-prism');
  if (existsSync(commandsDir)) rmSync(commandsDir, { recursive: true });

  const skillDir = join(claudeDir, 'skills', 'prism');
  if (existsSync(skillDir)) rmSync(skillDir, { recursive: true });
}

/**
 * Dry-run: show what init would do without making changes
 * @param {string} projectDir
 * @param {Object} options
 * @returns {{ actions: Array<{type: string, path: string, status: string}> }}
 */
export function dryRun(projectDir, options = {}) {
  const { hooks = true } = options;
  const claudeDir = join(projectDir, '.claude');
  const actions = [];

  // Commands
  const nsCommandsDir = join(claudeDir, 'commands', 'claude-prism');
  const commandFiles = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md'];
  for (const cmd of commandFiles) {
    const target = join(nsCommandsDir, cmd);
    actions.push({
      type: 'command',
      path: `.claude/commands/claude-prism/${cmd}`,
      status: existsSync(target) ? 'update' : 'create'
    });
  }

  // Hooks
  if (hooks) {
    const hookFiles = ['pre-tool.mjs', 'post-tool.mjs', 'user-prompt.mjs'];
    for (const hook of hookFiles) {
      const target = join(claudeDir, 'hooks', hook);
      actions.push({
        type: 'hook',
        path: `.claude/hooks/${hook}`,
        status: existsSync(target) ? 'update' : 'create'
      });
    }

    const ruleFiles = ['commit-guard.mjs', 'debug-loop.mjs', 'test-tracker.mjs', 'scope-guard.mjs', 'turn-reporter.mjs', 'alignment.mjs'];
    for (const rule of ruleFiles) {
      const target = join(claudeDir, 'rules', rule);
      actions.push({
        type: 'rule',
        path: `.claude/rules/${rule}`,
        status: existsSync(target) ? 'update' : 'create'
      });
    }

    const libFiles = ['adapter.mjs', 'state.mjs', 'config.mjs', 'utils.mjs', 'messages.mjs', 'pipeline.mjs'];
    for (const lib of libFiles) {
      const target = join(claudeDir, 'lib', lib);
      actions.push({
        type: 'lib',
        path: `.claude/lib/${lib}`,
        status: existsSync(target) ? 'update' : 'create'
      });
    }
  }

  // CLAUDE.md
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  actions.push({
    type: 'rules',
    path: 'CLAUDE.md',
    status: existsSync(claudeMdPath) ? 'update' : 'create'
  });

  // Config
  const configPath = join(projectDir, '.claude-prism.json');
  if (!existsSync(configPath)) {
    actions.push({ type: 'config', path: '.claude-prism.json', status: 'create' });
  }

  return { actions };
}

// ─── internal helpers ───

function injectRules(projectDir) {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  const rulesPath = join(TEMPLATES_DIR, 'rules.md');
  if (!existsSync(rulesPath)) return;

  const rules = readFileSync(rulesPath, 'utf8');

  let existing = '';
  if (existsSync(claudeMdPath)) {
    existing = readFileSync(claudeMdPath, 'utf8');
  }

  // Replace existing PRISM block or append
  const startMarker = '<!-- PRISM:START -->';
  const endMarker = '<!-- PRISM:END -->';

  if (existing.includes(startMarker) && existing.includes(endMarker)) {
    const before = existing.slice(0, existing.indexOf(startMarker));
    const after = existing.slice(existing.indexOf(endMarker) + endMarker.length);
    writeFileSync(claudeMdPath, before + rules + after);
  } else {
    writeFileSync(claudeMdPath, existing + '\n' + rules);
  }
}

function mergeSettings(claudeDir) {
  const settingsPath = join(claudeDir, 'settings.json');
  const templatePath = join(TEMPLATES_DIR, 'settings.json');

  const template = JSON.parse(readFileSync(templatePath, 'utf8'));

  if (existsSync(settingsPath)) {
    const existing = JSON.parse(readFileSync(settingsPath, 'utf8'));

    // Merge hooks arrays by event type
    if (!existing.hooks) existing.hooks = {};
    for (const [event, hookList] of Object.entries(template.hooks)) {
      if (!existing.hooks[event]) {
        existing.hooks[event] = hookList;
      } else {
        // Add prism hooks that don't already exist
        for (const hook of hookList) {
          const alreadyExists = existing.hooks[event].some(
            h => h.hooks?.[0]?.command === hook.hooks?.[0]?.command
          );
          if (!alreadyExists) {
            existing.hooks[event].push(hook);
          }
        }
      }
    }

    writeFileSync(settingsPath, JSON.stringify(existing, null, 2) + '\n');
  } else {
    writeFileSync(settingsPath, JSON.stringify(template, null, 2) + '\n');
  }
}
