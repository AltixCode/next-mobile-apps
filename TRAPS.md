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
