#!/usr/bin/env node
/**
 * Re-renders ONE template file into one or more apps, overwriting the copy.
 *
 * `bootstrap.mjs --force` overwrites everything, which would clobber an app's own work. This
 * exists for the case the rules actually require: a fix made in `_template/` that has to reach
 * the copies already generated from it.
 *
 *   node scripts/regen-file.mjs scripts/verify-app.sh            # every app in apps.json
 *   node scripts/regen-file.mjs scripts/verify-app.sh convertwise
 */
import { readFileSync, writeFileSync, existsSync, chmodSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DEST_ROOT = resolve(ROOT, '..');
const [relPath, ...only] = process.argv.slice(2);
if (!relPath) {
  console.error('Usage: regen-file.mjs <path-within-template> [slug...]');
  process.exit(1);
}

const source = join(ROOT, '_template', relPath);
const text = readFileSync(source, 'utf8');
const mode = statSync(source).mode;
const apps = JSON.parse(readFileSync(join(ROOT, 'apps.json'), 'utf8'));
const selected = only.length ? apps.filter((a) => only.includes(a.slug)) : apps;

const tokensFor = (app) => ({
  NAME: app.name, SLUG: app.slug, SCHEME: app.scheme, BUNDLE: app.bundle,
  TAGLINE: app.tagline, PLAN_FILE: app.planFile, ACCENT: app.accent,
  ACCENT_LIGHT: app.accentLight, BG: app.bg, SURFACE: app.surface,
  SURFACE_ALT: app.surfaceAlt, BENEFITS: JSON.stringify(app.benefits),
  MARK: JSON.stringify(app.mark),
});

let written = 0;
for (const app of selected) {
  const target = join(DEST_ROOT, app.slug, relPath);
  if (!existsSync(dirname(target))) continue; // app not checked out here
  const tokens = tokensFor(app);
  writeFileSync(
    target,
    text.replace(/\{\{([A-Z_]+)\}\}/g, (_m, name) => {
      if (!(name in tokens)) throw new Error(`Unknown token {{${name}}}`);
      return tokens[name];
    }),
  );
  chmodSync(target, mode);
  written += 1;
  console.log(`${app.slug.padEnd(14)} ${relPath}`);
}
console.log(`\n${written} file(s) re-rendered from _template/${relPath}.`);
