# Next 12 apps — pipeline status

Updated 2026-09-15. One app is built at a time; `node_modules` is installed only
for the app currently in flight (twelve Expo trees at once is ~15 GB).

Legend: ✅ done · 🔨 in progress · ⬜ not started

| # | App | Repo | Scaffold | Logic | UI | RevenueCat | AdMob | ASC | Play | iOS QA | Android QA |
|---|-----|------|----------|-------|----|-----------|-------|-----|------|--------|-----------|
| 1 | Loopwits | AltixCode/loopwits | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | PourSort | AltixCode/poursort | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Foldup | AltixCode/foldup | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Knotter | AltixCode/knotter | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Wordflock | AltixCode/wordflock | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | MineStreak | AltixCode/minestreak | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | Toppl | AltixCode/toppl | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | Solari | AltixCode/solari | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | Poplet | AltixCode/poplet | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | Quandary | AltixCode/quandary | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | Flipnest | AltixCode/flipnest | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | Quiktap | AltixCode/quiktap | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

## What "scaffold ✅" already includes

Not an empty `create-expo-app`. Each repo ships, working and tested:

- expo-router shell (`index`, `settings`, `paywall`) with a Stack that themes
  its own headers.
- A palette in light and dark whose every text/background pair is asserted
  against WCAG AA by a unit test — a bad accent fails CI, it does not ship.
- RevenueCat behind one `pro` entitlement, with the offline-cache rule that
  stops a paying user being shown an ad on a cold start.
- AdMob banner, preloaded interstitial with pure pacing rules, and rewarded,
  all gated on UMP consent and iOS ATT, all failing closed.
- `npm run check:release`, which refuses a production build still carrying
  Google's test ad units — the failure mode that looks perfectly healthy and
  earns nothing.
- 166 tests, lint and typecheck green, CI on every push.

## Order of work

Build order follows PLAN.md then PLAN_2.md. Apps 2–4 (PourSort, Foldup,
Knotter) share a generate-by-reversal + BFS-solver core, so #3 and #4 get
substantially cheaper once #2 exists.
