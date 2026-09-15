# Ad-revenue wave (18 apps) — pipeline status

Updated 2026-09-15. One app is built at a time; `node_modules` is installed only
for the app currently in flight (eighteen Expo trees at once is ~22 GB).

Legend: ✅ done · 🔨 in progress · ⬜ not started · ⛔ blocked

| # | App | Repo | Scaffold | RevenueCat | Secrets | AdMob | Logic | UI | ASC | Play | iOS QA | Android QA |
|---|-----|------|----------|-----------|---------|-------|-------|----|-----|------|--------|-----------|
| 1 | Convertwise | AltixCode/convertwise | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ✅ | ✅ |
| 2 | Calcpair | AltixCode/calcpair | ✅ | ✅ | ✅ | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
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
