# Traps

Failures that a green test run does not catch. Each one cost a device pass to
find. Read this before the first build of a new app, not after.

## 1. A fix in `_template` does nothing for apps already generated

This is the trap that produced most of the others, and the most expensive one.

`bootstrap.mjs` renders `_template` into an app **once**. Nothing afterwards
compares the two. A fix made in the template reaches only apps generated after
it, and there is no signal that an app is behind.

It surfaced when Multitick's paywall sat on `Loading price…` forever: the
`offeringsResolved` fix had been in `_template` for some time, and **seventeen
of eighteen apps had never been regenerated**. Three of them — Splitjar, Spinwit,
Calcpair — had already passed a full device pass still carrying it, because none
of those passes happened to open the paywall.

    node scripts/check-drift.mjs            # every app vs. a fresh render
    node scripts/check-drift.mjs --fix      # re-render what drifted, create what is absent

Run it **before** starting an app and **after** any change to `_template`. Files
an app legitimately owns go in `drift-allow.json`; the `"*"` key covers the ones
that are per-app in every app. Keep that list short — `tsconfig.json` was on it
briefly, and that is exactly what would have hidden trap #3.

## 2. `expo-notifications` schedules *inexact* alarms unless you ask

`ExpoSchedulingDelegate.kt:106` calls `setExactAndAllowWhileIdle` only when
`AlarmManager.canScheduleExactAlarms()` is true; otherwise it silently falls
back to `setAndAllowWhileIdle`. With no exact-alarm permission the emulator gave:

    window=+1m29s997ms    on a 2-minute timer
    window=+18m44s991ms   on a 25-minute timer

and the notification genuinely arrived minutes late. Nothing errors, nothing
logs, and `scheduleNotificationAsync` resolves with an id either way.

Declare `USE_EXACT_ALARM` (auto-granted on API 33+, and the permission Play
intends for alarm and timer apps) plus `SCHEDULE_EXACT_ALARM` for API 31–32.
**Only for an app that is genuinely a timer or alarm** — Play reviews these
against what the app does. Use the per-app `androidPermissions` key in
`apps.json`, never the template.

Proof it worked: `window=0 exactAllowReason=policy_permission`, and the alert
posted at 14:35:57 for a 14:35:57 alarm.

## 3. `expo prebuild` rewrites `tsconfig.json`, and nothing fails

It reformats the file and drops `.expo/types/**/*.ts` and `expo-env.d.ts` from
`include`. That kills expo-router's generated route types — and **typecheck
still passes**, because the route types simply become `any`. `router.push('/nope')`
stops being an error and you find out on device.

Found in four apps that had already been device-tested. `scripts/check-tsconfig.mjs`
now guards it and `verify-all.sh` runs it. Still worth `git diff tsconfig.json`
after any prebuild.

## 4. Android Studio's bundled JDK breaks every RN native build

`JAVA_HOME` points at Android Studio's JBR, which is JDK 25. JDK 24+ prints a
JEP 498 restricted-method warning to stderr, and AGP treats *any* stderr from
the C/C++ configure step as the task failure:

    Execution failed for task ':react-native-worklets:configureCMakeDebug[arm64-v8a]'
    > WARNING: A restricted method in java.lang.System has been called

There is nothing wrong with the C++. Build with:

    JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home

`verify-app.sh` already forces this; anything run by hand does not.

## 5. Android takes sound and importance from the *channel*, not the notification

`content: { sound: true }` is ignored once a channel exists. With no channel of
its own, expo files alerts under `expo_notifications_fallback_notification_channel`,
which posts with `sound=null` — a timer that expires in silence.

Create the channel explicitly (`AndroidImportance.MAX`, `sound: 'default'`) and
pass `channelId` **on the trigger, not on the content** — it moved, and the
content-level property is a type error in SDK 57.

Verify from outside the app:

    adb shell dumpsys notification --noredact | grep -A12 "NotificationChannel.*<id>"

Look for `mImportance=5` and a non-null `mSound`.

## 6. `du -sh` on a symlink tells you the size, not the volume

`~/Library/Developer/Xcode/DerivedData` is a **symlink to
`/Volumes/ExtremePro/DevCaches/DerivedData`**, and so are `~/.gradle`, the npm
and CocoaPods caches. `du` follows the link, so a home-directory path reports
133 GB that is not on the boot volume at all. Deleting it would have freed
nothing that was short and destroyed every app's incremental build cache.

`ls -ld` the directory before trusting any figure about where space went.

## 7. Test-harness artifacts are not app bugs — but prove which it is

Automation lies in specific, recognisable ways:

- `uiautomator dump` fails outright while an animation is running, so an app
  with a ticking display must be read from screenshots.
- `idb ui tap` coordinate presses are intermittently swallowed; `--api ax`
  (accessibility press) is deterministic. A chip that "does not respond" is
  usually the harness. Prove it by tapping a known-good control in the same run.
- A missed tap sends text to whatever has focus — that is where
  `"label":"Add a timer"` and `PizzaSushi` entries come from.

The rule that resolves all of these: **read the result back from outside the
app** — storage, `dumpsys`, the view hierarchy, the clipboard — never from the
app's own screen.

## 8. `zsh` does not word-split an unquoted variable

    SLUGS="a b c"
    node scripts/regen-file.mjs path $SLUGS     # matches ONE app named "a b c"

It reported `0 file(s) re-rendered` and a follow-up audit loop over the same
empty list printed a cheerful "all patched". Pass slugs as explicit arguments.

## 9. A gate that exists is not a gate that runs

`check-paywall-copy.mjs` — the one check standing between a paid claim and a
feature that does not exist — ran only in the local `verify-all.sh`. The CI
workflow enumerates its steps by hand and simply never called it. `check:release`
does not call it either; that is `check-release-config.ts` alone.

The proof was rectap: a scaffold whose paywall was four claims about features it
does not have went **green in CI twice**, while `npm run verify` refused the
identical commit. Nothing was broken and nothing was reported. The step was
absent, and an absent step looks exactly like a passing one.

Two habits that catch this class:

- When you add a gate, **add it to CI in the same change**, and prove it by
  watching it fail once on a case you know is bad. A gate never seen red has
  never been shown to work.
- `verify-all.sh` and `ci.yml` are two hand-maintained lists of the same
  intent. Whenever one gains a step, diff them.

## 10. Stale data reads exactly like fresh data

Three variants of one bug in a single day, between three sessions:

- `_shared/admob-ids.tsv` listed one wave of apps and said nothing about its own
  scope. Checking seventeen slugs against it returned zero matches, which was
  read as "AdMob does not exist for these apps" and written into the portfolio
  record. All thirty-four records existed, with ad units, and every repo already
  had the identifiers as CI secrets.
- A RevenueCat audit read `items` off the wrong level of a `{"data":{"items":…}}`
  envelope, got `None`, coerced it to `[]`, and reported "0 apps need Apple
  credentials" while the CLI was plainly saying 44 did.
- A watcher process backgrounded with `&` inside a tool call died with its
  shell. Its results file stopped updating and kept serving old contents, which
  looked precisely like a slow CI queue.

None errored. All three produced a clean, confident, wrong answer.

**If a check finds zero problems, prove the check can find one** — point it at a
case you know is broken before believing a clean result. And prefer the account,
the API or the process over any local file that claims to describe them.

## 11. `runs-on: [macOS, ARM64]` does not mean the host can sign an iOS build

An iOS release build needs Xcode, CocoaPods, **and the Apple Distribution
certificate sitting in that specific machine's login keychain**. None of those
are implied by the runner labels, so adding a third Mac to the pool made iOS
builds *less* reliable rather than more: jobs began landing on a host that had
never been set up, and failed at "Install CocoaPods" — or earlier, at codesign.

Pin iOS jobs to a capability label (`ios-signing`) on the machines that are
actually provisioned. Android and device-free jobs can stay on plain
`macOS, ARM64`: `setup-java` and `setup-android` bring their own toolchains and
genuinely do not care which host they get.

Related, and the reason this is filed next to the keychain trap:
`errSecInternalComponent` from codesign is **the keychain, never the
certificate**. A runner started by launchd does not inherit the interactive
session's keychain, so the private key cannot be used and nobody is there to
answer the prompt. Go straight to the keychain; do not spend time on the
certificate, the provisioning profile, or whichever framework it happened to be
signing when it gave up.

---

## `rc setup apple` is broken, and the purchase key it was for is account-level

Two separate traps that meet in the same place.

**The command.** `rc setup apple` signs in to Apple as a person and starts by
reading Apple's auth service key from
`appstoreconnect.apple.com/olympus/v1/app/config?hostname=itunesconnect.apple.com`.
Apple removed that route. It answers `404 request rejected` before any
credential leaves the machine, for every account, on rc 0.1.2 — verified
2026-09-15 with no cookies at all, while `/olympus/v1/session` still answers
401, so the service is up and the route is gone. If you see that 404, stop:
it is not the Apple account, not the password, not 2FA, and no amount of
re-authenticating will move it.

**The key.** What that command was going to install is the **In-App Purchase
key**, and without it a purchase succeeds on the device and never resolves to
an entitlement — the person pays and the ads stay, invisibly, until someone
actually buys. It is *not* `AuthKey_*.p8` (that is the App Store Connect API
key, a different artifact for a different job).

The key is **account-level**, so one key already covers every app in the
portfolio and a new app needs no new key. RevenueCat's v2 API takes it
directly, no Apple sign-in at all:

```bash
cd /Volumes/ExtremePro/Dev
python3 scripts/ship/rc-apple-credentials.py            # what is missing
python3 scripts/ship/rc-apple-credentials.py --apply    # fix it
```

Two ways to get it silently wrong:

- **Nothing needs passing.** The keys and ids come from `~/Certificates`
  (one issuer id serves both key types; `issuerID.txt` holds it), so the whole
  command is `python3 scripts/ship/rc-apple-credentials.py --apply`.
- **RevenueCat validates none of it.** A random P-256 key with an invented key
  id and issuer is accepted and reads back `subscription_key_configured: true`.
  A green run proves the field is set, never that the key is right. Only a
  sandbox purchase does.

And `RC_API_KEY` from `~/.zshrc` is scoped to HushTunnel alone — a v2 secret key
cannot span projects. Prefix anything touching another project with
`env -u RC_API_KEY`, which falls back to the profile's OAuth login.

Full detail: `docs/agents/05-payments-revenuecat.md` §7 and
`~/Certificates/README.md`.


## 12. A listing that quietly covers less than it claims

Trap #10 was stale data reading as fresh. This is its sibling: a *complete-looking
list that is only the first page*, and it has now appeared three times here.

- `rc --all` means "show experimental commands in `--help`". It does **not**
  mean "fetch all pages". A RevenueCat audit built on it would have silently
  skipped every project past the first page the moment the portfolio outgrew
  one — and reported a clean result while doing it. The v2 API pages with
  `next_page` / `starting_after`; follow it.
- `asc.py`'s own `paged()` exists for the same reason, and its docstring records
  the original: "a list read from page one is not the list" — five Play records
  reported where eight existed.
- `_shared/admob-ids.tsv` listed one wave of apps and said nothing about its
  scope, which produced a confident "AdMob exists for none of these" about
  thirty-four records that all existed.

In every case the wrong answer arrived with no error, no empty output and no
warning. A truncated list is indistinguishable from a short one unless you check
for the cursor.

**Whenever you read a collection you did not write: find out how it paginates
before you trust a count.** And if the count is used to decide that nothing is
wrong, see #10 — prove the check can find a fault first.

## 13. Name the thing you are measuring, then ask if it is the thing you want

Asked "how many apps lack a build pipeline?", three commands gave three answers,
all produced without error and two of them wrong:

- counting apps with no file named `deploy.yml` → **18**. That measures a
  *filename*.
- grepping for `xcodebuild archive` → **14**. That measures *one mechanism*, and
  drops two apps whose EAS Build + EAS Submit pipelines never call xcodebuild.
- counting apps with neither a self-hosted archive nor an EAS build → **12**,
  which was the real answer.

Each result looked authoritative. The failure is not in the shell: it is
answering a question about a *capability* by measuring a *proxy* for it — a
filename, a tool name, a directory — and then reporting the proxy's number as
though it were the capability's.

Before you report a count, say out loud what it counts. "Apps with no file named
deploy.yml" is obviously not "apps that cannot build", the moment it is said
that way rather than written as a number.

## 14. "No profiles were found" can mean Apple was down, not that a profile is missing

Solari's archive failed with:

    error: No profiles for 'com.altixcode.solari' were found: Xcode couldn't
    find any iOS App Development provisioning profiles matching ...

which reads as a provisioning problem and sends you to the developer portal.
Four lines above it in the same log:

    DVTServices: ... Error = "Communication with Apple failed"
    A non-HTTP 200 response was received (503) for URL
    https://appstoreconnect.apple.com/xcbuild/.../listTeams.action

**Automatic signing with `-allowProvisioningUpdates` needs Apple reachable.**
When `listTeams` returns 503, Xcode cannot fetch or create the profile, and the
only error it surfaces is the downstream one. The profile was never missing;
Apple was briefly unavailable. The fix is to re-run, and nothing else.

This is the same shape as the `CODE_SIGN_IDENTITY` episode earlier the same day:
automatic signing appeared to pick the Development certificate, which looked
like a signing misconfiguration and was actually a symptom of a locked keychain.
**Read upward from the error for the first thing that went wrong**, not the last
thing that complained — the loudest message is usually the furthest downstream.

A practical note for reading these at all: `gh run view --log-failed` refuses
while the *run* is in progress, even when the job you care about finished
minutes ago. `gh api /repos/<repo>/actions/jobs/<job_id>/logs` serves a finished
job's log immediately, and needs `--allow-escape-sequences` plus a
`sed 's/\x1b\[[0-9;]*m//g'` to be readable.

---

## 15. Two states sharing a fill is not yet a defect

A scan that compares the two `backgroundColor` values of a two-state control
and flags the pair below 3:1 finds real bugs — and mostly finds false ones. Of
six such hits across the portfolio, **one was genuine**.

Dicewit's scorecard was the genuine one: a used category differed from an unused
one by 1.13:1 **and nothing else** — worse, its label was dimmed with
`tone="muted"`, so the single fact a scorecard exists to convey was the least
legible thing on screen.

The other five were not:

| App | Fill pair | What actually marks the state |
|---|---|---|
| knotter | 1.09 | accent border, 5.34–6.87:1, plus a star row |
| foldup | 1.11 | accent border, 4.44–10.50:1 |
| poursort | 1.15 | accent border, 4.73–9.42:1 |
| loopwits | 1.11 | not two states at all — two sibling nav buttons |

Loopwits is the sharpest lesson: the two fills the scan compared belong to the
Archive and Settings buttons. They are the same colour because they are the
same state. The scan had inferred a state machine that does not exist.

**WCAG 1.4.11 asks whether the state is distinguishable, not whether the fill
carries it.** A border, an icon, a badge or a text change are each a complete
answer. So before reporting a fill pair, name the control, enumerate *every*
channel that differs between its states, and measure those. Reporting the fill
alone sends someone to repaint a control that was already correct — and
`tone="muted"` on a state that is information rather than a disabled control is
the defect worth looking for instead.

Same shape as the Ringaway `avatar: {width:132,height:132}` false positive: a
scan matched a pattern, not the property the pattern was a proxy for. See
trap #12 — name the thing you are measuring.

---

## 16. A clean drift report says nothing about apps drift cannot see

`check-drift.mjs` compares generated apps against `_template`. It knows only
the apps it generated. Fourteen apps in this portfolio predate the template,
and for those it reports nothing at all — not "missing", not "absent", nothing.

So it reported **0 absent** while fourteen apps had no `check-paywall-copy.mjs`
and no `check-locale-scripts.mjs` — no paywall gate and no mixed-script gate,
on apps that ship. The tool was working correctly and the conclusion drawn from
it was false, which is the dangerous combination.

Both questions are worth asking separately, and the second one is the one that
looks fixed when it isn't:

- which apps are **missing** a gate, and
- which apps **have** the file but never **run** it.

Present-but-unwired is the worse case: the script sits in `scripts/`, greps
clean, and never executes. Check the wiring (`package.json`, `verify-all.sh`),
not the file listing.

The rule: **a gate's coverage is the set of apps it actually ran in, not the
set it was copied into, and never the set some other tool happened to enumerate.**

---

## 17. A passing unit test is not a wired feature

Six apps called `shouldShowInterstitial({ gamesPlayed: 1, ... })` while their own
`MIN_GAMES_BEFORE_FIRST_INTERSTITIAL` was `2` and the policy rejects anything at
or below it. The branch was dead in every one: no interstitial could ever appear,
while all six paywalls sold *"the banner and the full-screen ad are gone for
good"* — a claim the buyer pays for, about an ad that did not exist.

**Every one of those apps had a passing `adPolicy.test.ts.`** The policy was
never the broken part. It was tested against its own inputs, in isolation, and
was correct about every one of them. Nothing tested the call site, so the
wiring could be nonsense and the suite stayed green — and a green suite is
exactly what stops anyone looking.

Wordflock was the same defect one step further along: `showInterstitial` had
*zero* call sites. Preloaded on every launch, shown never, 0% impressions.

Two things follow:

1. **Test the call site, not only the unit.** "Does the policy return false for
   these arguments" and "can this feature ever happen in the product" are
   different questions, and only the second one is what the paywall is selling.
2. **When a claim is on the paywall, the test belongs to the claim.** Money is
   the forcing function: if the copy says the ad goes away, something must prove
   the ad was there.

`scripts/check-ad-wiring.mjs` now fails an app whose play count is a literal
that can never clear its own minimum, or that imports `showInterstitial`
without ever invoking it. Confirm a new gate fails on the original defect
before trusting it — a gate that passes everywhere may be passing vacuously.

Same family as trap #12 and trap #15: a thing that is correct in isolation
proves nothing about the property you actually care about.

---

## 18. A documented impossibility is evidence about the day it was written

`asc.py` carried a note explaining that internal TestFlight groups cannot be
created by API — that `POST /v1/betaGroups` answers `isInternalGroup: false`
however you ask and silently makes an external duplicate instead. `ship.py`
printed `no internal group -- create one in App Store Connect (the API cannot)`
and stopped.

It is creatable. The group reads back from a *fresh GET* as
`isInternalGroup: true`, takes testers, and takes builds.

**Seventeen apps had processed, ready builds that nobody could install**, for
as long as that note went unchallenged. The cost of testing it was one request.

Two rules come out of this, and the second is the less obvious one:

1. **Re-probe a refusal before building around it.** A note describing what an
   API cannot do is a measurement, with a date on it. Treat it the way you would
   treat any other stale cache: cheap to revalidate, expensive to trust.
2. **Read the field back on a refusal, not only on a write.** We already had
   "a successful write means nothing, read the field back". The mirror case is
   the same bug: the *create response* echoed `isInternalGroup: false`, which is
   precisely the lie the old note was warning about — and believing that echo is
   how the wrong conclusion got written down in the first place. A fresh GET
   told the truth in both directions.

The general shape: a workaround outlives the thing it worked around, and nothing
ever re-runs the experiment because the note reads like a fact rather than an
observation.

---

## 19. A cancelled run does not mean somebody cancelled it

Runs in two repos showed up `cancelled`. Neither session had cancelled
anything — one of us had actually been *refused* permission to cancel runs and
had honoured that — so `cancelled` looked like a third party acting on the
account.

It was the workflows cancelling themselves:

- `ci.yml` sets `group: ci-${{ github.ref }}` with `cancel-in-progress: true`,
  so a newer push kills the older CI run outright.
- `deploy.yml` sets `group: release-${{ github.repository }}` with
  `cancel-in-progress: false` — **and still produces cancellations**, because
  GitHub keeps only *one pending run per concurrency group*. A newer release run
  entering the group cancels the older **pending** one; anything already in
  progress is left alone.

That second one is the trap. `cancel-in-progress: false` reads like "nothing
gets cancelled", and it means only "nothing *running* gets cancelled". The
queue still gets superseded.

So before concluding that someone or something is interfering with a repo, read
the `concurrency:` block of the workflow. The behaviour we were about to go
asking for permission to perform by hand was already built in.

General form, and the reason this sits next to trap #12: **an event's name is
not its cause.** `cancelled` is a state, not an actor.

**And the sharper version, found by dev-3a:** a repo pushed to faster than the
queue drains **never builds at all**. Wordflock had **8 cancelled runs and zero
successes** — every push superseded the previous pending build before a runner
ever freed up. The concurrency group was working exactly as designed the entire
time, and the app simply had no build, ever.

Nothing about that looks wrong from the outside. There is no failure, no error,
no red job to investigate: just a run history of cancellations that each have a
perfectly good explanation. The repo looks busy and healthy while producing
nothing.

So when a repo has no successful build, check whether it has been *starved*
rather than assuming it has not been tried. And if you are pushing repeatedly
to a repo whose queue is deep, expect that none of those pushes built — the
last one only builds if a runner frees up before the next push lands.

---

## 20. A capture that succeeds is not a capture of the right thing

Three ways a device pass reported success while proving nothing. All three were
found in one evening, by dev-3a, driving simulators through `idb`.

**A stale Metro server answers for an app that no longer exists.** An
`expo start` left over from before the repo move — serving a path that had since
been deleted — was holding port 8081 and answering every bundle request with a
ConfigError. The app under test showed its launch screen and stopped there,
which is indistinguishable from the crash we were actually hunting. Before
concluding anything from an app stuck on its splash, check what owns 8081.

**An almost-empty accessibility tree is not an empty screen.** With the UMP
consent sheet up, `idb ui describe-all` returned a single element — the app name
— because the Google consent sheet is a separate window idb does not enumerate.
That was polled for 160 seconds and nearly called a hang. A screenshot showed a
fully rendered game with the dialog on top. The ATT prompt that follows *is*
visible to idb, so this is specific to the UMP sheet. **Screenshot and look; use
`describe-all` as a hint, never as a verdict.**

**A tap that hits a label still produces a valid screenshot — of the previous
screen.** "Your answers" was a heading rather than a button, so the navigation
never happened. The capture wrote two byte-identical PNGs and reported both as
successes.

Nothing failed, and that is the point. The tap landed on a real element. The
screenshot was taken. The PNG was valid and correctly sized. Every step
returned success, and the check was passing without checking anything — the
same shape as an `adPolicy` test that passes while its call site is dead code,
and as a paywall gate that reads an i18n file an app does not have.

The fix is to assert the property rather than the step: hash each shot and
refuse duplicates. Comparing file sizes by eye caught it once and does not
scale to two dozen apps, and a store listing carrying the same image twice is
a rejection rather than a blemish.

**The general rule for a capture: a screenshot proves the harness ran, never
that it went where it was told.** Assert on what distinguishes the screens —
a hash, an element that exists only on the destination — before believing the
navigation happened.

The common shape, and the reason this sits beside traps #15 and #16: **every one
of these is a check that ran and passed without checking the thing it was for.**
A green result from a device pass means "the harness completed", which is a
different claim from "the app works". Ask what would have to be true for this
pass to be lying, and then go and look at the pixels.

Related: the same evening, a Debug launch was recorded as "launches and runs
fine" on the strength of a live pid and an evaluated JS bundle, with nobody
looking at a frame. Same error, in a status report rather than a script.

---

## 21. A 404 that says "no such resource type" may mean you built the URL wrong

`asc.call()` prepends `/v1` to any path that is not already a full URL. A PATCH
written as `call("PATCH", "/v1/appStoreVersions/<id>")` therefore goes to
`/v1/v1/appStoreVersions/<id>` and comes back:

```
404: path does not match a defined resource type
```

That message reads as a statement about the *resource* — this version does not
exist, or this type is not patchable — and not about the URL. Four apps reported
FAILED and the conclusion very nearly drawn was that `releaseType` is not
settable through the API at all. It is; the field changed on the first attempt
once the path was right.

Two rules:

1. **Pass a full URL for anything that is not a plain `/v1/` path**, so the
   helper's prefix cannot double up. Any convenience wrapper that rewrites paths
   will eventually produce a URL you did not intend.
2. **When an API says a resource does not exist, print the URL you actually
   called before believing it.** The request you sent and the request you think
   you sent are different objects, and only one of them is in the log.

This is the same family as trap #18: an API's refusal was read as a fact about
the world rather than as a fact about the request. There, a note recorded that
internal TestFlight groups could not be created, and seventeen apps sat
unreachable for want of one re-probe. Here, a malformed path nearly closed off
the field that stops an unreviewed binary shipping straight to users.

Found by dev-3a, who read it back from the API rather than trusting the PATCH
response — which is what turned "four apps FAILED" into a one-character fix.

---

## 22. A field that shows your text but does not filter is not a broken search

The AdMob console's app list has 89 rows, 15 to a page, and the paginator
resists automation: synthetic clicks do not advance it, sort and page URL
parameters are ignored, and `document.querySelectorAll('button')`
intermittently returns nothing while `[role="row"]` works — the grid is
probably inside a shadow root the button query misses.

An hour went into paging. The answer was not to page at all: **search**. And the
reason search appeared broken first time is the trap:

Setting `input.value` and dispatching a synthetic `input` event **puts the text
in the box and filters nothing**. The grid listens for real key events. So the
screen shows exactly what a working search would show — the query sitting in the
field — and the unchanged results read as "no matches" rather than "your
keystrokes never happened". Driving it with a real typing tool (`slowly: true`,
so each keystroke is a genuine event) returned `1 - 2 of 2` instantly.

The general form: **a UI that reflects your input has not necessarily received
it.** Value and event are separate things, and only one of them is visible. When
a search, filter or autocomplete appears to return nothing, prove the widget saw
the keystrokes before believing the result set.

There is a second lesson stacked on the first, and it is the more expensive one.
The whole search was for two AdMob apps believed not to exist. A count settled
it without any console at all: 44 apps × 2 platforms = 88, and the account held
**89**. The apps existed; they had simply never been found. **An hour of
automation went into a premise nobody had spent thirty seconds checking** — and
had the "create them" path been taken instead, it would have put four duplicate
apps into a live ad account.

Before automating a search for something, count what you expect to find.

Console findings by dev-3a; the arithmetic came from the other side of the pair,
which is rather the point.

---

## 23. A queued run carries the secrets it was queued with

Six apps shipped binaries with `GADApplicationIdentifier = "-"`. The repository
secrets were corrected, the runs were already queued, and the reasoning was:
secrets resolve when a job starts, so the queued runs will pick up the new
values. That reasoning is wrong, and minestreak proves it:

```
ADMOB_IOS_APP_ID set   21:30:00
iOS job STARTED        21:49:24   <- nineteen minutes after the secret changed
iOS job succeeded      21:55:23
run created            19:07:50   <- before the secret changed
binary produced        GADApplicationIdentifier = "-"
```

A job that began nineteen minutes after the update still built with the old
value. The only thing predating the change is the **run creation**.

**A run binds its secrets when it is created.** Fixing a secret does nothing for
work already in the queue; those runs must be re-dispatched.

This is a quiet failure, which is what makes it worth writing down. Nothing errors.
The secret is genuinely fixed, the run is genuinely queued, the job genuinely
succeeds — and an hour later it uploads a binary containing the value you
replaced. Every intermediate signal says the problem is solved.

**So: after changing a secret, re-dispatch anything already queued, and compare
the run's `createdAt` against the secret's `updated_at` before trusting a build
that came out of the queue.** `gh secret list` prints the timestamp, and
`gh run list --json createdAt` prints the other.

The corollary is the reason this was caught at all: **read the value back out of
the artifact.** A secret that never reached the build looks exactly like one
that did, from every angle except the binary:

```
plutil -extract GADApplicationIdentifier raw <App>.app/Info.plist
```

Take the reading *before* the fix as well as after. Without the before, "it says
the right thing now" cannot be distinguished from "I was looking at a different
artifact" — which is a mistake already made once tonight, reading a path instead
of a bundle identifier.
