# Ad-revenue wave (18 apps) — pipeline status

Updated 2026-09-15. One app is built at a time; `node_modules` is installed only
for the app currently in flight (eighteen Expo trees at once is ~22 GB).

Legend: ✅ done · 🔨 in progress · ⬜ not started · ⛔ blocked

| # | App | Repo | Scaffold | RevenueCat | Secrets | AdMob | Logic | UI | ASC | Play | iOS QA | Android QA |
|---|-----|------|----------|-----------|---------|-------|-------|----|-----|------|--------|-----------|
| 1 | Convertwise | AltixCode/convertwise | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ |
| 2 | Calcpair | AltixCode/calcpair | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | 🔨 | 🔨 |
| 3 | Splitjar | AltixCode/splitjar | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Spinwit | AltixCode/spinwit | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Multitick | AltixCode/multitick | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Dicewit | AltixCode/dicewit | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Mergewit | AltixCode/mergewit | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Memoflip | AltixCode/memoflip | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Sudokly | AltixCode/sudokly | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Klondo | AltixCode/klondo | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Tapforge | AltixCode/tapforge | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | Ratherly | AltixCode/ratherly | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 13 | Quizburst | AltixCode/quizburst | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 14 | Namewell | AltixCode/namewell | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 15 | Trilite | AltixCode/trilite | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 16 | Ringaway | AltixCode/ringaway | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 17 | Scanlit | AltixCode/scanlit | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 18 | Rectap | AltixCode/rectap | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## Build order, and why

1. **Convertwise, Calcpair, Splitjar** — pure input→result utilities. They prove
   the shared ad, paywall and release pipeline end to end with almost no logic
   risk, which is exactly what the source brief recommends front-loading.
2. **Spinwit, Multitick, Dicewit** — the same shell plus one animation and one
   background/notification concern each.
3. **Mergewit, Memoflip, Sudokly, Klondo, Tapforge** — the games. Grid and
   gesture patterns established in Mergewit are reused by the rest.
4. **Ratherly, Quizburst, Namewell** — content-bottlenecked, not code-
   bottlenecked; they wait until there is bandwidth to curate the banks.
5. **Trilite, Ringaway, Scanlit** — camera, torch, sensors and notifications,
   which need a dev build rather than Expo Go.
6. **Rectap last** — screen recording needs a native module and a config plugin,
   so it is scheduled after the EAS pipeline is proven, per the brief.

## Blocked

- **AdMob (⛔ on every row).** AdMob has no public write API at all; apps, ad
  units and consent messages must be created in the browser. The Playwright MCP
  browser profile was held by another session at provisioning time. Until the
  36 apps and 108 ad units exist, `npm run check:release` fails by design and no
  production build can be made. Development and QA are unaffected — the app
  falls back to Google's test units.
- A stray RevenueCat project **`ZZTest Delete Me` (`proj96c00466`)** was created
  while probing which credential could write. `rc` has no project-delete
  command, so it needs removing in the dashboard.

## Identifier records

`ads-bundle-ids.tsv`, `ads-revenuecat-ids.tsv`. The RevenueCat public SDK keys
are not recorded in the repo — they are set directly as GitHub Actions secrets
(`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`) on each app's repository.

## Device verification on this machine

`npm run verify:device` now works end to end. Four defects had to be fixed in
the shared script first, each of which made the gate lie rather than fail:

- It hung forever after a **successful** Android build, because
  `expo run:android` without `--no-bundler` starts Metro in the foreground and
  never returns. The build had worked, the app had launched and logged
  `[ads] consent`, and the script sat there.
- `-d` takes the AVD **name**, not the adb serial. `emulator-5554` fails with
  "Could not find device with name", which reads like the emulator never booted.
- The UIScene death check searched the device log for a string and matched its
  own search: `log show` logs its invocation with arguments, so the predicate
  text is always in the output. It fired on every healthy app.
- `expo run:ios` exits non-zero on this machine even when the build, signing
  and install all succeeded, because Simulator.app is missing from this Xcode
  and its last step is to open it. Success is now judged by whether the app is
  installed.

### Tapping iOS at last

Simulator.app being absent meant there was no way to tap anything on iOS, so
every interactive check in this portfolio has been driven on Android and the
ATT prompt had never been exercised. `scripts/idb-tap.sh` fixes that with idb,
tapping by accessibility label rather than coordinate — points differ between a
phone and a 13" iPad, so a coordinate script needs rewriting per device and a
label script does not.

Two things to know: an undismissed ATT prompt is owned by SpringBoard and
survives app termination, so it sits on top of every later screenshot and looks
like the app re-requesting — `simctl shutdown` then `boot` clears it. And
simulator screenshots carry an alpha channel, which App Store Connect accepts
and then silently leaves in FAILED with `IMAGE_ALPHA_NOT_ALLOWED`; flatten
before uploading and verify `assetState` is COMPLETE by listing the set back.

## Driving the AdMob console

AdMob has no public write API, so everything here is the signed-in console
driven from a browser. Four things cost hours between the two sessions:

- **`element.click()` does nothing useful on its Material components.** A DOM
  click appears to succeed and the dialog just closes. `page.mouse.click()` at
  the element's bounding-box centre works. This is the one that looks like a
  broken UI and is actually a click that never landed.
- **A virtualised table's "nothing left on screen" is not "nothing left".**
  Re-sweep from the top until a full-range pass reads zero missing; a single
  pass over 89 rows left two behind.
- **The accessibility snapshot cannot see inside the messaging iframe**, which
  makes the builder look unreachable. `page.frames().find(f =>
  f.url().includes('display-ads-user-messaging-embed'))` gives a real frame
  with working locators.
- **Publish can sit `aria-disabled` with no explanation.** The cause was
  *User choices → Do not consent* being unset, not the privacy policy URLs
  everything else complains about. It is a per-country dialog with a master
  toggle in the header row.

The privacy policy URL is **client-side state, not an RPC** — typing one fires
no network request and it is committed at Publish with everything else. There
is nothing to capture and replay.

*Worked out by dev-7b; recorded here so the next person does not re-derive it.*
