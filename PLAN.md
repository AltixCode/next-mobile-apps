# Next Mobile Apps — Research & Implementation Plans

Companion to `INSTRUCTIONS.md` in this folder. Six new app concepts, same
complexity tier as `gridhabit`, `gridlock-pop`, and `worddrop`, each buildable
solo (by Claude Max, start to finish) in **one week or less**.

## Shared foundation (copy from existing repos, don't reinvent)

Every app below reuses the exact stack and conventions already proven across
the three reference repos:

- **Expo SDK 57, React Native 0.86, TypeScript strict, expo-router.**
- **Pure logic core, zero React/native imports**, exhaustively unit-tested
  with Jest (`src/game/` or `src/logic/`). This is the single biggest reason
  these repos build fast — the hard part (rules, scoring, win conditions) is
  plain functions over plain data, testable without a simulator, and an LLM
  agent can iterate on it purely from `npm test` output.
- **Zustand** for state, **AsyncStorage** (or `expo-sqlite` when relational
  queries actually help, as in `gridhabit`) for persistence.
- **Monetization, identical shape every time:**
  - RevenueCat (`react-native-purchases`), single entitlement id `pro`,
    one lifetime non-consumable ("Remove Ads" / "Unlock Pro") as the
    *Best value* option, yearly + monthly alongside it.
  - Google AdMob (`react-native-google-mobile-ads`): anchored banner on
    non-gameplay screens, interstitial paced (never on first session, never
    two in a row, min ~90s apart — copy `gridlock-pop`'s `adPolicy.ts`),
    optional rewarded unit for a genuinely useful boost (continue/hint/undo).
  - UMP (GDPR/US consent) + iOS ATT gate ad init, fail closed, exactly per
    `gridlock-pop`'s `consentPolicy.ts`.
  - No `EXPO_PUBLIC_*` keys committed; test ad units / unconfigured RevenueCat
    degrade to "free, no ads shown" rather than crashing.
- **EAS Build/Submit**, `expo-doctor`, a `check:release` script that refuses a
  production build on placeholder ad/RevenueCat ids (copy `gridlock-pop`'s).
- **One differentiator per app**, not a mechanic copy-paste — see each
  section's "Why this and not the obvious clone" note.

### Naming caveat

Names below were checked against live App Store / Google Play search results
(web search, September 2026) and are the cleanest options found after
eliminating collisions with existing published apps. This is diligence, not
proof: run an actual App Store Connect / Play Console name reservation and a
trademark search (especially against **NYT Games** — "Wordle", "Connections",
"Strands", and the `-dle` suffix are actively defended — and against
**LinkedIn** — "Queens", "Tango", "Zip" are their trademarked game titles, so
the mechanics below are described generically, never branded with LinkedIn's
names) before each app's final submission.

---

## 1. Loopwits — daily logic-puzzle trio

**One-line pitch:** Three tiny, one-solution-only logic puzzles a day —
region-constrained placement, binary-grid fill, single-path draw — each
solvable in under two minutes, all sharing one streak.

### Why this, validated

LinkedIn's puzzle suite (Queens, Tango, Zip, Mini Sudoku — launched 2024, up
to 8 games by 2026) is one of the biggest daily-habit gaming successes of the
last two years, explicitly built as "a daily habit hook." It proved three
things: (1) constraint-satisfaction grid puzzles with a *unique* solution are
extremely shareable and streak-friendly, (2) bundling several 60–90 second
puzzles under one daily ritual out-performs a single puzzle for session
frequency, (3) demand is real but LinkedIn requires an account and isn't a
dedicated mobile-native app with ads/IAP — the standalone-app version of this
format is a validated gap. General puzzle-genre retention also backs this:
puzzle games show the *highest* D7 retention of any mobile genre, and
hybrid-puzzle titles hit ~16% D7 vs ~10% for hyper-casual generally.

### Why this and not the obvious clone

Don't name or reskin LinkedIn's three games 1:1 (trademark + they can pull
distribution rug via API). Build three **originally-designed** puzzle types
that hit the same design space (region placement, binary constraint, single
path) with different flavor and rules so they're legally and mechanically
distinct:

1. **Rulers** (region-placement): N×N grid divided into N colored regions;
   place exactly one marker per row, column, and region; no two markers
   orthogonally *or* diagonally adjacent. (This is the actual "Queens" rule
   set — it's just N-Queens-with-regions, a well-known constraint-puzzle
   class predating any single company; the ruleset itself isn't ownable, the
   branding is.)
2. **Duo** (binary-grid): 6×6 grid, fill each cell with one of two symbols
   (sun/moon) so each row/column has equal counts, no 3-in-a-row of the same
   symbol, and a few cells carry `=`/`×` constraints between neighbors.
   (Standard "Binairo"/Tango-style binary puzzle — decades-old puzzle genre.)
3. **OneLine** (path-draw): draw a single continuous path through every cell
   of the grid, visiting numbered dots 1..N in order. (Hamiltonian-path
   puzzle, same class as "Zip"/"Numberlink".)

### Core algorithm

All three are **constraint-satisfaction generation + solving** problems:
generate via backtracking placement + solution-uniqueness check (reject and
regenerate if the solver finds >1 solution), same technique
`gridlock-pop`'s `generateFairBag` uses for guaranteed-playable states, just
applied to a SAT-style solver instead of a bag draw.

```
src/logic/
  rulers/
    generate.ts   backtracking placement generator, uniqueness-checked
    solve.ts      constraint solver (used by generator + in-app hint)
    validate.ts   pure win-check given board state
  duo/
    generate.ts / solve.ts / validate.ts   (same shape)
  oneline/
    generate.ts / solve.ts / validate.ts   (same shape, path adjacency)
  daily.ts        date -> deterministic seed -> {rulers, duo, oneline} boards
  streak.ts        shared streak logic (copy gridhabit's date-key/local-noon pattern verbatim — it already solved DST correctly)
```

Puzzle generation runs **offline at build time** (a script generates N
months of puzzles into a bundled JSON, like `worddrop`'s `answers.source.tsv`
approach) so there's no backend, no server cost, no network dependency, and
day-index → puzzle is a pure deterministic function (testable, tamper-proof,
identical to WordDrop's architecture) — but unlike WordDrop, no live server
needed at all since there's no shared "everyone gets the same word" social
pressure requirement (each puzzle type is procedurally endless, so archive
depth is just "how many you pre-generate").

### Screens

`app/(tabs)/index.tsx` (today's 3-puzzle hub with progress rings) →
`app/rulers/[date].tsx`, `app/duo/[date].tsx`, `app/oneline/[date].tsx` (play
screens, shared `<PuzzleGrid>` component parameterized by puzzle type) →
`app/archive.tsx` (past days, Pro-gated beyond 7 days) → `app/stats.tsx`
(streak, solve-time history) → `app/settings.tsx` → `app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Today's 3 puzzles | ✅ | ✅ |
| Archive | last 7 days | unlimited |
| Hints | 1/puzzle/day (rewarded ad for more) | unlimited |
| Ads | banner on hub + archive, interstitial after completing all 3 | none |
| Mistake-highlighting | — | ✅ (Pro convenience feature) |

### One-week build plan

- **Day 1:** scaffold from `gridlock-pop` (closest architecture: pure engine
  + drag/tap grid UI), pure logic for all 3 generators + solvers + tests.
- **Day 2:** puzzle-generation script, generate 12 months of puzzles, parity
  test that generated puzzles have unique solutions (like `worddrop`'s
  parity test, just local instead of worker-vs-app).
- **Day 3:** shared `<PuzzleGrid>` component + 3 input interaction modes
  (tap-to-cycle for Rulers/Duo, drag-to-draw for OneLine).
- **Day 4:** hub screen, streak logic (port `gridhabit`'s date/streak
  module), archive, stats.
- **Day 5:** RevenueCat + AdMob wiring (copy from `gridlock-pop` almost
  verbatim), paywall screen, consent flow.
- **Day 6:** icon/asset generation, EAS config, `check:release`, polish
  (haptics, animations, dark mode).
- **Day 7:** device QA pass on all 3 puzzle types + purchase/ad flows, store
  listing copy, submit.

---

## 2. PourSort — liquid sort puzzle

**One-line pitch:** Pour colored liquid between tubes until every tube holds
one color. No timer, no fail state, just satisfying order-from-chaos.

### Why this, validated

Sort/color-sort ("water sort") is one of the strongest-performing puzzle
sub-genres in the entire mobile market right now: sort-and-screw-style puzzle
revenue *doubled* in IAP earnings 2024→2025, hybrid-casual puzzles pulled
$87M in Q1 2025 alone (+67% YoY), the category leader has 50M+ downloads and
the original "Water Sort Puzzle" has crossed 10M. It's also genuinely the
cheapest genre to build: the entire game is one stack-based data structure
and one legality rule.

### Why this and not the obvious clone

The market is crowded (a dozen near-identical "Water Sort"/"Color Sort"/"Tube
Sort" apps already exist), so the differentiator has to be in **content
structure and pacing**, not mechanics — mechanics are already a commodity
and re-deriving them is fine (this genre's whole value is that the rule set
is public domain and well-understood). Differentiate with:
- A **daily puzzle mode** (deterministic seed, shareable emoji-grid result à
  la Wordle) layered on top of the standard endless-levels mode — none of the
  incumbents found in research combine "endless casual sort" with "one daily
  challenge everyone shares," and that's exactly the mechanic that made
  WordDrop's genre (and Loopwits' genre) work for retention.
- Move-counter par + 3-star scoring to give skilled players something to
  chase (the incumbents are mostly "solve at your own pace, no scoring").

### Core algorithm

```
src/logic/
  tube.ts        Tube = color[] (stack). pourLegal(from, to): same top color
                  or empty, and to has capacity; pour() returns new state.
  level.ts        LevelState = { tubes: Tube[], capacity: number, moves: number }
  generate.ts     generateLevel(seed, tubeCount, colorCount, capacity):
                    1. build a SOLVED state (each tube one color)
                    2. apply N random *legal reverse pours* (shuffle)
                    3. verify solvability + minimum move count via BFS/IDA*
                       solver, reject/regenerate if too easy or unsolvable
  solver.ts       BFS/A* solver — used by generator AND in-app hint/auto-solve
  win.ts          pure isWon(state): every non-empty tube is single-color and full
  daily.ts        date -> seed -> level (same deterministic pattern as Loopwits/WordDrop)
```

This is the same "generate then verify via solver" trick as Loopwits — a
solver that can prove solvability is required *anyway* for the hint feature,
so building it first and using it for generation too is free reuse (this is
exactly the kind of pure, native-free, heavily-unit-tested module the
reference repos are built around).

### Screens

`app/index.tsx` (level select grid, 200+ levels) → `app/level/[id].tsx`
(play) → `app/daily.tsx` (today's challenge + share) → `app/settings.tsx` →
`app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Levels | 1–40 | unlimited (400+) |
| Daily challenge | ✅ | ✅ |
| Hints | 1 free, then rewarded ad | 3/day free, no ads |
| Undo | 3/level | unlimited |
| Ads | banner on level select, interstitial every 3rd level completion | none |

### One-week build plan

- **Day 1:** pure logic — tube/pour/legality, tests.
- **Day 2:** solver (BFS with visited-state hashing) + generator using it,
  difficulty curve script (like `gridlock-pop`'s `balance.ts`) tuning
  tube/color counts per level band.
- **Day 3:** board UI — animated pour (Reanimated worklet, same "UI-thread
  drag" trick `gridlock-pop` uses for perf), tap-to-select-tube interaction.
- **Day 4:** level select screen, progression/unlock persistence
  (AsyncStorage), daily-challenge screen + emoji-grid share.
- **Day 5:** RevenueCat + AdMob (reuse verbatim), paywall.
- **Day 6:** 400-level content generation + hand-spotcheck a sample,
  assets/icons, EAS config.
- **Day 7:** device QA, store listing, submit.

---

## 3. Foldup — number-merge puzzle

**One-line pitch:** Lift a tile, drop it on its twin, the pair folds into the
next power of two. One clean rule, no grid gravity chaos, no timer.

### Why this, validated

Merge mechanics are the single strongest-monetizing casual sub-genre in 2025:
the merge-games market pulled multi-billion-dollar global revenue, with one
title alone hitting $1.4B for the year and merge-2 category revenue +94% YoY
on +32% installs. This is a pared-down, single-mechanic slice of that
(no meta-map, no energy system, no IAP-gated resource sinks) aimed at the
"5-minute session, ad-supported, lifetime IAP" tier the reference repos
target, not the whale-monetized meta-game tier.

### Why this and not the obvious clone

2048-style *falling-grid* merge is oversaturated and legally sensitive (the
"2048" name/format has many aggressive clones already, hard to differentiate,
easy to look like straight IP lift). Skip gravity/sliding entirely: this is a
**tap-to-lift, tap-to-drop puzzle-level** game (bounded board, finite moves,
3-star par scoring — think "match puzzle" pacing, not "endless arcade"
pacing), closer in spirit to a mobile solitaire session than to 2048. That
sidesteps the crowded exact-mechanic space (confirmed via research: the
closest-named competitors are all falling-grid or physics-drop games, not
level-based lift-and-merge) while still riding the proven "numbers double
when merged" satisfaction loop.

### Core algorithm

```
src/logic/
  board.ts       Board = (Tile | null)[][], Tile = { value: number, id }
  moves.ts        legalTargets(board, fromCell): cells reachable in one
                   straight/adjacent move whose tile.value === fromTile.value
  merge.ts        applyMerge(board, from, to): returns new board with
                   to.value doubled, from cleared, score delta
  win.ts          isCleared(board) / isStuck(board) (no legal moves left)
  generate.ts     generateLevel(seed, size, tileCount, targetValue):
                    build backward from a solved/cleared state by "unmerging"
                    (split a tile into two half-value tiles at random empty
                    neighbors), same generate-by-reversal trick as PourSort
  par.ts          BFS-shortest-solution search -> par move count for 3-star scoring
```

### Screens

`app/index.tsx` (level map) → `app/level/[id].tsx` (play, tap tile then tap
target) → `app/daily.tsx` (optional daily seeded level, same shared pattern
as the other two) → `app/settings.tsx` → `app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Levels | 1–30 | unlimited (300+) |
| Undo | 1/level | unlimited |
| Ads | banner on map, interstitial every 3rd level | none |
| Rewarded | "reveal one legal move" hint | included free, no ads |

### One-week build plan

Same shape as PourSort (they share the generate-by-reversal + BFS-solver
pattern almost exactly): Day 1 pure logic, Day 2 generator/solver + par
scoring, Day 3 board UI + animations, Day 4 level map + progression, Day 5
monetization wiring, Day 6 content + assets, Day 7 QA + submit.

---

## 4. Knotter — line-connect puzzle

**One-line pitch:** Draw one continuous line per color pair, filling every
cell on the board, no lines crossing.

### Why this, validated

This is the "Flow Free" format — 100M+ downloads on the original, still
receiving updates and ranking in 2026, one of the most durable evergreen
puzzle formats in mobile history precisely because the rule set is trivial to
learn (connect same colors, fill the board, don't cross) and endlessly
regeneratable. Multiple spin-offs (Hexes, Warps, Bridges, Shapes) from the
original studio show the format supports variant content for years without
new mechanics — good news for a one-week build, since day-one scope is just
"the classic grid," with clear expansion room later.

### Why this and not the obvious clone

Don't fight the original head-on with an identical grid. Ship the classic
rule set (it's public-domain "Numberlink," not ownable) but differentiate on
**presentation and content cadence**: a daily seeded puzzle + streak (again,
the one mechanic none of the incumbent Flow-style apps in research results
lead with — they're all endless-level packs, none foreground a daily
ritual), and a distinctive "knot" visual theme (thick rounded cords instead
of thin pipes) so screenshots don't read as a reskin.

### Core algorithm

```
src/logic/
  grid.ts         Grid = cell[][], Path = cell[] per color
  validate.ts      pathLegal(path): no self-crossing, endpoints match color dots
  win.ts           isWon(grid, paths): every cell covered exactly once,
                    every color's two dots connected
  generate.ts      generateLevel(seed, size, colorCount):
                     1. random Hamiltonian-path-ish fill via randomized DFS
                        carving through the grid (self-avoiding walk)
                     2. slice the filled path into N colored sub-paths
                     3. keep only the endpoints as the puzzle; verify with
                        a solver that the puzzle has a *unique* solution,
                        regenerate on failure
  solver.ts        constraint solver (also powers in-app hint)
```

### Screens

Identical shape to PourSort/Foldup: level select → play → daily → settings →
paywall. `<KnotBoard>` component: drag-to-draw path on UI thread
(Reanimated), same low-end-Android-first perf approach as `gridlock-pop`.

### Monetization

Same table shape as the other two puzzle apps (levels gated at a free
threshold, daily challenge always free, banner + paced interstitial, one
lifetime "remove ads" unlock). Consistent monetization across the portfolio
is a *feature*, not laziness — it means a shared RevenueCat/AdMob module can
be literally copy-pasted between all six apps with near-zero changes.

### One-week build plan

Same 7-day shape as PourSort/Foldup (this genre-family — generate via
random-walk-then-slice, verify via solver, drag-based board UI — is the
fastest of the six to build once the pattern from app #2 exists, since #3 and
#4 are largely a find-and-replace of the core algorithm).

---

## 5. Wordflock — daily word-grouping puzzle

**One-line pitch:** 16 words, 4 hidden categories, find the groupings before
you run out of guesses. One puzzle a day, shared with a spoiler-free result
grid.

### Why this, validated

NYT Connections is one of the most successful daily-puzzle launches of the
last three years and is still actively expanding (NYT added weekly "bonus"
twists on Connections through 2026). Research confirms a live, thriving
indie ecosystem of Connections-style clones and variants already generating
real installs and reviews — this is a proven format with room for another
well-made entrant, not an unproven bet. It's also mechanically the cheapest
of the six to build: the entire "game" is a category-matching data problem,
no physics, no drag-drawing, no solver needed at all.

### Why this and not the obvious clone

Straight 1:1 clones are common and undifferentiated (confirmed in research).
Two things to do differently: (1) **content quality is the entire product**
here — unlike the puzzle-generator apps above, there's no algorithm to lean
on, so the week's real engineering effort should be a hand-curated (or
LLM-assisted-and-human-reviewed) category/word bank, not UI polish; budget
for that explicitly. (2) Ship a **rotating theme mode** (movies one day,
geography the next, etc. — mentioned in research as what makes the better
indie entrants "rival NYT taste") as a Pro-tier feature, since it's pure
content and doesn't require new engineering.

### Core algorithm

```
src/logic/
  puzzle.ts       Puzzle = { groups: [{ theme: string, words: string[4], difficulty: 1|2|3|4 }] }
                   (exactly 4 groups, 16 words total, shuffled for display)
  guess.ts         evaluateGuess(puzzle, selectedWords):
                     - all 4 match one group -> correct, reveal
                     - "one away" detection (3 of 4 belong to same group)
                     - mistake counter (4 allowed, like the reference format)
  daily.ts         date -> seed -> puzzle index into a curated bank (same
                    deterministic local-pattern as every other app here)
  share.ts          emoji-grid result encoder (copy WordDrop's approach —
                    it already solved "spoiler-free shareable result")
data/
  puzzles.source.json   hand-authored puzzle bank, versioned, reviewed for
                          ambiguity (every word must fit exactly one group —
                          the classic failure mode of this genre)
```

No backend needed (unlike WordDrop's "everyone must get the literal same
word today," which needs a server to prevent client-side lookahead —
Connections-style puzzles are lower-stakes if a determined player decodes
tomorrow's puzzle from the bundle, so ship it exactly like Loopwits/PourSort:
bundled JSON, deterministic date→index).

### Screens

`app/index.tsx` (today's puzzle) → `app/result.tsx` (share grid, streak) →
`app/archive.tsx` (Pro-gated) → `app/themed/[topic].tsx` (Pro rotating
themes) → `app/stats.tsx` → `app/settings.tsx` → `app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily puzzle | ✅ | ✅ |
| Archive | last 7 days | unlimited |
| Themed packs (movies, geography, music…) | 1 free sample pack | all packs |
| Ads | banner on home/archive, interstitial after result | none |

### One-week build plan

- **Day 1:** pure logic (guess evaluation, one-away detection, streak —
  reuse `gridhabit`'s date/streak module verbatim), tests.
- **Day 2–3:** **content**: author + review 90+ days of puzzles (curated,
  not generated — this is the app where content time replaces algorithm
  time) plus 3–4 themed packs; script to validate every puzzle
  (`check:puzzles.mjs`: no word appears in two groups, no duplicate puzzles).
- **Day 4:** board UI (tap-to-select tiles, shake-on-mistake, reveal
  animation), result/share screen.
- **Day 5:** archive, themed-pack screens, stats.
- **Day 6:** RevenueCat + AdMob (reuse verbatim), paywall, assets/icons.
- **Day 7:** device QA, store listing, submit.

---

## 6. MineStreak — daily minesweeper

**One-line pitch:** The classic you already know how to play, one fair board
a day, streak included. No ads mid-board, no energy system.

### Why this, validated

Minesweeper is one of the most universally-recognized game formats on earth
(pre-installed on Windows for 30 years — zero explanation needed, which
collapses onboarding to nothing). Research confirms an active, currently
updated market of "Daily Minesweeper" apps in 2025–2026 explicitly built
around the same daily-board-plus-streak format this app proposes, one of
which explicitly markets "no pay-to-win, no boosters, no energy timers, no
ads" as its differentiator — validating both that the demand exists *and*
that a clean ad+one-time-IAP model (rather than an energy/gacha model) is
what this audience actually wants, which lines up exactly with this
portfolio's monetization pattern.

### Why this and not the obvious clone

The gap in the researched competitors: none combine "guaranteed-solvable
board" (no-guessing minesweeper — a well-known but not universally
implemented variant) with the daily-streak format. Shipping *both* is the
differentiator: every board is provably solvable through pure logic with
zero 50/50 guesses, which is a real, well-documented pain point with the
classic game and a strong "why this app not the stock one" pitch line.

### Core algorithm

```
src/logic/
  board.ts        Board = Cell[][], Cell = { mine: boolean, adjacent: number,
                    revealed: boolean, flagged: boolean }
  reveal.ts         floodReveal(board, cell): classic 0-adjacent flood fill,
                    pure function returning new board
  win.ts            isWon(board): every non-mine cell revealed
  generate.ts       generateSolvableBoard(seed, width, height, mineCount):
                     1. place mines (seeded RNG)
                     2. run a pure-logic solver (no-guess deduction: single-
                        point constraint + subset/CSP constraint propagation)
                        from a fixed safe opening cell
                     3. if the solver can't fully clear it without guessing,
                        reshuffle mines and retry (same generate-and-verify
                        pattern as apps #1, #2, #4)
  solver.ts         the no-guess deduction solver (also powers in-app hint)
  daily.ts          date -> seed -> board (same shared pattern)
```

The no-guess solver is the one genuinely nontrivial algorithm in this whole
portfolio (constraint propagation + small-subset brute force for ambiguous
edges) — budget it real time, but it's still a pure, native-free, plain-Node
module exactly like everything else here, so it's fully unit-testable
without a device or simulator.

### Screens

`app/index.tsx` (today's board + streak) → `app/archive.tsx` (Pro-gated) →
`app/practice.tsx` (unlimited free-play boards, ad-supported) →
`app/stats.tsx` (win rate, best time) → `app/settings.tsx` →
`app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily board | ✅ | ✅ |
| Practice mode | ✅ (ad-supported) | ✅ (no ads) |
| Archive | last 7 days | unlimited |
| Ads | banner on home, interstitial every 3rd practice board | none |
| Rewarded | one free flag-reveal hint | unlimited hints, no ads |

### One-week build plan

- **Day 1:** board/reveal/win pure logic, tests.
- **Day 2–3:** no-guess solver (the hard part — budget two days, it's the
  one algorithm here that isn't "generate-then-verify with a simple check").
- **Day 4:** board UI (tap-reveal, long-press-flag, flood-reveal animation),
  timer.
- **Day 5:** archive, practice mode, stats.
- **Day 6:** RevenueCat + AdMob (reuse verbatim), paywall, assets/icons.
- **Day 7:** device QA (this app most needs a real-device pass — flood-fill
  performance on large boards, flag/reveal gesture conflicts), store
  listing, submit.

---

## Portfolio-level notes

**Build order recommendation:** PourSort → Foldup → Knotter first (they
share the generate-by-reversal + solver-verify pattern, so the second and
third are meaningfully faster than the first once that pattern exists in the
codebase) → MineStreak (hardest solver, do it once the pattern is familiar)
→ Loopwits (three mini-engines, most total surface area) → Wordflock last
(content-authoring bottleneck, not code — can run in parallel with any of
the above once the engine is done, since a human/LLM content pass doesn't
block on engineering).

**Distribution reality check**, same as `gridlock-pop`'s README already
says and it applies to all six: the mechanics here are commodities in
well-proven genres — that's the point, it's what makes them buildable in a
week and de-risks "will anyone want this" — but installs are the hard,
expensive part. Budget UA test spend per app, measure D1 retention (~40%
is the hyper-casual/puzzle benchmark to beat) before scaling spend, and don't
build Phase-2 content for any of them until a first app clears that bar.

**Shared infra worth extracting after app #2 or #3:** a small internal
template/starter (RevenueCat init, AdMob init + consent flow, paywall
screen, `check:release` script, EAS profiles) currently gets hand-copied
between repos. Once three of these six exist, promoting that into a local
`create-expo-puzzle-app` scaffold pays for itself.
