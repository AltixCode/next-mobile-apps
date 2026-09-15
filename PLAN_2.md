# Next Mobile Apps — Round 2

Companion to `PLAN.md` in this folder (round 1: Loopwits, PourSort, Foldup,
Knotter, Wordflock, MineStreak). Six more concepts, same bar: validated
market, same Expo/RN stack, buildable solo in a week, ads + lifetime-IAP
monetization. This round leans harder into "2D game" territory specifically
— two of the six (Toppl, Poplet) are continuous-motion/physics games with
real aiming and trajectory rather than static grid-taps, which the first
round was entirely made of. The other four round out genres round 1 didn't
touch: physics-timing, cards, trivia, memory, reaction/skill.

See `PLAN.md`'s "Shared foundation" section for the stack, monetization
shape, and naming caveat — all six below assume it and don't repeat it.

---

## 1. Toppl — precision block-stack tap game

**One-line pitch:** A block swings left-right above your tower; tap to drop
it. Land it flush and the tower grows clean; miss the edge and it's cut down
to size. How high can you stack before the tower's too thin to survive?

### Why this, validated

This is the "Stack" format (Ketchapp's original hit 50M+ downloads on
Google Play alone, still being actively updated with new modes in 2026 —
"Stack City," daily missions, cloud save). It's one of the most-copied
hyper-casual formats ever made, which is itself the validation: the core
loop (single input, escalating precision pressure, instant restart) is
proven at massive scale across a decade, and hyper-casual is *the one*
mobile-gaming segment still showing download growth in 2025–2026 even as
the broader market flattens.

### Why this and not the obvious clone

The genre is crowded with near-identical entries (Stack, Stackly, Stack.it,
Stack Jump, Stack Ball — all found active in research). Differentiate on the
one mechanic none of them lead with: a **daily seeded tower** — same block
movement-speed pattern for everyone each day, same starting width, so
"how high did you get today" is a comparable, shareable score (Wordle-grid
style result: a column of block-width bars) rather than a purely personal
high score. This is the exact retention hook that makes every app in round 1
and the reference repos work, just applied to a genre that currently ships
without it.

### Core algorithm

No physics engine needed — the original Stack format is pure geometry, and
that's exactly why it's a fast build:

```
src/logic/
  motion.ts     blockX(elapsedMs, speed, boardWidth): triangle-wave position
                  function — pure, deterministic, drives both the render
                  loop and hit-testing
  drop.ts        resolveDrop(previousBlock, movingBlock):
                   overlap = intersect(previousBlock.span, movingBlock.span)
                   -> { newBlock: overlap, offcut: non-overlapping remainder,
                        perfect: overlap.width === movingBlock.width }
                   returns gameOver if overlap.width <= 0
  score.ts        combo tracking — consecutive `perfect` drops multiply
                   points and (cosmetically) widen a forgiveness margin,
                   mirroring gridlock-pop's difficulty-as-a-tuned-constant
                   philosophy (one weight to balance, unit-tested)
  daily.ts        date -> seed -> speed-ramp profile (how fast/how much the
                   speed increases per row) so today's tower is identical
                   for every player, same deterministic pattern as every
                   other daily mode in this portfolio
```

Rendering: `react-native-svg` for the block stack (already a dependency in
all three reference repos), camera "follows" the tower by translating a
group transform downward as it grows — no new native module required at
all, which makes this the cheapest of all twelve apps (two rounds) to get
onto a device.

### Screens

`app/index.tsx` (today's tower, tap-to-start) → in-game overlay (score,
combo) → `app/result.tsx` (share the day's stack as a bar-chart image,
streak) → `app/practice.tsx` (untimed endless mode, ad-supported) →
`app/stats.tsx` → `app/settings.tsx` → `app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily tower | ✅ | ✅ |
| Practice mode | ✅ (ad-supported) | ✅ (no ads) |
| Ads | banner on home, interstitial every 3rd practice run, rewarded "one more row" continue | none (continue stays free — it's a benefit, not an ad the upgrade removes, same policy as gridlock-pop) |
| Cosmetic block skins | 2 free | full set |

### One-week build plan

- **Day 1:** motion/drop/score pure logic + tests (this is genuinely a
  half-day of logic — budget the rest of Day 1 for the render loop).
- **Day 2:** SVG tower renderer, camera-follow transform, tap-to-drop input,
  offcut-falls-away animation (Reanimated).
- **Day 3:** daily seed system, result/share screen, streak.
- **Day 4:** practice mode, combo/scoring polish, haptics, sound.
- **Day 5:** RevenueCat + AdMob wiring (copy verbatim), paywall, cosmetic
  skins.
- **Day 6:** assets/icons, EAS config, `check:release`.
- **Day 7:** device QA (frame-rate check on low-end Android is the one real
  risk here — profile the SVG re-render cost per drop), store listing,
  submit.

---

## 2. Solari — daily solitaire (Klondike)

**One-line pitch:** One Klondike deal a day, guaranteed winnable, same for
everyone. Classic solitaire with a streak.

### Why this, validated

Solitaire is one of the largest, most durable categories in mobile gaming —
Solitaire Grand Harvest alone has crossed $1B lifetime revenue on 69M
downloads, and standard Klondike apps (MobilityWare, Zynga, Tripledot, and a
long tail of smaller entrants) are consistently top-grossing in the card
category. It's evergreen in the literal sense: it's been a default-installed
game on desktop computers since 1990 and needs zero explanation to anyone
over the age of 10.

### Why this and not the obvious clone

The incumbents (confirmed in research) are almost all "endless free-play,
no daily structure, IAP-heavy meta-games" (coin economies, event calendars,
power-ups). None of the major names found lead with a **daily, guaranteed-
winnable, shared-deal** format — which is exactly the format that made
Wordle-style apps (and this portfolio) work, and it's a much lighter build
than a coin-economy meta-game: no server-side economy, no event calendar, no
IAP beyond the standard lifetime unlock. Ship the classic game everyone
already knows how to play, with the one retention mechanic the incumbents
are missing.

### Core algorithm

Standard Klondike rules are simple to implement; the one real engineering
task is guaranteeing a deal is winnable, because that's the entire pitch:

```
src/logic/
  deck.ts        seeded Fisher-Yates shuffle of a standard 52-card deck
  deal.ts         deal(seed) -> KlondikeState (7 tableau columns, stock, waste,
                   4 empty foundations)
  moves.ts         legalMoves(state): every legal move from tableau/waste/
                    foundation, as pure data (used by both the UI's
                    tap-to-move affordance and the solver)
  apply.ts         applyMove(state, move): pure reducer, returns new state
  win.ts            isWon(state): all 52 cards on foundations
  solver.ts         heuristic backtracking solver with a move-count cap and
                     transposition-table memoization (full Klondike
                     solvability is computationally expensive to prove
                     exhaustively — the accepted industry approach, used by
                     every major "winnable deals" solitaire app, is a capped
                     heuristic solver that rejects deals it can't solve
                     within a bounded search, which in practice yields deals
                     that are winnable with correct play); this same solver
                     powers the in-app hint and single-tap "auto-finish"
                     when the board is fully exposed
  daily.ts          date -> seed -> deal, pre-filtered through the solver at
                     generation time so only solver-verified seeds ship
```

Deal generation runs offline (a script that scans seeds and keeps only
solver-verified ones, building a year of daily deals into a bundled table —
same "pre-generate, ship deterministic index" pattern as Loopwits and
PourSort in round 1), so there's no runtime solver cost on-device beyond the
optional hint.

### Screens

`app/index.tsx` (today's board) → `app/result.tsx` (win screen, share,
streak) → `app/free-play.tsx` (unlimited random deals, ad-supported) →
`app/archive.tsx` (Pro-gated past daily deals) → `app/stats.tsx` (win rate,
best time, longest streak) → `app/settings.tsx` → `app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily deal | ✅ | ✅ |
| Free-play mode | ✅ (ad-supported) | ✅ (no ads) |
| Archive | last 7 days | unlimited |
| Hints | 3/deal, then rewarded ad | unlimited |
| Ads | banner on home/archive, interstitial every 3rd free-play deal | none |

### One-week build plan

- **Day 1:** deck/deal/moves/apply pure logic, tests.
- **Day 2–3:** solver (the hard part, same budget as MineStreak's no-guess
  solver in round 1) + generation script, verify a year of deals.
- **Day 4:** board UI — drag-and-drop card piles (`react-native-gesture-
  handler`, already a dependency everywhere in this portfolio), tap-to-
  auto-move to foundation.
- **Day 5:** free-play mode, archive, stats, win animation.
- **Day 6:** RevenueCat + AdMob (reuse verbatim), paywall, card-back
  cosmetics, assets/icons.
- **Day 7:** device QA (drag-and-drop gesture conflicts are the main risk on
  small screens), store listing, submit.

---

## 3. Poplet — puzzle bubble shooter

**One-line pitch:** Aim, shoot, pop three-or-more of a color. Fixed shots
per level, not endless survival — solve the board, don't just outlast it.

### Why this, validated

Bubble shooter is one of the longest-running, highest-grossing puzzle
formats in mobile (the format traces back to Puzzle Bobble/Bust-a-Move and
has spawned category leaders like Panda Pop and Bubble Shooter with
hundreds of millions of combined installs); research confirms puzzle overall
is the #3 revenue genre in the current market at $12.2B, with match/shoot
mechanics like this among its steadiest performers even as overall mobile
download volume has softened.

### Why this and not the obvious clone

The incumbents found in research (Bubble Pop, Bubble Shooter Pop!, Bubble
Pop Origin) are overwhelmingly **endless-survival** format: the ceiling
drops, you outlast it, sessions are open-ended and the monetization leans on
extra-shots/continue IAP. Ship the other structure instead: **fixed-level,
fixed-shot-budget puzzles** with 3-star par scoring — closer in spirit to
the level-based pacing this whole portfolio already uses (PourSort, Foldup,
Knotter from round 1) than to the arcade-survival incumbents, plus a daily
seeded level layered on top for the shared-result hook none of them have.
This is also the one app in both rounds with genuine continuous-aim/
trajectory gameplay — the most "2D game" of the twelve in the classic arcade
sense.

### Core algorithm

```
src/logic/
  hexgrid.ts      axial hex-coordinate math: neighbor lookup, pixel<->hex
                   conversion — the standard representation for bubble-
                   shooter grids, pure and fully unit-testable
  trajectory.ts    path(angle, originX, boardWidth): pure function returning
                   the bounced-off-walls line segments for a shot at a given
                   angle (reflection math only, no physics engine needed —
                   this is exactly the kind of "just geometry" problem
                   Toppl's motion.ts is too)
  collision.ts     firstImpact(path, grid): walks the trajectory segments
                   and returns the nearest empty hex cell adjacent to either
                   the ceiling or an existing bubble
  cluster.ts       connectedSameColor(grid, cell): flood-fill match-3+
                   detection; floatingBubbles(grid): cells disconnected from
                   the ceiling after a pop, which then drop (classic bubble-
                   shooter chain-reaction rule)
  generate.ts      generateLevel(seed, rows, colorCount, shotBudget): builds
                   a layout, then runs a greedy/simulated-annealing solver
                   to confirm it's clearable within the shot budget —
                   reject and regenerate otherwise (the same "generate then
                   verify with a solver" pattern used by every procedurally-
                   generated app in this portfolio)
  win.ts            isCleared(grid) / isOutOfShots(shotsRemaining)
```

### Screens

`app/index.tsx` (level map, 150+ levels) → `app/level/[id].tsx` (play) →
`app/daily.tsx` (today's seeded level + share) → `app/settings.tsx` →
`app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Levels | 1–30 | unlimited (200+) |
| Daily challenge | ✅ | ✅ |
| Extra shots on fail | rewarded ad | 1 free retry, no ads |
| Ads | banner on level map, interstitial every 3rd level | none |

### One-week build plan

- **Day 1:** hexgrid + trajectory + collision pure logic, tests.
- **Day 2:** cluster/pop/floating-drop logic, generator + solver, tune
  difficulty curve (`balance.ts` script, same idea as gridlock-pop's).
- **Day 3:** shooter UI — aim (pan gesture on UI thread, Reanimated),
  projectile animation, ceiling/bubble rendering (SVG).
- **Day 4:** level map, progression persistence, daily-challenge screen.
- **Day 5:** RevenueCat + AdMob (reuse verbatim), paywall.
- **Day 6:** 200-level content generation + spotcheck, assets/icons, EAS
  config.
- **Day 7:** device QA (aim-gesture feel and low-end-Android frame rate are
  the real risks here), store listing, submit.

---

## 4. Quandary — daily 5-question trivia

**One-line pitch:** Five questions, once a day, everyone gets the same set.
One attempt, a shareable ✅❌ result grid, and a streak.

### Why this, validated

Daily-trivia-as-a-habit is an active, currently expanding trend: Netflix
shipped "Netflix Star Daily Trivia" explicitly modeled on Wordle's retention
mechanic in 2026, and multiple independent apps (Trend Trivia, Quizl,
Trivia Spell) are live and growing on exactly this "daily streak" framing.
Trivia as a genre is also one of the most universally-appealing formats —
no learned skill required, pure recall, works for any age.

### Why this and not the obvious clone

The incumbents found in research each miss a piece of the format that made
Wordle work: Trend Trivia is built around 1v1 challenges and news headlines
(a moving target, not a fixed daily ritual); Quizl and Trivia Spell are
closer but don't foreground the single-shared-set-for-everyone mechanic as
tightly as this. Ship the strict version: **exactly 5 questions, identical
for every player that day, one attempt, no retry, no endless bank to browse
mid-session** — mirroring WordDrop's "everyone gets the same word" model
applied to trivia instead of vocabulary, including its server architecture.

### Core algorithm and architecture

This is the one app in either round that's a near-direct architectural port
of `worddrop`, just with a different content shape:

```
src/logic/
  quiz.ts        Question = { prompt, choices: string[4], answerIndex,
                   category, difficulty: 1-5 }
  score.ts         evaluate(answers, quiz): correct count, a per-question
                    right/wrong list (drives the share grid), time bonus
  daily.ts          date -> seed -> pick 5 questions from the bank, ramped
                     by difficulty (Q1 easy .. Q5 hard, same "gets harder as
                     you go" shape Trivia Spell uses, confirmed as a
                     retention-positive pattern in research)
  share.ts           emoji-grid encoder (✅✅❌✅❌ style), directly reusing
                      WordDrop's spoiler-free share-grid approach
backend/            Cloudflare Worker + KV, one cron at 00:00 UTC publishing
                      the day's 5 questions — copied close to verbatim from
                      worddrop/backend, including the offline-fallback
                      requirement: if the fetch fails, the app derives the
                      same 5 questions locally from the bundled bank using
                      the identical seeded-selection algorithm, with a
                      parity test (worddrop's backend/test/parity.test.mjs
                      pattern) failing the build if the two copies drift
data/questions.source.json   curated question bank — this app's real
                              engineering cost isn't the algorithm (which is
                              a two-hour port of WordDrop's daily-selection
                              logic), it's authoring and fact-checking a few
                              thousand accurate, unambiguous questions
                              across categories; budget accordingly, same
                              caveat as Wordflock in round 1
```

### Screens

`app/index.tsx` (today's 5 questions, one at a time) → `app/result.tsx`
(share grid, streak, category breakdown) → `app/archive.tsx` (Pro-gated) →
`app/stats.tsx` (accuracy by category) → `app/settings.tsx` →
`app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily 5 | ✅ | ✅ |
| Archive | last 7 days | unlimited |
| Category stats breakdown | — | ✅ |
| Ads | banner on home/archive, interstitial after result | none |

### One-week build plan

- **Day 1:** quiz/score/share pure logic (port of WordDrop's shape), tests.
- **Day 2–3:** **content**: curate + fact-check a launch bank (aim for a
  year+ of daily sets, ~2,000 questions across 8–10 categories) and a
  validation script (no duplicate answers within a question, no ambiguous
  wording, category balance).
- **Day 4:** Worker + KV backend (near-verbatim port of worddrop/backend),
  parity test.
- **Day 5:** question-card UI, result/share screen, archive, stats.
- **Day 6:** RevenueCat + AdMob (reuse verbatim), paywall, assets/icons.
- **Day 7:** device QA, store listing, submit.

---

## 5. Flipnest — daily memory match

**One-line pitch:** Flip cards, find the pairs, clear the board. One themed
board a day, scored by moves and time, with a streak.

### Why this, validated

Memory/concentration is one of the oldest and most reliably casual-friendly
formats in gaming — the research turned up a dense, actively-updated
ecosystem of memory-match apps (Flip & Find, Flip and Match, Memory Flip,
Flip Match, and more, several with daily-challenge and multiple-difficulty
features already), confirming steady, ongoing demand in exactly this
complexity tier. It's also the cheapest app in either round to build: the
entire game is a shuffle, a flip-pair-compare state machine, and a win
check — no solver, no generator-and-verify loop, no physics.

### Why this and not the obvious clone

Most incumbents found are endless-level-progression apps with no shared
daily ritual. Ship the one thing they're missing — a **daily seeded board
with a shareable result** (moves + time, same "beat today's board" framing
as every other daily app in this portfolio) — and lean on **icon themes
instead of licensed art** to keep content cost near zero: `lucide-react-
native` (already a dependency in `worddrop`) ships hundreds of clean vector
icons, more than enough for a rotating set of daily themes (animals, food,
travel, space, etc.) without commissioning or licensing artwork.

### Core algorithm

```
src/logic/
  board.ts       Card = { id, pairId, revealed, matched }; seeded shuffle of
                  N pairs into a grid
  flip.ts          pure reducer: flipCard(state, cardId) -> either a single
                    face-up card (waiting for a second flip) or, once two
                    are face-up, a `pendingResolution` state carrying
                    whether it's a match — deliberately doesn't auto-resolve
                    inside the reducer, so the UI layer can hold the
                    mismatch on screen for a beat before calling
                    resolveFlip(state), keeping the animation timing a UI
                    concern and the logic itself trivially pure and testable
  win.ts            isWon(state): every card matched
  score.ts          moves taken + elapsed time -> star rating (3/2/1)
  daily.ts           date -> seed -> { theme, gridSize } (grid size and
                      theme rotate day to day for variety, same deterministic
                      pattern as every other daily mode here)
```

### Screens

`app/index.tsx` (today's board) → `app/result.tsx` (moves/time, share,
streak) → `app/practice.tsx` (pick any theme, untimed, ad-supported) →
`app/archive.tsx` (Pro-gated) → `app/stats.tsx` → `app/settings.tsx` →
`app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily board | ✅ | ✅ |
| Practice mode | 3 themes | all themes |
| Archive | last 7 days | unlimited |
| Ads | banner on home, interstitial every 3rd practice round | none |

### One-week build plan

- **Day 1:** board/flip/win/score pure logic, tests.
- **Day 2:** card-flip UI (flip animation via Reanimated), grid layout for
  varying sizes (4×4 through 6×6).
- **Day 3:** theme system (icon sets, color palettes per theme), daily seed,
  result/share screen.
- **Day 4:** practice mode, archive, stats.
- **Day 5:** RevenueCat + AdMob (reuse verbatim), paywall.
- **Day 6:** assets/icons, additional theme content, EAS config.
- **Day 7:** device QA, store listing, submit — this app has the most
  slack of any in either round; use spare time to add a second daily
  puzzle type (e.g., a timed "speed round") if Day 1–6 go smoothly.

---

## 6. Quiktap — daily reaction & focus test

**One-line pitch:** How fast are your reflexes today? A 30-second daily test
— tap the moment the screen changes, or tap targets as they appear — scored
in milliseconds, with a streak and a personal-best history.

### Why this, validated

Aim/reaction training is a large, active mobile category — Aimlabs alone
has surpassed 45M registered players across platforms including mobile, and
research turned up a healthy, currently-updated field of competitors
(TouchTrainer, Aim Trainer & Touch Test PRO, SuperAim, Aim Lab Mobile) all
targeting the same underlying appetite: people wanting a quick, quantified
read on their own reflexes.

### Why this and not the obvious clone

Every incumbent found in research is positioned at competitive FPS/mobile-
shooter players — crosshair drills, flick-shot training, "simulate in-game
scenarios." That's a narrower, more demanding build (aiming reticles,
weapon-style targeting) and a narrower audience. Position this app at the
much larger casual audience instead — the "Human Benchmark"-style single
daily test people do out of curiosity, not competitive practice — with the
one thing none of the FPS-trainer incumbents lead with: a **daily ritual and
streak**, turning "test your reflexes" from an occasional novelty into the
same kind of daily-habit loop as everything else in this portfolio. It's
also a much smaller build than the FPS trainers: no weapon models, no
scenario library, just two or three clean reaction-test formats.

### Core algorithm

```
src/logic/
  reactionTest.ts   pure state machine: idle -> waiting(randomDelayMs) ->
                     go(timestamp) -> tapped(reactionMs); tapping during
                     `waiting` is a false start (scored/flagged, not
                     silently ignored — a common frustration in weaker
                     competitor apps per their own descriptions)
  targetTest.ts       generateTargetSequence(seed, durationMs): pure list of
                       { x, y, spawnAt, expiresAt } — a fixed, seeded
                       sequence so the daily test is identical for every
                       player, not randomized per-session
  score.ts             percentile bucketing against the player's own stored
                        history (median reaction time is well-documented at
                        roughly 250ms for visual stimuli — used as a fixed
                        reference point in the UI copy, not fetched from a
                        server) — this keeps the MVP fully backend-free;
                        a global leaderboard is an easy Phase 2 once a
                        lightweight write-only endpoint is worth adding
  daily.ts             date -> seed -> which test format + its parameters,
                        shared streak module (port gridhabit's date/streak
                        logic verbatim, as every daily app in this
                        portfolio does)
```

### Screens

`app/index.tsx` (today's test, tap-to-start) → `app/result.tsx` (your time
+ percentile, share, streak) → `app/practice.tsx` (unlimited retries,
ad-supported) → `app/stats.tsx` (reaction-time history graph) →
`app/settings.tsx` → `app/paywall.tsx`.

### Monetization

| | Free | Pro |
|---|---|---|
| Daily test | ✅ | ✅ |
| Practice mode | ✅ (ad-supported) | ✅ (no ads) |
| Stats graph / history depth | last 14 days | full history |
| Ads | banner on home, interstitial every 5th practice run | none |

### One-week build plan

- **Day 1:** reactionTest/targetTest/score pure logic, tests (this is the
  smallest logic surface of any app in either round — budget extra time
  Day 1 for a third test format if time allows, e.g. a Simon-style short
  sequence-memory round).
- **Day 2:** timing-critical UI (the whole product lives or dies on input
  latency feeling honest — test on a real low-end Android device early, not
  just simulator, since simulator touch latency doesn't reflect device
  reality).
- **Day 3:** result screen (percentile framing, share card), streak.
- **Day 4:** practice mode, stats graph (a simple SVG line chart).
- **Day 5:** RevenueCat + AdMob (reuse verbatim), paywall.
- **Day 6:** assets/icons, EAS config, `check:release`.
- **Day 7:** device QA — specifically verify tap latency on the lowest-end
  Android device available, this is the one app where that number is the
  entire product — store listing, submit.

---

## Portfolio-level notes (round 2)

**Build order recommendation:** Flipnest first (smallest surface, warms up
the daily-seed + share-grid pattern with near-zero risk) → Toppl (also
small, introduces the SVG-camera-follow render approach that Poplet reuses)
→ Poplet (reuses Toppl's trajectory-geometry approach, adds the hex-grid +
solver layer) → Quiktap (small logic, but budget real device-testing time
for input latency) → Solari (the heaviest logic build — its solver is the
long pole) → Quandary last (content-authoring bottleneck like Wordflock,
can run in parallel with any of the above once the Worker/KV port from
WordDrop is done).

**Across both rounds, twelve app ideas now share one template.** This is
the point at which extracting the shared scaffold mentioned at the end of
`PLAN.md` (RevenueCat init, AdMob + consent flow, paywall screen, daily-seed
+ streak module, share-grid encoder, `check:release` script, EAS profiles)
stops being optional efficiency and starts being the difference between each
new app taking a week and taking two days — nine of these twelve apps reuse
the exact same "generate offline, ship deterministic index, streak, share
grid" skeleton with only the core logic module swapped out.

**Distribution reality check applies here too** (see `PLAN.md`): every
mechanic in this round is also a commodity in a large, proven genre, which
is what makes a one-week build possible — it also means installs, not
engineering, are the real bottleneck to success. Same guidance: budget UA
test spend, watch D1 retention against the puzzle/hyper-casual benchmarks
before scaling, don't build Phase 2 content until a launch clears that bar.

**Naming caveat repeated from `PLAN.md`:** all six names were checked
against live App Store/Google Play search results but this is diligence,
not proof of availability — run an actual name reservation and trademark
search before submission. Two near-misses worth flagging specifically:
"Toppl" is close to several existing "Stack"/"Top-" named apps (no exact
match found, but the naming space is dense) and "Quandary" returned no
exact match but is a common English word worth a direct trademark search
before committing.
