# Next 12 apps — pipeline status

Updated 2026-09-15. **Each repo carries its own `HANDOFF.md`** with that app's
identifiers, exactly what is left, and the manual steps. This file is the
overview; the handoff is the instruction.

One app is built at a time. Only the apps being worked on have `node_modules`
installed — twelve Expo trees at once is roughly 15 GB.

Legend: ✅ done · ⬜ not started

| # | App | Game | Tests | Device pass | ASC | Play | AdMob msg |
|---|-----|------|-------|-------------|-----|------|-----------|
| 1 | Loopwits | ✅ | 391 | ✅ both platforms | ⬜ | ⬜ | ⬜ |
| 2 | PourSort | ✅ | 298 | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Foldup | ✅ | 295 | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Knotter | ✅ | 305 | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | MineStreak | ✅ | 289 | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Wordflock | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Toppl | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Solari | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Poplet | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Quandary | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Flipnest | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | Quiktap | ⬜ | 186 | ⬜ | ⬜ | ⬜ | ⬜ |

"Game ⬜" means the shared scaffold is in place and green, but no game logic
exists yet. The 186 tests are the scaffold's own.

## Already provisioned for all twelve

| | |
|---|---|
| GitHub repos | `AltixCode/<slug>`, CI on the self-hosted ARM64 runners |
| Bundle ids | `com.altixcode.<slug>`, registered in App Store Connect |
| RevenueCat | project + iOS/Android apps + `remove_ads` + `default` + `$rc_lifetime` |
| AdMob | 24 apps, 72 ad units (banner / interstitial / rewarded per platform) |
| Repo secrets | all 10 release identifiers plus `EXPO_TOKEN`, in every repo |

Written records: `admob-ids.tsv`, `admob-adunits.tsv`, `revenuecat-ids.tsv`,
`app-state.json`, and `/Volumes/ExtremePro/Dev/.admob-ids/<slug>.env`.

Regenerate every handoff after changing `app-state.json`:
`node scripts/write-handoffs.mjs` — it reads the identifier files and the live
CI state rather than repeating anything from memory.

## Blocked on a person — the same three for every app

1. **App Store Connect sign-in.** The session expired on 2026-09-15. This blocks
   all twelve store records, and the records block the in-app purchases.
2. **Play Console apps.** A Play app has no package name until its first bundle
   is uploaded, so: create app → upload an AAB to internal testing → then create
   the product. Build that AAB from a non-production profile.
3. **AdMob GDPR + US-states consent messages.** The apps and units exist but no
   message is published. The SDK can only present a message that exists and
   these apps fail closed, so in the EEA they currently serve **no ads at all**.

## Build order

`PLAN.md` then `PLAN_2.md`. Apps 2–4 share a generate-and-verify core, so each
is cheaper than the last. The five finished apps are the reference for the
remaining seven — same structure, same gates, same monetisation shape.
