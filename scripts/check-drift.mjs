#!/usr/bin/env node
/**
 * Reports every generated file that no longer matches what `_template` would render.
 *
 * This exists because of a bug that reached seventeen apps. A fix landed in `_template`
 * (the paywall's `offeringsResolved`, which stops it spinning forever when the store is
 * unreachable) and every app generated before it kept the broken copy. Nothing anywhere
 * compared the two, so three of those apps passed a full device pass still carrying it.
 * It surfaced by accident, on the one screen those passes happened not to open.
 *
 * Drift is not automatically wrong — an app may deliberately own a file. Say so in
 * `drift-allow.json` and this stops reporting it; anything not listed is a finding.
 *
 *   node scripts/check-drift.mjs              # every app, every template file
 *   node scripts/check-drift.mjs multitick    # one app
 *   node scripts/check-drift.mjs --fix        # re-render everything that drifted
 *
 * Exits non-zero when it finds unexplained drift, so CI can run it.
 */
import {
  readFileSync,
  existsSync,
  writeFileSync,
  readdirSync,
  statSync,
  chmodSync,
  mkdirSync,
} from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tokensFor } from './bootstrap.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const TEMPLATE = join(ROOT, '_template');
const DEST_ROOT = resolve(ROOT, '..');

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const only = args.filter((a) => !a.startsWith('--'));

/**
 * Files a generated app is expected to own outright.
 *
 * Kept as data rather than a hardcoded list so an app can claim a file without editing this
 * script — the point is that claiming one is a deliberate, visible act.
 */
const allowPath = join(ROOT, 'drift-allow.json');
const allow = existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')) : {};

/** Template files that are never rendered into an app. */
const SKIP = new Set(['node_modules', '.git', '.expo', 'ios', 'android', 'dist']);

function templateFiles(dir = TEMPLATE) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...templateFiles(full));
    else out.push(relative(TEMPLATE, full));
  }
  return out;
}

function render(text, tokens, relPath) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (_m, name) => {
    if (!(name in tokens)) throw new Error(`Unknown token {{${name}}} in _template/${relPath}`);
    return tokens[name];
  });
}

const apps = JSON.parse(readFileSync(join(ROOT, 'apps.json'), 'utf8'));
const selected = only.length ? apps.filter((a) => only.includes(a.slug)) : apps;
const files = templateFiles();

let drifted = 0;
let missing = 0;
let repaired = 0;
let created = 0;
const byFile = new Map();

for (const app of selected) {
  const appRoot = join(DEST_ROOT, app.slug);
  if (!existsSync(appRoot)) continue; // not checked out on this machine
  const tokens = tokensFor(app);
  // "*" holds files that are per-app in every app by design — the home screen, the
  // locale table, the handoff record. Listing them once beats repeating them thirty times.
  const allowed = new Set([...(allow['*'] ?? []), ...(allow[app.slug] ?? [])]);

  for (const relPath of files) {
    if (allowed.has(relPath)) continue;
    const target = join(appRoot, relPath);
    const source = join(TEMPLATE, relPath);
    const expected = render(readFileSync(source, 'utf8'), tokens, relPath);

    if (!existsSync(target)) {
      // A file the template gained after the app was generated. --fix must create it, not
      // skip it: verify-all.sh gained a step calling scripts/check-tsconfig.mjs, and an app
      // that has the caller but not the callee fails verify at a step that looks unrelated.
      missing += 1;
      byFile.set(relPath, [...(byFile.get(relPath) ?? []), `${app.slug} (absent)`]);
      if (fix) {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, expected);
        chmodSync(target, statSync(source).mode);
        created += 1;
      }
      continue;
    }
    if (readFileSync(target, 'utf8') === expected) continue;

    drifted += 1;
    byFile.set(relPath, [...(byFile.get(relPath) ?? []), app.slug]);
    if (fix) {
      writeFileSync(target, expected);
      chmodSync(target, statSync(source).mode);
      repaired += 1;
    }
  }
}

if (byFile.size === 0) {
  console.log(`check-drift: ${selected.length} app(s) × ${files.length} template files — no drift`);
  process.exit(0);
}

// Grouped by file rather than by app: one template fix that failed to reach its copies shows
// up as one line naming every app that missed it, which is the shape the problem actually has.
console.log(`check-drift: ${byFile.size} template file(s) differ from their generated copies\n`);
for (const [relPath, slugs] of [...byFile].sort()) {
  console.log(`  _template/${relPath}`);
  console.log(`      ${slugs.join(', ')}`);
}
console.log(
  `\n${drifted} drifted, ${missing} absent.` +
    (fix
      ? ` ${repaired} re-rendered, ${created} created.`
      : `\nRe-render with:  node scripts/check-drift.mjs --fix` +
        `\nOr, if an app is meant to own a file, add it to drift-allow.json.`),
);
process.exit(fix && drifted === repaired && missing === created ? 0 : 1);
