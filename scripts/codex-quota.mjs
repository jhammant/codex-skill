#!/usr/bin/env node
// Self-contained Codex quota reader (no deps). Reads the newest ~/.codex rollout's
// `token_count.rate_limits` — the 5h `primary` and weekly `secondary` windows — so the
// /codex skill can check headroom before spending Codex quota. Prints one human line
// plus a JSON line; exits 3 when weekly usage is at/above the near-cap threshold.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NEAR_CAP = Number(process.env.CODEX_NEAR_CAP ?? 90); // weekly % that counts as "near cap"
const sessionsDir = path.join(os.homedir(), '.codex', 'sessions');

function newestRollout(dir) {
  let best = null;
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) {
        const m = fs.statSync(full).mtimeMs;
        if (!best || m > best.m) best = { full, m };
      }
    }
  };
  walk(dir);
  return best?.full ?? null;
}

function latestRateLimits(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('rate_limits')) continue;
    try {
      const rl = JSON.parse(lines[i])?.payload?.rate_limits;
      if (rl?.primary || rl?.secondary) return rl;
    } catch { /* skip */ }
  }
  return null;
}

const file = newestRollout(sessionsDir);
if (!file) {
  console.log('Codex quota: no rollout found under ~/.codex/sessions (run codex once). Proceeding without a check.');
  process.exit(0);
}
const rl = latestRateLimits(file);
if (!rl) {
  console.log('Codex quota: no rate_limits in the newest rollout yet. Proceeding without a check.');
  process.exit(0);
}

const pct = (w) => (Number.isFinite(w?.used_percent) ? Math.round(w.used_percent) : null);
const restH = (w) => (w?.resets_at ? ((w.resets_at * 1000 - Date.now()) / 3.6e6) : null);
const five = pct(rl.primary);
const weekly = pct(rl.secondary);
const weeklyResetH = restH(rl.secondary);
const nearCap = weekly != null && weekly >= NEAR_CAP;
const restStr = weeklyResetH == null ? '' : weeklyResetH > 48 ? ` (weekly resets in ${(weeklyResetH / 24).toFixed(1)}d)` : ` (weekly resets in ${weeklyResetH.toFixed(1)}h)`;

console.log(`Codex quota (plan ${rl.plan_type ?? '?'}): 5h window ${five ?? '?'}% · weekly ${weekly ?? '?'}%${restStr}. ${nearCap ? `⚠ near cap (>=${NEAR_CAP}%)` : 'headroom OK'}`);
console.log(JSON.stringify({ fiveHourPercent: five, weeklyPercent: weekly, weeklyResetsInHours: weeklyResetH == null ? null : Math.round(weeklyResetH), plan: rl.plan_type ?? null, nearCap }));
process.exit(nearCap ? 3 : 0);
