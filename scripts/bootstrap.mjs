#!/usr/bin/env node
/**
 * Bootstraps each app in `apps.json` from `_template/`.
 *
 * Every file in the template is copied with its `{{TOKEN}}` placeholders substituted from the
 * app's manifest entry. Existing files are never overwritten unless --force is passed, so this
 * is safe to re-run against a repo that is already being worked on: it only fills in gaps.
 *
 * Deliberately does NOT run `npm install` — twelve Expo dependency trees at once is roughly
 * 15 GB and will thrash a laptop. Dependencies are installed per app, when that app is built.
 *
 *   node scripts/bootstrap.mjs            # all apps
 *   node scripts/bootstrap.mjs loopwits   # one app
 *   node scripts/bootstrap.mjs --force    # overwrite existing files
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const TEMPLATE = join(ROOT, '_template');
const DEST_ROOT = resolve(ROOT, '..');

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

const apps = JSON.parse(readFileSync(join(ROOT, 'apps.json'), 'utf8'));
const selected = only.length ? apps.filter((a) => only.includes(a.slug)) : apps;

if (selected.length === 0) {
  console.error(`No app matched ${only.join(', ')}. Known: ${apps.map((a) => a.slug).join(', ')}`);
  process.exit(1);
}

/** Every `__TOKEN__` the template may contain, resolved for one app. */
function tokensFor(app) {
  return {
    NAME: app.name,
    SLUG: app.slug,
    SCHEME: app.scheme,
    BUNDLE: app.bundle,
    TAGLINE: app.tagline,
    PLAN_FILE: app.planFile,
    ACCENT: app.accent,
    ACCENT_LIGHT: app.accentLight,
    BG: app.bg,
    SURFACE: app.surface,
    SURFACE_ALT: app.surfaceAlt,
    BENEFITS: JSON.stringify(app.benefits),
    MARK: JSON.stringify(app.mark),
  };
}

function substitute(text, tokens) {
  // Braces rather than `__TOKEN__`: React Native's own `__DEV__` is a template token shape,
  // and substituting it would rewrite real source.
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (_match, name) => {
    if (!(name in tokens)) throw new Error(`Unknown template token {{${name}}}`);
    return tokens[name];
  });
}

/** Files that are not text and must be copied byte-for-byte. */
const BINARY = /\.(png|jpg|jpeg|ttf|otf|ico|keystore|p8|p12)$/i;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let created = 0;
let skipped = 0;

for (const app of selected) {
  const dest = join(DEST_ROOT, app.slug);
  const tokens = tokensFor(app);
  let appCreated = 0;
  let appSkipped = 0;

  for (const source of walk(TEMPLATE)) {
    const rel = relative(TEMPLATE, source);
    const target = join(dest, rel);
    if (existsSync(target) && !force) {
      appSkipped += 1;
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    if (BINARY.test(source)) {
      writeFileSync(target, readFileSync(source));
    } else {
      writeFileSync(target, substitute(readFileSync(source, 'utf8'), tokens));
    }
    appCreated += 1;
  }

  created += appCreated;
  skipped += appSkipped;
  console.log(
    `${app.name.padEnd(12)} ${String(appCreated).padStart(3)} written` +
      (appSkipped ? `, ${appSkipped} kept` : '') +
      `  ->  ${dest}`,
  );
}

console.log(`\n${selected.length} app(s): ${created} files written, ${skipped} left untouched.`);
console.log('Next: per app, `npm install` then `npm run assets` — one at a time.');
