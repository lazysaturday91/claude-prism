#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir, tmpdir } from 'os';

function shortenModelName(name) {
  return name
    .replace('Claude 3.5 Sonnet', 'Sonnet 3.5')
    .replace('Claude 3 Opus', 'Opus 3')
    .replace('Claude 3 Haiku', 'Haiku 3')
    .replace('Claude ', '');
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function hasGitChanges(cwd) {
  try {
    const status = execSync('git -c core.fileMode=false status --porcelain 2>/dev/null', {
      encoding: 'utf-8', cwd, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return status.length > 0;
  } catch { return false; }
}

function getPlanUsage() {
  try {
    const cachePath = join(homedir(), '.claude', 'plugins', 'oh-my-claudecode', '.usage-cache.json');
    if (!existsSync(cachePath)) return null;
    const cache = JSON.parse(readFileSync(cachePath, 'utf-8'));
    if (cache.error || !cache.data) return null;
    const now = new Date();
    const { fiveHourPercent, weeklyPercent, fiveHourResetsAt, weeklyResetsAt } = cache.data;
    const minutesUntilReset = Math.max(0, Math.round((new Date(fiveHourResetsAt) - now) / 60000));
    const weeklyReset = new Date(weeklyResetsAt);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      session: fiveHourPercent,
      weekly: weeklyPercent,
      sessionResetMin: minutesUntilReset,
      weeklyResetLabel: `${dayNames[weeklyReset.getDay()]} ${String(weeklyReset.getHours()).padStart(2, '0')}:${String(weeklyReset.getMinutes()).padStart(2, '0')}`
    };
  } catch { return null; }
}

function getGitRoot(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel 2>/dev/null', {
      encoding: 'utf-8', cwd, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch { return null; }
}

function getActivePlan(cwd) {
  try {
    const gitRoot = getGitRoot(cwd);
    if (!gitRoot) return null;
    const plansDir = join(gitRoot, 'docs', 'plans');
    if (!existsSync(plansDir)) return null;
    const files = readdirSync(plansDir).filter(f => f.endsWith('.md')).sort().reverse();
    if (files.length === 0) return null;
    const latestFile = files[0];
    const content = readFileSync(join(plansDir, latestFile), 'utf-8');
    const doneCount = (content.match(/- \[x\]/gi) || []).length;
    const todoCount = (content.match(/- \[ \]/g) || []).length;
    const total = doneCount + todoCount;
    const planName = latestFile.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
    return { name: planName, done: doneCount, total, percent: total > 0 ? Math.round((doneCount / total) * 100) : 0 };
  } catch { return null; }
}

function relativeTime(unixTimestamp) {
  const diff = Math.floor(Date.now() / 1000) - unixTimestamp;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

function getRecentCommit(cwd) {
  try {
    const raw = execSync('git log -1 --format="%s|%ct" 2>/dev/null', {
      encoding: 'utf-8', cwd, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (!raw) return null;
    const sepIdx = raw.lastIndexOf('|');
    if (sepIdx === -1) return null;
    const message = raw.substring(0, sepIdx);
    const timestamp = parseInt(raw.substring(sepIdx + 1), 10);
    const maxLen = 25;
    const truncated = message.length > maxLen ? message.substring(0, maxLen - 1) + '\u2026' : message;
    return { message: truncated, elapsed: relativeTime(timestamp) };
  } catch { return null; }
}

function getTestStatus() {
  try {
    const prismRoot = join(tmpdir(), '.prism');
    if (!existsSync(prismRoot)) return null;
    let latestRun = 0;
    let latestDir = null;
    for (const dir of readdirSync(prismRoot)) {
      const dirPath = join(prismRoot, dir);
      try { if (!statSync(dirPath).isDirectory()) continue; } catch { continue; }
      const runFile = join(dirPath, 'last-test-run');
      if (!existsSync(runFile)) continue;
      const runTs = parseInt(readFileSync(runFile, 'utf-8').trim(), 10);
      if (runTs > latestRun) { latestRun = runTs; latestDir = dirPath; }
    }
    if (!latestDir) return null;
    const resultFile = join(latestDir, 'last-test-result');
    const result = existsSync(resultFile) ? readFileSync(resultFile, 'utf-8').trim() : null;
    return { passed: result === 'pass', elapsed: relativeTime(latestRun) };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════

try {
  const fs = await import('fs');
  const input = fs.readFileSync(0, 'utf-8');
  const context = JSON.parse(input);

  const cwd = context.workspace?.current_dir || process.cwd();
  const dirName = cwd.split('/').pop();
  const modelName = shortenModelName(context.model?.display_name || 'Claude');
  const remaining = context.context_window?.remaining_percentage;
  const planUsage = getPlanUsage();

  let gitBranch = '';
  let gitDirty = false;
  try {
    gitBranch = execSync(
      'git -c core.fileMode=false -c core.checkStat=minimal symbolic-ref --short HEAD 2>/dev/null || git -c core.fileMode=false -c core.checkStat=minimal rev-parse --short HEAD 2>/dev/null',
      { encoding: 'utf-8', cwd, stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (gitBranch) gitDirty = hasGitChanges(cwd);
  } catch {}

  const activePlan = getActivePlan(cwd);
  const recentCommit = getRecentCommit(cwd);
  const testStatus = getTestStatus();

  const S = ' | ';

  // ── Line 1: Project:Branch | Model | Ctx% | Time ──
  const line1 = [];
  if (gitBranch) {
    const dirty = gitDirty ? '*' : '';
    line1.push(`\u26A1 ${dirName}:${gitBranch}${dirty}`);
  } else {
    line1.push(`\u26A1 ${dirName}`);
  }
  line1.push(modelName);
  if (remaining !== null && remaining !== undefined) {
    const pct = Math.round(remaining);
    const icon = pct < 20 ? '\uD83D\uDD34' : pct < 50 ? '\u26A0\uFE0F' : '\uD83D\uDD0B';
    line1.push(`${icon}${pct}%`);
  }
  line1.push(getCurrentTime());

  // ── Line 2: Plan + Commit + Test ──
  const line2 = [];
  if (activePlan) {
    const short = activePlan.name.length > 12 ? activePlan.name.substring(0, 11) + '\u2026' : activePlan.name;
    line2.push(`\uD83D\uDCCB ${short} ${activePlan.percent}%(${activePlan.done}/${activePlan.total})`);
  }
  if (recentCommit) {
    line2.push(`\uD83D\uDCBE ${recentCommit.message}(${recentCommit.elapsed})`);
  }
  if (testStatus) {
    line2.push(`${testStatus.passed ? '\u2705' : '\u274C'}${testStatus.elapsed}`);
  }

  // ── Line 3: Usage ──
  const line3 = [];
  if (planUsage) {
    const warn = (planUsage.session > 95 || planUsage.weekly > 95) ? '\uD83D\uDD34' : (planUsage.session > 80 || planUsage.weekly > 80) ? '\u26A0\uFE0F' : '';
    line3.push(`\uD83D\uDCCA ${planUsage.session}%(${planUsage.sessionResetMin}m) \u2502 \uC8FC\uAC04${planUsage.weekly}%(${planUsage.weeklyResetLabel})${warn}`);
  }

  // ── Compose ──
  const lines = [line1.join(S)];
  if (line2.length > 0) lines.push(line2.join(S));
  if (line3.length > 0) lines.push(line3.join(S));

  console.log(lines.join('\n'));

} catch (e) {
  const powerEmojis = ['\u26A1', '\uD83D\uDD25', '\uD83D\uDE80', '\u2728'];
  const randomEmoji = powerEmojis[Math.floor(Math.random() * powerEmojis.length)];
  console.log(`${randomEmoji} LazySaturday \u276F \uD83E\uDDE0 Claude \u276F \uD83D\uDD50 ${getCurrentTime()}`);
}
