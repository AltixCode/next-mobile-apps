# Task Instructions

Captured verbatim from the user request that kicked off this research, 2026-09-14.

## Original ask

> your task is to look at gridhabit gridlock-pop worddrop folder/repos in this Dev
> folder, and then do research and come up with at least 5 more mobile app ideas
> that are simple yet addictive so we could make them, in similar complexity and
> build them with ads and a paywall to remove ads permanently and maybe add some
> pro features. ideas should be validated and there should be a market for it and
> ideally claude max with unlimited tokens should be able to build each app from
> start to finish in one week or less. then you will write a full implementation
> plan for each app with full technical details and you will come up with modern
> and nice easy to remember names for each app ideally it should be taken already
> in app store

## Follow-up instruction (mid-task)

> save the instructions in .md format in a new folder called next_mobile_apps in
> the Dev folder

## Reference repos analyzed

- `/Volumes/Dev/gridhabit` — habit tracker, GitHub-style contribution grid
- `/Volumes/Dev/gridlock-pop` — 8x8 block-drop puzzle
- `/Volumes/Dev/worddrop` — daily word puzzle (Wordle-style)

Common stack: Expo (SDK 57) + React Native 0.86 + TypeScript (strict) +
expo-router, Zustand + AsyncStorage/SQLite for state, RevenueCat for IAP
(single lifetime "remove ads" non-consumable, entitlement `pro`), Google
AdMob (banner + interstitial, sometimes rewarded), pure/side-effect-free
game/logic layer with heavy unit-test coverage, EAS Build/Submit for
release. No backend for gridhabit/gridlock-pop; worddrop adds a tiny
Cloudflare Worker + KV for the daily global puzzle.

## Round 2 ask

> find 5+ more in similar style, similarly make implementation plans for
> them, validate the idea, maybe look into 2d games we could build with
> expo/rn that are addictive, or similar apps people would use. save ideas
> in the same /Volumes/Dev/next_mobile_apps/ folder

## Deliverable

A market-researched shortlist of new app ideas at the same complexity
tier, each buildable solo in ≤1 week, each with a full implementation plan
(architecture, monetization, build order) and a modern, memorable name.

- `PLAN.md` — round 1: Loopwits, PourSort, Foldup, Knotter, Wordflock, MineStreak
- `PLAN_2.md` — round 2: Toppl, Solari, Poplet, Quandary, Flipnest, Quiktap
