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
import {
  readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync,
  symlinkSync, unlinkSync, chmodSync,
} from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const TEMPLATE = join(ROOT, '_template');
const DEST_ROOT = resolve(ROOT, '..');

// Everything below runs only when this file is the entry point. `regen-file.mjs` imports
// `tokensFor` from here, and without this guard that import would ALSO bootstrap every app
// named in regen-file's own argv — a script that copies one file would quietly scaffold
// eighteen.
const isEntryPoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

/** Every `__TOKEN__` the template may contain, resolved for one app. */
export function tokensFor(app) {
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
    // Vector mark, or `null` for an app that still uses the legacy 5x5 grid.
    ICON: JSON.stringify(app.icon ?? null),
    // Android permissions beyond the shared four, for the rare app that earns one.
    //
    // This is deliberately opt-in per app rather than a template default: Play reviews
    // sensitive permissions against what the app actually does, so a permission granted to
    // every app in the portfolio "just in case" is a rejection waiting to happen. Multitick
    // declares USE_EXACT_ALARM because it is a timer; nothing else may copy it.
    EXTRA_ANDROID_PERMISSIONS: (app.androidPermissions ?? [])
      .map((p) => `\n      '${p}',`)
      .join(''),
  };
}

if (isEntryPoint) {
  const apps = JSON.parse(readFileSync(join(ROOT, 'apps.json'), 'utf8'));
  const selected = only.length ? apps.filter((a) => only.includes(a.slug)) : apps;

  if (selected.length === 0) {
    console.error(`No app matched ${only.join(', ')}. Known: ${apps.map((a) => a.slug).join(', ')}`);
    process.exit(1);
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

    // Every repo mirrors the portfolio manifest for the other engines.
    for (const mirror of ['CLAUDE.md', 'GEMINI.md']) {
      const link = join(dest, mirror);
      try {
        unlinkSync(link);
      } catch {
        // Nothing there yet — the common case on a first run.
      }
      symlinkSync('AGENTS.md', link);
    }
    // Shell scripts lose their mode through the copy.
    for (const script of ['verify-all.sh', 'verify-app.sh']) {
      const file = join(dest, 'scripts', script);
      if (existsSync(file)) chmodSync(file, 0o755);
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
}
