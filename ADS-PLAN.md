# Ad-revenue app portfolio — plans for the 18 utilities and games

> Wave 2, scaffolded 2026-09-15 from `_template/`. The source brief is
> `/Volumes/ExtremePro/Dev/ad-revenue-apps-implementation-guide.md`; this file
> adds the settled names, identifiers and palettes.

## Name and identifier map

| Guide # | Concept | Name | Repo | Bundle id | Scheme |
| --- | --- | --- | --- | --- | --- |
| 1 | QR & barcode scanner + generator | Scanlit | `AltixCode/scanlit` | `com.altixcode.scanlit` | `scanlit://` |
| 2 | Unit & currency converter | Convertwise | `AltixCode/convertwise` | `com.altixcode.convertwise` | `convertwise://` |
| 3 | Tip & bill splitter | Splitjar | `AltixCode/splitjar` | `com.altixcode.splitjar` | `splitjar://` |
| 4 | Decision wheel / random picker | Spinwit | `AltixCode/spinwit` | `com.altixcode.spinwit` | `spinwit://` |
| 5 | Flashlight + magnifier + level | Trilite | `AltixCode/trilite` | `com.altixcode.trilite` | `trilite://` |
| 6 | Screen recorder | Rectap | `AltixCode/rectap` | `com.altixcode.rectap` | `rectap://` |
| 7 | Multi-timer | Multitick | `AltixCode/multitick` | `com.altixcode.multitick` | `multitick://` |
| 8 | Fake call simulator | Ringaway | `AltixCode/ringaway` | `com.altixcode.ringaway` | `ringaway://` |
| 9 | Baby name explorer | Namewell | `AltixCode/namewell` | `com.altixcode.namewell` | `namewell://` |
| 10 | BMI + GPA calculators | Calcpair | `AltixCode/calcpair` | `com.altixcode.calcpair` | `calcpair://` |
| 12 | Number merge (2048-style) | Mergewit | `AltixCode/mergewit` | `com.altixcode.mergewit` | `mergewit://` |
| 14 | Sudoku | Sudokly | `AltixCode/sudokly` | `com.altixcode.sudokly` | `sudokly://` |
| 15 | Memory match | Memoflip | `AltixCode/memoflip` | `com.altixcode.memoflip` | `memoflip://` |
| 16 | Klondike solitaire | Klondo | `AltixCode/klondo` | `com.altixcode.klondo` | `klondo://` |
| 17 | Daily trivia quiz | Quizburst | `AltixCode/quizburst` | `com.altixcode.quizburst` | `quizburst://` |
| 18 | Would you rather | Ratherly | `AltixCode/ratherly` | `com.altixcode.ratherly` | `ratherly://` |
| 19 | Dice roller + Yahtzee scorer | Dicewit | `AltixCode/dicewit` | `com.altixcode.dicewit` | `dicewit://` |
| 20 | Idle tap / clicker | Tapforge | `AltixCode/tapforge` | `com.altixcode.tapforge` | `tapforge://` |

Guide items **11 (water sort)** and **13 (minesweeper)** are already in the wave-1
pipeline as `AltixCode/poursort` and `AltixCode/minestreak`. They are not
duplicated here; the 20-app brief is covered by those two plus the 18 above.

Every name above was checked against the US App Store with the iTunes Search API
on 2026-09-15 and had no exact-title or `Name:`/`Name -` prefixed match. Apple
still checks the whole title string at submission, so a `Name: Descriptor`
subtitle is the fallback if a bare name is refused.

## What every app in this wave shares

Inherited from `_template/`, so none of it is per-app work:

- expo-router shell (`index`, `settings`, `paywall`), themed Stack headers.
- Light and dark palettes derived from tokens, every text/background pair
  asserted against WCAG AA by a unit test.
- 14 locales with plural rules and RTL; `scripts/check-i18n.mjs` fails a
  partial key set and `scripts/check-ui-rules.mjs` fails a literal in a view.
- RevenueCat behind the single `remove_ads` entitlement, lifetime only, with the
  offline-cache rule so a paying user never sees an ad on a cold start, and the
  resolve-to-free rule so an unreachable RevenueCat does not mean no ads at all.
- AdMob banner, pre-loaded interstitial with pure pacing rules, and rewarded —
  all gated on UMP consent and iOS ATT, all failing closed.
- `npm run check:release`, which refuses a production build still carrying
  Google's test ad units.
- `plugins/withUIScene` for the iOS 26+ UIScene requirement.

## Per-app scope

The feature list, data model, ad placement, paywall price and ASO keywords for
each app are in the source brief, section by section, under the guide number in
the table above. The two portfolio-wide deviations from that brief:

1. **No subscriptions.** The brief proposes monthly tiers for Sudoku, Trivia and
   PourSort. The portfolio sells one lifetime non-consumable per app and one
   entitlement, `remove_ads`. Anything the brief gates behind a subscription is
   folded into that single purchase instead.
2. **No backend, and no live API.** The brief's currency rates for Convertwise
   are fetched directly from the client and cached on device; there is no server
   to run. Everything else is fully on-device.
