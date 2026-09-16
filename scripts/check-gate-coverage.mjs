#!/usr/bin/env node
/**
 * Reports, for every app in the portfolio, which gates actually run.
 *
 * This exists because `check-drift.mjs` reported `0 absent` while fourteen apps
 * had no paywall gate and no mixed-script gate at all. Drift was not wrong — it
 * compares generated apps against `_template`, and it only knows the apps it
 * generated. Fourteen apps here predate the template, so for those it reports
 * nothing: not "missing", not "absent", nothing. A tool working correctly, and
 * a false conclusion drawn from it.
 *
 * It also answers the question that matters more, which drift cannot ask at
 * all: a gate can be *present and never run*. The script sits in `scripts/`,
 * greps clean, and executes in nothing. That reads as fixed while it guards
 * nothing — the worse of the two failures, because it is invisible.
 *
 * So coverage here means wired, not present:
 *
 *   present  — the file exists in the app
 *   wired    — some entry point actually invokes it
 *
 * An app that has a gate but never runs it is reported as a failure, not a pass.
 *
 * Usage:
 *   node scripts/check-gate-coverage.mjs          # report, exit 1 on any gap
 *   node scripts/check-gate-coverage.mjs --list   # report only, always exit 0
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHARED = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTFOLIO = resolve(SHARED, '..');
const listOnly = process.argv.includes('--list');

/**
 * The gates every app with user-facing copy must run.
 *
 * Deliberately not read from `_template`: the whole point is to cover apps the
 * template has never heard of, so the list is stated here rather than inferred
 * from one of the two populations it is meant to compare.
 */
/**
 * `needs` is a list of candidate paths, not one path.
 *
 * The first version of this file hardcoded `src/monetization/adPolicy.ts` and
 * so reported gridlock-pop as "no ads, nothing to gate" — it keeps its policy
 * in `src/services/adPolicy.ts` and ships interstitials. A coverage checker
 * that decides an app is out of scope by guessing one layout reproduces the
 * exact bug it was written to catch, one level up.
 */
const GATES = [
  {
    script: 'check-paywall-copy.mjs',
    // The highest-stakes one: it guards a claim the buyer pays for. It caught
    // rectap selling "every level, every mode and the full archive" on a
    // screen recorder, in fourteen locales.
    // An app can have a paywall and no i18n file — gridhabit hardcodes its
    // claims in app/paywall.tsx. The gate reads either, matching on keys where
    // the copy is keyed and on the sentences where it is not, so both count as
    // a subject it can actually check.
    needs: ['src/i18n/index.ts', 'app/paywall.tsx', 'src/screens/PaywallScreen.tsx'],
  },
  {
    script: 'check-locale-scripts.mjs',
    needs: ['src/i18n/index.ts'],
  },
  {
    script: 'check-ad-wiring.mjs',
    // Applies to any app that ships ads, whether or not it has i18n.
    needs: ['src/monetization/adPolicy.ts', 'src/services/adPolicy.ts'],
  },
];

/** Every directory that looks like an app, template and shared dirs excluded. */
function apps() {
  return readdirSync(PORTFOLIO)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_'))
    .filter((name) => {
      const dir = join(PORTFOLIO, name);
      return statSync(dir).isDirectory() && existsSync(join(dir, 'package.json'));
    })
    .sort();
}

/**
 * Everywhere a gate could plausibly be invoked from.
 *
 * Both are read as plain text rather than parsed: a gate named anywhere in an
 * npm script or in verify-all.sh is running, and the shapes these take vary
 * enough between the template apps and the older ones that matching text is
 * both sufficient and harder to fool than guessing at structure.
 */
function entryPoints(dir) {
  const sources = [];
  const pkg = join(dir, 'package.json');
  if (existsSync(pkg)) {
    try {
      const scripts = JSON.parse(readFileSync(pkg, 'utf8')).scripts ?? {};
      sources.push(Object.values(scripts).join('\n'));
    } catch {
      // A package.json that will not parse is a bigger problem than coverage,
      // and something else already fails on it. Treat it as wiring nothing.
    }
  }
  for (const rel of ['scripts/verify-all.sh', 'scripts/verify.sh']) {
    const file = join(dir, rel);
    if (existsSync(file)) sources.push(readFileSync(file, 'utf8'));
  }
  return sources.join('\n');
}

const rows = [];
for (const name of apps()) {
  const dir = join(PORTFOLIO, name);
  const wiring = entryPoints(dir);
  for (const gate of GATES) {
    const subject = gate.needs.some((rel) => existsSync(join(dir, rel)));

    if (!subject) {
      // The gate cannot read this app — but that only means "out of scope" if
      // the app does not have the thing at all. An app that has a paywall the
      // gate cannot parse is uncovered, not exempt, and saying "n/a" there is
      // how fourteen apps went ungated while a tool reported clean.
      const hasItAnyway = (gate.alsoAppliesIf ?? []).some((rel) =>
        existsSync(join(dir, rel)),
      );
      rows.push({
        app: name,
        gate: gate.script,
        state: hasItAnyway ? 'UNREADABLE BY THIS GATE' : 'n/a',
      });
      continue;
    }

    const present = existsSync(join(dir, 'scripts', gate.script));
    const wired = wiring.includes(gate.script);
    rows.push({
      app: name,
      gate: gate.script,
      state: wired ? 'wired' : present ? 'PRESENT BUT NEVER RUN' : 'MISSING',
    });
  }
}

/*
 * A second pass, which exists because the first one missed nine apps.
 *
 * GATES above is a stated list, and the comment defending that is right about
 * why: the point is to cover apps `_template` has never heard of, so the list
 * cannot be inferred from the template. But a stated list answers only "is each
 * gate I know about wired?", and says nothing about a gate nobody told it about.
 *
 * It has not caught anything yet, and the honest history matters more than the
 * pass would: this was written after I concluded `check-tsconfig.mjs` ran in
 * nothing, having grepped `package.json` and not `scripts/verify-all.sh`, which
 * is where all thirty apps invoke it from. The gate was wired the whole time
 * and this file was right to stay quiet. The pass survives because the blind
 * spot it closes is real even though the instance that prompted it was not.
 * Presence is treated as a claim. If somebody put `scripts/check-*.mjs` in an
 * app, they meant it to run; a gate nothing invokes is a gap no matter whose
 * list it is on. No `needs` is required here, because the file's
 * existence in that app is the applicability signal.
 */
for (const name of apps()) {
  const dir = join(PORTFOLIO, name);
  const scripts = join(dir, 'scripts');
  if (!existsSync(scripts)) continue;
  const wiring = entryPoints(dir);
  const known = new Set(GATES.map((g) => g.script));
  for (const file of readdirSync(scripts)) {
    if (!/^check-.*\.mjs$/.test(file) || known.has(file)) continue;
    // check-drift and check-gate-coverage are portfolio-wide tools that are
    // deliberately run from _shared, not from inside an app.
    if (file === 'check-drift.mjs' || file === 'check-gate-coverage.mjs') continue;
    if (!wiring.includes(file)) {
      rows.push({ app: name, gate: file, state: 'PRESENT BUT NEVER RUN' });
    }
  }
}

const gaps = rows.filter((r) => r.state !== 'wired' && r.state !== 'n/a');

if (gaps.length === 0) {
  const covered = new Set(rows.filter((r) => r.state === 'wired').map((r) => r.app));
  console.log(
    `check-gate-coverage: ${GATES.length} gate(s) across ${apps().length} app(s) — ` +
      `every applicable gate is wired (${covered.size} app(s) run at least one).`,
  );
  process.exit(0);
}

console.log(`check-gate-coverage: ${gaps.length} gap(s)\n`);
for (const gap of gaps) {
  console.log(`  ${gap.app.padEnd(16)} ${gap.gate.padEnd(26)} ${gap.state}`);
}
console.log(
  '\nPRESENT BUT NEVER RUN is the worse of the two: the script is sitting in\n' +
    "scripts/ and executes in nothing, so the app reads as covered and isn't.\n" +
    'Wire it into check:release, or into verify-all.sh where the app has one.\n' +
    '\nNote that a clean check-drift does not imply this is clean. Drift only\n' +
    'knows apps generated from _template; the older apps are invisible to it.',
);

process.exit(listOnly ? 0 : 1);
