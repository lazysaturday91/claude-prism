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
 * @param {boolean} options.hooks - Install commit-guard hook
 */
export async function init(projectDir, options = {}) {
  const { hooks = true } = options;

  // 1. Create directories
  const claudeDir = join(projectDir, '.claude');

  // 2. Copy namespaced slash commands
  const nsCommandsDir = join(claudeDir, 'commands', 'claude-prism');
  mkdirSync(nsCommandsDir, { recursive: true });

  const commandFiles = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md', 'analytics.md', 'hud.md'];
  for (const cmd of commandFiles) {
    copyFileSync(
      join(TEMPLATES_DIR, 'commands', 'claude-prism', cmd),
      join(nsCommandsDir, cmd)
    );
  }

  // 3. Copy hooks (optional — only commit-guard + test-tracker)
  if (hooks) {
    const hooksDir = join(claudeDir, 'hooks');
    mkdirSync(hooksDir, { recursive: true });

    // Copy unified pipeline runners
    const runnersDir = join(TEMPLATES_DIR, 'runners');
    copyFileSync(join(runnersDir, 'pre-tool.mjs'), join(hooksDir, 'pre-tool.mjs'));
    copyFileSync(join(runnersDir, 'post-tool.mjs'), join(hooksDir, 'post-tool.mjs'));

    // Copy rule logic files
    const rulesDestDir = join(claudeDir, 'rules');
    mkdirSync(rulesDestDir, { recursive: true });
    const hooksSourceDir = join(__dirname, '..', 'hooks');
    copyFileSync(join(hooksSourceDir, 'commit-guard.mjs'), join(rulesDestDir, 'commit-guard.mjs'));
    copyFileSync(join(hooksSourceDir, 'test-tracker.mjs'), join(rulesDestDir, 'test-tracker.mjs'));
    copyFileSync(join(hooksSourceDir, 'plan-enforcement.mjs'), join(rulesDestDir, 'plan-enforcement.mjs'));

    // Copy lib dependencies
    const libDestDir = join(claudeDir, 'lib');
    mkdirSync(libDestDir, { recursive: true });
    const libSourceDir = join(__dirname);
    for (const file of ['state.mjs', 'config.mjs', 'utils.mjs', 'messages.mjs', 'pipeline.mjs', 'session.mjs']) {
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
      version: 1,
      hooks: {
        'commit-guard': { enabled: true, maxTestAge: 300 },
        'test-tracker': { enabled: true },
        'plan-enforcement': { enabled: true, warnAt: 6 }
      }
    }, null, 2) + '\n');
  }

  // Write version file
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

  // 2b. Remove legacy flat commands
  for (const cmd of ['prism.md', 'checkpoint.md']) {
    const p = join(claudeDir, 'commands', cmd);
    if (existsSync(p)) rmSync(p);
  }

  // 3. Remove hooks
  for (const hook of ['pre-tool.mjs', 'post-tool.mjs', 'user-prompt.mjs']) {
    const p = join(claudeDir, 'hooks', hook);
    if (existsSync(p)) rmSync(p);
  }

  // 3b. Remove legacy individual hook runners
  for (const hook of ['commit-guard.mjs', 'debug-loop.mjs', 'test-tracker.mjs', 'scope-guard.mjs']) {
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
          h => !h.hooks?.some(hh => hh.command?.includes('pre-tool') || hh.command?.includes('post-tool') || hh.command?.includes('user-prompt') || hh.command?.includes('commit-guard') || hh.command?.includes('debug-loop') || hh.command?.includes('test-tracker') || hh.command?.includes('scope-guard'))
        );
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  // 6. Remove config files
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
  // Self-update detection: if running inside the claude-prism source repo,
  // use local templates instead of the npx-downloaded package templates
  let sourceRepo = false;
  const localPkgPath = join(projectDir, 'package.json');
  if (existsSync(localPkgPath)) {
    try {
      const localPkg = JSON.parse(readFileSync(localPkgPath, 'utf8'));
      if (localPkg.name === 'claude-prism') {
        const localRulesPath = join(projectDir, 'templates', 'rules.md');
        if (existsSync(localRulesPath)) {
          sourceRepo = true;
        }
      }
    } catch { /* not our package, proceed normally */ }
  }

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

  const claudeDir = join(projectDir, '.claude');

  // Migration: remove all legacy files from previous versions
  const legacyFiles = [
    // Legacy flat commands
    join(claudeDir, 'commands', 'prism.md'),
    join(claudeDir, 'commands', 'checkpoint.md'),
    join(claudeDir, 'commands', 'claude-prism', 'understand.md'),
    // Legacy individual runners
    join(claudeDir, 'hooks', 'commit-guard.mjs'),
    join(claudeDir, 'hooks', 'debug-loop.mjs'),
    join(claudeDir, 'hooks', 'test-tracker.mjs'),
    join(claudeDir, 'hooks', 'scope-guard.mjs'),
    // Removed hooks (v1.0 cleanup)
    join(claudeDir, 'hooks', 'user-prompt.mjs'),
    join(claudeDir, 'rules', 'scope-guard.mjs'),
    join(claudeDir, 'rules', 'debug-loop.mjs'),
    join(claudeDir, 'rules', 'alignment.mjs'),
    join(claudeDir, 'rules', 'turn-reporter.mjs'),
    // Removed lib files
    join(claudeDir, 'lib', 'adapter.mjs'),
  ];
  for (const p of legacyFiles) {
    if (existsSync(p)) rmSync(p);
  }

  // Migration: remove legacy hook entries from settings.json
  const settingsPath = join(claudeDir, 'settings.json');
  if (existsSync(settingsPath)) {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    if (settings.hooks) {
      const legacyCommands = ['commit-guard', 'debug-loop', 'test-tracker', 'scope-guard', 'user-prompt'];
      for (const [event, hookList] of Object.entries(settings.hooks)) {
        settings.hooks[event] = hookList.filter(
          h => !h.hooks?.some(hh => legacyCommands.some(lc => hh.command?.includes(lc)))
        );
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    }
  }

  // Migrate config: add version field if missing
  if (existsSync(configPath)) {
    try {
      const existingConfig = JSON.parse(readFileSync(configPath, 'utf8'));
      if (!existingConfig.version) {
        existingConfig.version = 1;
        writeFileSync(configPath, JSON.stringify(existingConfig, null, 2) + '\n');
      }
    } catch { /* proceed with fresh config */ }
    rmSync(configPath);
  }

  await init(projectDir, { hooks });

  // Source repo: re-inject rules from local templates (overrides the npx version)
  if (sourceRepo) {
    const localRulesPath = join(projectDir, 'templates', 'rules.md');
    injectRules(projectDir, localRulesPath);
  }

  return sourceRepo ? { sourceRepo: true } : undefined;
}

/**
 * Diagnose installation issues
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
  const expectedCommands = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md', 'analytics.md', 'hud.md'];
  for (const cmd of expectedCommands) {
    if (!existsSync(join(nsCommandsDir, cmd))) {
      issues.push(`Missing command: claude-prism/${cmd}`);
      fixes.push('Run `prism update` to restore missing files');
    }
  }

  // Check hooks
  for (const hook of ['pre-tool.mjs', 'post-tool.mjs']) {
    if (!existsSync(join(claudeDir, 'hooks', hook))) {
      issues.push(`Missing hook: ${hook}`);
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

  // Check for legacy flat commands
  for (const cmd of ['prism.md', 'checkpoint.md']) {
    if (existsSync(join(claudeDir, 'commands', cmd))) {
      issues.push(`Legacy command found: ${cmd}`);
      fixes.push('Run `prism update` to migrate legacy commands');
    }
  }

  // Check for legacy files that should be cleaned up
  const legacyCheck = [
    { path: join(claudeDir, 'rules', 'scope-guard.mjs'), label: 'Legacy scope-guard rule' },
    { path: join(claudeDir, 'rules', 'debug-loop.mjs'), label: 'Legacy debug-loop rule' },
    { path: join(claudeDir, 'rules', 'alignment.mjs'), label: 'Legacy alignment rule' },
    { path: join(claudeDir, 'hooks', 'user-prompt.mjs'), label: 'Legacy user-prompt hook' },
    { path: join(projectDir, '.prism.json'), label: 'Legacy .prism.json config' },
  ];
  for (const { path, label } of legacyCheck) {
    if (existsSync(path)) {
      issues.push(`${label} found (removed in v1.0)`);
      fixes.push('Run `prism update` to clean up legacy files');
    }
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
  const pkgPath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

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

  let planFiles = 0;
  const plansDir = join(projectDir, 'docs', 'plans');
  if (existsSync(plansDir)) {
    planFiles = readdirSync(plansDir).filter(f => f.endsWith('.md')).length;
  }

  const omc = detectOmc(options.homeDir);

  return {
    version: pkg.version,
    hooks: hookConfig,
    planFiles,
    omc
  };
}

/**
 * Reset hook state
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
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 */
export function initGlobal(options = {}) {
  const home = options.homeDir || homedir();
  const claudeDir = join(home, '.claude');

  const commandsDir = join(claudeDir, 'commands', 'claude-prism');
  mkdirSync(commandsDir, { recursive: true });

  const commandFiles = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md', 'analytics.md', 'hud.md'];
  for (const cmd of commandFiles) {
    copyFileSync(
      join(TEMPLATES_DIR, 'commands', 'claude-prism', cmd),
      join(commandsDir, cmd)
    );
  }

  const skillDir = join(claudeDir, 'skills', 'prism');
  mkdirSync(skillDir, { recursive: true });
  copyFileSync(
    join(TEMPLATES_DIR, 'skills', 'prism', 'SKILL.md'),
    join(skillDir, 'SKILL.md')
  );
}

/**
 * Uninstall global prism
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
 * Dry-run: show what init would do
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
  const commandFiles = ['prism.md', 'checkpoint.md', 'plan.md', 'doctor.md', 'stats.md', 'help.md', 'update.md', 'analytics.md', 'hud.md'];
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
    for (const hook of ['pre-tool.mjs', 'post-tool.mjs']) {
      const target = join(claudeDir, 'hooks', hook);
      actions.push({
        type: 'hook',
        path: `.claude/hooks/${hook}`,
        status: existsSync(target) ? 'update' : 'create'
      });
    }

    for (const rule of ['commit-guard.mjs', 'test-tracker.mjs', 'plan-enforcement.mjs']) {
      const target = join(claudeDir, 'rules', rule);
      actions.push({
        type: 'rule',
        path: `.claude/rules/${rule}`,
        status: existsSync(target) ? 'update' : 'create'
      });
    }

    for (const lib of ['state.mjs', 'config.mjs', 'utils.mjs', 'messages.mjs', 'pipeline.mjs', 'session.mjs']) {
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

// ─── HUD management ───

/**
 * Install the Prism HUD statusline
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 */
export function installHud(options = {}) {
  const home = options.homeDir || homedir();
  const claudeDir = join(home, '.claude');
  const hudDir = join(claudeDir, 'hud');

  // 1. Copy HUD script
  mkdirSync(hudDir, { recursive: true });
  const scriptDest = join(hudDir, 'omc-hud.mjs');
  const scriptSrc = join(TEMPLATES_DIR, 'hud', 'omc-hud.mjs');

  // Backup existing custom HUD if present and different from generic wrapper
  if (existsSync(scriptDest)) {
    const existing = readFileSync(scriptDest, 'utf8');
    // If existing file is larger than our template it's likely a custom HUD — keep a backup
    const template = readFileSync(scriptSrc, 'utf8');
    if (existing.length > template.length + 100) {
      writeFileSync(join(hudDir, 'omc-hud.mjs.prism-backup'), existing);
    }
  }

  copyFileSync(scriptSrc, scriptDest);

  // 2. Update ~/.claude/settings.json
  const settingsPath = join(claudeDir, 'settings.json');
  let settings = {};
  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  }
  settings.statusLine = {
    type: 'command',
    command: `node ${scriptDest}`
  };
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

  return { scriptPath: scriptDest };
}

/**
 * Disable the Prism HUD statusline (removes statusLine from settings)
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 */
export function uninstallHud(options = {}) {
  const home = options.homeDir || homedir();
  const settingsPath = join(home, '.claude', 'settings.json');

  if (!existsSync(settingsPath)) return;

  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  delete settings.statusLine;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Get current HUD status
 * @param {Object} [options]
 * @param {string} [options.homeDir] - Override home dir (for testing)
 * @returns {{ enabled: boolean, scriptExists: boolean, command: string|undefined }}
 */
export function hudStatus(options = {}) {
  const home = options.homeDir || homedir();
  const settingsPath = join(home, '.claude', 'settings.json');
  const scriptPath = join(home, '.claude', 'hud', 'omc-hud.mjs');

  if (!existsSync(settingsPath)) {
    return { enabled: false, scriptExists: existsSync(scriptPath), command: undefined };
  }

  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  const cmd = settings.statusLine?.command;
  const enabled = settings.statusLine?.type === 'command' && !!cmd?.includes('omc-hud.mjs');

  return { enabled, scriptExists: existsSync(scriptPath), command: cmd };
}

// ─── internal helpers ───

function injectRules(projectDir, overrideRulesPath) {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  const rulesPath = overrideRulesPath || join(TEMPLATES_DIR, 'rules.md');
  if (!existsSync(rulesPath)) return;

  const rules = readFileSync(rulesPath, 'utf8');

  let existing = '';
  if (existsSync(claudeMdPath)) {
    existing = readFileSync(claudeMdPath, 'utf8');
  }

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

    if (!existing.hooks) existing.hooks = {};
    for (const [event, hookList] of Object.entries(template.hooks)) {
      if (!existing.hooks[event]) {
        existing.hooks[event] = hookList;
      } else {
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
