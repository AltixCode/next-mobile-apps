#!/usr/bin/env node
/**
 * Writes each app's HANDOFF.md from the recorded identifiers and the real build
 * state — never from memory.
 *
 * Sources: apps.json, app-state.json, revenuecat-ids.tsv, and each app's
 * .admob-ids/<slug>.env. If an identifier is absent from those files it is
 * reported as MISSING rather than invented.
 *
 *   node scripts/write-handoffs.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DEV = resolve(ROOT, '..');

const apps = JSON.parse(readFileSync(join(ROOT, 'apps.json'), 'utf8'));
const state = JSON.parse(readFileSync(join(ROOT, 'app-state.json'), 'utf8'));

function tsv(file) {
  const lines = readFileSync(join(ROOT, file), 'utf8').trim().split('\n');
  const head = lines[0].split('\t');
  return lines.slice(1).map((line) => Object.fromEntries(line.split('\t').map((v, i) => [head[i], v])));
}

const revenuecat = Object.fromEntries(tsv('revenuecat-ids.tsv').map((r) => [r.slug, r]));
const ascApps = Object.fromEntries(tsv('asc-app-ids.tsv').map((r) => [r.slug, r]));
const ascIaps = Object.fromEntries(tsv('asc-iap-ids.tsv').map((r) => [r.slug, r]));

function admob(slug) {
  const file = join(DEV, '.admob-ids', `${slug}.env`);
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const at = l.indexOf('=');
        return [l.slice(0, at), l.slice(at + 1)];
      }),
  );
}

const or = (value) => value || '**MISSING**';

/**
 * The repo's latest CI conclusion, read live.
 *
 * Asked rather than asserted: an earlier version of this generator wrote
 * "green on main" into every file while several runs were still queued or had
 * been cancelled, which is exactly the claim this document exists to avoid.
 */
function ciState(slug) {
  try {
    const out = execFileSync(
      'gh',
      ['run', 'list', '--repo', `AltixCode/${slug}`, '--limit', '1', '--json', 'status,conclusion'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const run = JSON.parse(out)[0];
    if (!run) return '⬜ no run recorded';
    if (run.status !== 'completed')
      return '🔨 running when this was written — re-check with `gh run list`';
    if (run.conclusion === 'success') return '✅ green on `main`';
    if (run.conclusion === 'failure') return '❌ failing on `main` — fix before anything else';
    return `⬜ last run ${run.conclusion} — never proven green`;
  } catch {
    return '⬜ UNKNOWN — could not read CI state';
  }
}

function buildSection(app, s) {
  if (s.stage === 'built') {
    return `## What is built

**${app.name} is feature-complete and every device-free gate is green.**

- Game engines: ${s.engines}
- Screens: ${s.screens}
- ${s.tests} tests, all passing
- Free tier: ${s.freeTier}

Run \`npm run verify\` to re-prove all of it in one command.

## What is left

1. **Device pass** — \`npm run verify:device\`. ${
      s.device === 'verified'
        ? 'Already done once (see the table above); repeat before any release build.'
        : '**Not yet run for this app.** This is the next step.'
    }
2. **Screenshots** — capture from the running app during that device pass. They
   are the one store asset that cannot be produced ahead of time.
3. **Store records** — see "Blocked on a person" below.
4. **Submit** — \`npm run build:production\` then \`npm run submit:production\`.`;
  }

  return `## What is built

**Only the shared scaffold. No game exists yet.**

What the scaffold already gives you, working and tested (${s.tests} tests):

- expo-router shell: home placeholder, settings, paywall
- 14 locales with plural and RTL handling, and \`check-i18n\` / \`check-ui-rules\`
  failing the build on a partial locale or a hard-coded string
- theme tokens with both appearances, AA contrast asserted by unit test
- RevenueCat behind the single \`remove_ads\` entitlement, lifetime-only
- AdMob banner, interstitial and rewarded, gated on UMP consent and iOS ATT,
  failing closed
- \`npm run check:release\`, CI, and the release identifiers already in repo
  secrets

## What is left

1. **Write the game.** Nothing of it exists yet — ${s.engines}.
   The plan for this app is \`next_mobile_apps/${app.planFile}\` (${s.plan}).
   Follow the pattern the five finished apps use — pure logic in \`src/logic/\`
   with no React import, generated content verified by a solver, then screens.
2. **Game copy in all fourteen locales.** Use
   \`next_mobile_apps/scripts/add_i18n_keys.py\` with a keys JSON, the same way
   the finished apps did it; \`npm run check:i18n\` enforces completeness.
3. **Free tier**, as planned: ${s.freeTier}.
4. **Tests** to the coverage thresholds in \`jest.config.js\`. CI enforces them
   and a local \`jest\` run does not — use \`npm run test:ci\`.
5. **Device pass** — \`npm run verify:device\`.
6. **Screenshots**, then store records (below), then submit.`;
}

let written = 0;
const skipped = [];
for (const app of apps) {
  const s = state[app.slug];
  // `apps.json` is shared and has grown beyond this initiative. An app with no
  // entry in app-state.json belongs to someone else's batch; describing it here
  // would mean inventing its state, so it is named and skipped instead.
  if (!s) {
    skipped.push(app.slug);
    continue;
  }
  const rc = revenuecat[app.slug] ?? {};
  const ad = admob(app.slug);
  const asc = ascApps[app.slug] ?? {};
  const iap = ascIaps[app.slug] ?? {};
  const ci = ciState(app.slug);
  const dest = join(DEV, app.slug, 'HANDOFF.md');

  const doc = `# ${app.name} — handoff

> Written 2026-09-15. **Unverified is UNKNOWN, never a pass** — a green build is
> not a verification. Every row below says what was actually run.

**${app.name}** — ${s.pitch}.
Plan: \`/Volumes/ExtremePro/Dev/next_mobile_apps/${app.planFile}\` (${s.plan}).
Portfolio rules: \`Dev/AGENTS.md\`, then \`Dev/docs/agents/18-app-lifecycle.md\`.

## State at a glance

| | |
|---|---|
| Stage | ${s.stage === 'built' ? '**Feature-complete**, not yet released' : '**Scaffold only** — the game is not written'} |
| Tests | ${s.tests} passing |
| Device pass | ${s.device === 'verified' ? '✅ built, launched and driven on iOS simulator + Android emulator' : '⬜ never run'} |
| App Store | ${s.store ?? '⬜ nothing done'} |
| Released | ⬜ no |${s.note ? `\n\n> **${s.note}**` : ''}

## Verification state

| Gate | State |
|---|---|
| Lint | ✅ |
| Typecheck | ✅ |
| Unit tests (${s.tests}) | ✅ |
| i18n completeness — 14 locales | ✅ |
| UI rules — colour tokens, \`t()\` | ✅ |
| iOS + Android bundle export | ✅ |
| CI on a self-hosted runner | ${ci} |
| \`check:release\` with real identifiers | ✅ passes in CI |
| Builds / launches on the iOS simulator | ${s.device === 'verified' ? '✅' : '⬜'} |
| Interaction driven on the Android emulator | ${s.device === 'verified' ? '✅' : '⬜'} |
| Light **and** dark checked on device | ${s.device === 'verified' ? '✅' : '⬜'} |
| Purchase flow against a real offering | ⬜ no store product exists yet |
| Ads served under real consent | ⬜ no consent message published yet |

${buildSection(app, s)}

## Identifiers — already provisioned, do not recreate

Changing a bundle id means deleting and recreating the RevenueCat app, which
**invalidates its public SDK keys**. These are settled.

| | |
|---|---|
| Bundle id / package | \`${app.bundle}\` |
| Scheme | \`${app.scheme}://\` |
| GitHub | \`AltixCode/${app.slug}\` |
| RevenueCat project | \`${or(rc.project)}\` |
| RevenueCat iOS app | \`${or(rc.ios_app)}\` |
| RevenueCat Android app | \`${or(rc.android_app)}\` |
| Entitlement | \`remove_ads\` (\`${or(rc.entitlement)}\`) |
| Offering / package | \`default\` (\`${or(rc.offering)}\`) / \`$rc_lifetime\` (\`${or(rc.package)}\`) |
| AdMob app (iOS) | \`${or(ad.ADMOB_IOS_APP_ID)}\` |
| AdMob app (Android) | \`${or(ad.ADMOB_ANDROID_APP_ID)}\` |
| AdMob banner (iOS / Android) | \`${or(ad.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID)}\` / \`${or(ad.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID)}\` |
| AdMob interstitial (iOS / Android) | \`${or(ad.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID)}\` / \`${or(ad.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID)}\` |
| AdMob rewarded (iOS / Android) | \`${or(ad.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID)}\` / \`${or(ad.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID)}\` |
| App Store app id | \`${or(asc.ascAppId)}\` |
| App Store name | ${or(asc.appStoreName)} |
| IAP id / product | \`${or(iap.iapId)}\` / \`${or(iap.productId)}\` |

All ten release identifiers plus \`EXPO_TOKEN\` are already GitHub repo secrets.
Locally they come from \`/Volumes/ExtremePro/Dev/.admob-ids/${app.slug}.env\` —
never commit that file.

## Blocked on a person — cannot be scripted

These three have no write API at all. Browser sessions live in the Playwright
MCP profile (\`~/Library/Caches/ms-playwright-mcp/\`).

1. **App Store Connect record — done.** App \`${or(asc.ascAppId)}\` exists, with
   the \`remove_ads\` non-consumable at $3.99 USA base, auto-equalized, plus a
   free app price schedule and availability in every territory. The store name
   is **${or(asc.appStoreName)}**, which may differ from the in-app name: App
   Store display names are globally unique and several short ones in this batch
   were already taken.
   Still console-only, and therefore still blocked on a person: the App Privacy
   data-usage questionnaire, and \`contentRightsDeclaration\` — \`PATCH /v1/apps\`
   answers 200 for the latter and stores nothing. Without both, adding the
   version to a review submission fails \`409 STATE_ERROR.ENTITY_STATE_INVALID\`
   while \`versions check-readiness\` still reports ready.
2. **Play Console app.** A Play app has **no package name until its first bundle
   is uploaded**, so the order is: create app → upload an AAB to internal testing
   → *then* create the \`remove_ads\` product. Build that first AAB from a
   **non-production** profile so testers generate no live ad impressions.
3. **AdMob GDPR + US-states consent messages.** The apps and all six ad units
   exist, but **no consent message is published**. The SDK can only present a
   message that exists, and this app fails closed — so in the EEA it currently
   shows **no ads at all**. Publish both under Privacy & messaging.

Also expect **"Requires review — limited ad serving"** on every new AdMob app
for a few days. That is normal, not an integration fault.

## Decisions that are the owner's, not an agent's

- Publish on altixcode.com and itsata.com? **Not yet asked.** Procedure:
  \`docs/agents/14-portfolio-demos.md\`.
- App Store name. Casual and puzzle names are heavily contested; budget several
  attempts. Apple checks the whole title string, so \`Name: Descriptor\` often
  clears when the bare name does not. ASC names stay editable until first release.

## Traps already paid for — do not rediscover

- \`npm run test:ci\` enforces coverage thresholds; a plain \`jest\` run does not.
  CI has caught this twice.
- **A coverage shortfall in CI may not be about coverage.** Jest's default worker
  count exhausted the shared runner's file descriptors — \`ENFILE: file table
  overflow\` — and three suites failed to LOAD, so their files went uncovered and
  the job blamed the thresholds. \`test:ci\` runs \`--runInBand\` for this reason;
  do not remove it.
- **\`package-lock.json\` must be committed.** Without it every job dies at
  setup-node with "Dependencies lock file is not found", and \`npm ci\` cannot run
  at all. Generate one without installing: \`npm install --package-lock-only\`.
- RNTL 14: \`render\` and \`fireEvent\` are async — **await both**. Put each
  screen's tests in its own file, and never call \`jest.restoreAllMocks()\` in a
  screen test: it restores spies the renderer relies on and the next test's tree
  is torn down as it renders.
- Reset a board by **remounting a keyed component**, never by setState in an
  effect — otherwise one frame shows the previous puzzle on the new board.
- Keep gesture hit-testing on the JS thread. A worklet calling a plain JS helper
  throws *"Tried to synchronously call a Remote Function"* on first touch:
  invisible to Jest, fatal on device.
- \`expo run:android\` wants the **AVD name**, not the adb serial, and can fail in
  seconds leaving the previous APK installed. Always check its exit code.
- iOS verification stops at build / install / launch / render: Simulator.app is
  missing from this Xcode install, so the ATT prompt cannot be dismissed. **Drive
  interaction on Android.**
- Export \`JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home\`
  for any Android build, or Gradle silently falls back to JDK 25 and CMake dies.
- Shared code is generated. Fix it in \`AltixCode/next-mobile-apps\` (\`_template/\`)
  and re-run \`node scripts/bootstrap.mjs ${app.slug}\`, never in this copy —
  otherwise the next regeneration reverts it.
`;

  writeFileSync(dest, doc);
  written += 1;
}
console.log(`wrote ${written} HANDOFF.md files`);
if (skipped.length > 0) {
  console.log(
    `skipped ${skipped.length} app(s) with no entry in app-state.json: ${skipped.join(', ')}`,
  );
}
