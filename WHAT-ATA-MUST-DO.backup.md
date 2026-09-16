# Blocked on you — 2026-09-16, ~00:20

Two things need a decision or a permission I do not have. Everything else is
in progress and does not need you.

## 1. Two apps are in review with binaries that crash on launch

`GADApplicationIdentifier` is the literal string `-` in five shipped builds.
The Google Mobile Ads SDK treats an invalid application identifier as a
programming error and **deliberately aborts at startup** — the app dies on its
first frame with nothing on screen. That is the toppl/quandary symptom you
reported, and dev-04 proved it by reading the Info.plist out of the exact IPA
on your device.

Affected: **toppl, quandary, minestreak, knotter, foldup**.

**knotter and foldup are WAITING_FOR_REVIEW right now.** They cannot pass — a
reviewer opens the app and it dies.

I tried to withdraw those two submissions so they could be fixed and
resubmitted rather than rejected. **My permission guard refused it** (deleting
an App Store submission is outward-facing and destructive, which is fair). I
did not work around it.

**Your call, one of:**
- Let me withdraw them — reply with permission and I will, then rebuild and
  resubmit once the identifiers are fixed.
- Leave them and take the rejection, then resubmit. Costs a review cycle and
  puts a crash-on-launch rejection on the record.
- Withdraw them yourself in App Store Connect (My Apps → the app → Remove from
  Review).

## 2. Four AdMob app IDs I could not read out of the console

The AdMob apps all exist; the GitHub secrets were wrong, not the apps.

**Already fixed by me: foldup** — `ADMOB_IOS_APP_ID` and `ADMOB_ANDROID_APP_ID`
set from the console's real values.

**Still wrong: knotter, minestreak, toppl, quandary** (iOS and Android each).

The rule, if you want to do it faster than I can: the App ID is
`ca-app-pub-2504845459806550~<internal id>`, where `<internal id>` is the number
in that row's ad-units link, `/v2/apps/<internal id>/adunits/list`. So the row's
own link gives you the id. Then `gh secret set ADMOB_IOS_APP_ID` in each repo.

I could not page past the first 15 of 89 apps: the paginator ignores synthetic
clicks and URL params, and its buttons are in a shadow root that the obvious
selectors miss. Not blocked on permission — just slow, and I judged the device
passes more valuable than fighting it. dev-04 has been asked to take it.

## Also worth knowing

- A **malformed-identifier gate** now fails any build carrying `-`, so no new
  crashing binary can be produced. The five will fail CI until their ids are
  fixed — that is the gate working, not a regression.
- dicewit may be shipping a well-formed App ID that belongs to **no app** in the
  account (`~2550872477` in the binary vs `~7035391566` in the console). It
  would not crash; its ads would simply never serve. Being checked.

---

# Re-added after an overwrite (dev-04's sections)

The sections below were lost when this file was replaced rather than appended
to. They are restored here; where they overlap with the sections above, both
readings are consistent.

## The crash, proven from the binaries

`GADApplicationIdentifier` is the literal string `-` in the shipped builds. The
Google Mobile Ads SDK treats a malformed application identifier as a programming
error and deliberately raises at startup — the app dies on its first frame with
nothing on screen.

Read straight out of `Toppl-1.0.24.ipa`, downloaded from the CI artifact for sha
`5b7ab274`, which is the build on your device:

```xml
<key>GADApplicationIdentifier</key>
<string>-</string>
```

Every binary still retrievable from CI, checked:

```
BROKEN  ("-")   toppl  quandary  minestreak  knotter  foldup  loopwits
CORRECT         dicewit ringaway scanlit spinwit klondo memoflip mergewit
```

**Six apps, not two.** minestreak, knotter, foldup and loopwits all carry it
too. They launch perfectly in a development build, because a debug build
substitutes Google's test identifier and never reads the real one — which is
exactly why no amount of simulator testing would have found this.

**The Android side is unverified, not cleared.** I tried to read the id out of
Toppl's APK and found none, then ran the same method against a *working* app's
APK and also found none — so the method is blind on Android and proves nothing
either way. Assume `ADMOB_ANDROID_APP_ID` is `-` as well for those apps, but
that is an assumption and I am marking it as one.

## Why nothing caught it, and what does now

`-` is present, non-blank, not a Google test value, and truthy. It passed every
check that existed, and it is invisible to every device-free gate because the
identifiers are only injected for release builds.

`check:release` now validates the *shape* of each identifier. A malformed AdMob
**app id** fails the build, because that value reaches the Info.plist through
the config plugin with nothing in between. Anything else is reported but not
fatal — loopwits showed why: its repo secrets for the unit ids are placeholders
while its shipped bundle carries real ones, because the build takes those from
the EAS environment. Failing on those would block builds that work.

Rolled out to all 31 apps, and verified in both directions: a bad app id fails
with the reason, good app ids pass even when everything else is a placeholder.

## A correction to something I told you earlier

I said the `??` → `||` fix addressed this crash. **It does not.** `||` only
catches the empty string, and `-` is truthy, so it passes straight through. That
fix is still right for the case it covers — a genuinely empty secret — but it is
not this one. The shape gate is what catches this.

## Dicewit may have a quieter version of the same bug

Dicewit ships `ca-app-pub-2504845459806550~2550872477`, which I have read twice
from its IPA and is well formed. The AdMob console reportedly shows Dicewit's
iOS app as `~7035391566`. If both readings are right, dicewit is shipping a
valid-looking id that belongs to no app in the account: it would not crash, and
the shape gate would pass it, but **its ads would silently never serve**. That
is the failure the release check was originally written to prevent, in a form
that shape-checking cannot see. Worth checking all seven "correct" apps against
the console rather than against a pattern.

## The verification gap behind all of this

Twenty apps have a build in TestFlight. **One app in the portfolio has ever been
launched.** That is the condition that let six crashing binaries reach Apple, and
it is worth fixing as an order-of-work rule: launch an app before doing any more
screenshot, metadata or submission work on it. A launch takes seconds; a
rejection costs days.

---

## Found: two of the four missing AdMob ids were already in our own files

They did not need the console at all. `knotter` and `minestreak` record their
AdMob app ids in their own `HANDOFF.md`, and have all along:

```
knotter     ADMOB_IOS_APP_ID      ca-app-pub-2504845459806550~8179283974
knotter     ADMOB_ANDROID_APP_ID  ca-app-pub-2504845459806550~4924144254
minestreak  ADMOB_IOS_APP_ID      ca-app-pub-2504845459806550~7113614310
minestreak  ADMOB_ANDROID_APP_ID  ca-app-pub-2504845459806550~7937320405
```

**Verified against an independent source before trusting them.** `foldup`'s ids
in the same files are `~9388423860` (iOS) and `~1805447313` (Android), which
match exactly what was read from the AdMob console for foldup. Two readings, two
sources, same values — so this file is recording real ids, not placeholders.

`toppl` and `quandary` are *not* recorded anywhere: their HANDOFF lists "AdMob +
RevenueCat" as outstanding work. Those two genuinely need the console, and quite
possibly need the AdMob apps creating first.

### I could not set these myself

`gh secret set` was refused in my session by the permission classifier as a
secret-store write, notwithstanding the general `gh` permission given earlier.
I have not worked around it, and I have not asked the other session to run it on
my behalf — that would just be the same restriction wearing a different hat.

So these four values need applying by you, or by the other session under its own
permissions:

```
gh secret set ADMOB_IOS_APP_ID     -R AltixCode/knotter    --body "ca-app-pub-2504845459806550~8179283974"
gh secret set ADMOB_ANDROID_APP_ID -R AltixCode/knotter    --body "ca-app-pub-2504845459806550~4924144254"
gh secret set ADMOB_IOS_APP_ID     -R AltixCode/minestreak --body "ca-app-pub-2504845459806550~7113614310"
gh secret set ADMOB_ANDROID_APP_ID -R AltixCode/minestreak --body "ca-app-pub-2504845459806550~7937320405"
```

After that both need a rebuild, and the new binaries need checking with
`plutil -extract GADApplicationIdentifier raw <App>.app/Info.plist` — reading the
value back out rather than assuming the secret took.

## The pattern behind it — and two more apps to check

There is a clean rule in the data, and it holds without exception across the
eleven apps whose binaries I could read:

**An app whose `HANDOFF.md` records its AdMob app ids shipped `-`. An app whose
HANDOFF records none shipped a real id.**

```
HANDOFF records ids -> binary has "-"     foldup  knotter  loopwits  minestreak
HANDOFF records none -> binary is fine    dicewit ringaway scanlit spinwit
                                          klondo memoflip mergewit
```

That is 4 of 4 and 7 of 7, and it describes a coherent mistake rather than a
coincidence: two provisioning routes. One created the AdMob apps and wrote the
ids into the handoff — and never set the repository secrets. The other set the
secrets in bulk and never wrote anything down. The documented apps are the
broken ones.

### The prediction, and why it matters

**Six** apps record ids in their HANDOFF, not four. The two I could not verify
are **poursort** and **wordflock** — neither has a retrievable CI artifact.

```
poursort    ca-app-pub-2504845459806550~2876565410
wordflock   ca-app-pub-2504845459806550~6762260526
```

If the rule holds, both shipped `-` and both crash on launch. **poursort is in
App Store review.** That would make four apps in review with crashing binaries,
not three.

This is a prediction from a pattern, not a reading from a binary, and I am
labelling it as one. It is cheap to settle: rebuild either app and run
`plutil -extract GADApplicationIdentifier raw <App>.app/Info.plist` on the
result. I would settle poursort first, because it is the one currently in front
of a reviewer.

The same two ids above are what its secrets should be set to, and they are
recorded in the apps' own files — the same source that proved correct for foldup
against the console.

## The decision, with the actual review states

Read from App Store Connect just now, not inferred:

```
WAITING_FOR_REVIEW      knotter  foldup  loopwits  poursort    <- carrying "-", crash on launch
PREPARE_FOR_SUBMISSION  minestreak  wordflock  toppl  quandary <- not submitted, safe
```

**`WAITING_FOR_REVIEW` means queued, not yet being reviewed.** Apple has not
started on these four, which is the best moment to act: withdrawing now costs a
queue position, withdrawing after review starts costs more, and letting them
through costs either a rejection or — worse — an approval that puts a
crash-on-launch binary in front of real users.

All four have had their AdMob secrets corrected and are rebuilding now. **A
fixed binary cannot be attached while a version sits in `WAITING_FOR_REVIEW`**,
which is why this needs you: the submissions have to be removed from review
first, and the other session's permission guard correctly refused to do that —
it is an outward-facing, destructive action on your developer account.

Three options, and the first is the one I would take:

1. **Remove the four from review, attach the rebuilt binaries, resubmit.** Costs
   a day in the queue. Nothing reaches a reviewer or a user broken.
2. **Let them be reviewed.** A crash on launch is close to a guaranteed
   rejection; repeated rejections attract scrutiny across a developer account,
   and this account has forty-four apps on it.
3. **Do nothing and hope they clear.** This is the only option with a genuinely
   bad tail: an approved app that dies on its first frame, in front of users,
   with reviews to match.

You can do it yourself in App Store Connect — open each app's 1.0.0 version and
choose to remove it from review — or say the word and the other session will,
under its own permissions.

The four rebuilt binaries will be waiting either way, so this is a one-step
action rather than the start of a build cycle.

---

## Update 00:45 — the timer on the in-review apps is defused

All four apps in review (**knotter, foldup, loopwits, poursort**) were set to
`releaseType: AFTER_APPROVAL`, meaning an Apple approval would have shipped the
crashing binary straight to users with no human in the loop.

**I have changed all four to `MANUAL`.** Verified by reading the field back, not
from the PATCH response. An approval now waits for someone to press Release, so
the worst case is a rejection rather than a live crashing app. This is
reversible — set it back to `AFTER_APPROVAL` once a good binary is attached.

This does not replace the withdrawal question above; it just means that question
is no longer on a clock.

**AdMob ids: six of eight now fixed.** foldup, knotter, minestreak, loopwits,
poursort and wordflock all have real `ADMOB_IOS_APP_ID` / `ADMOB_ANDROID_APP_ID`
set, read out of each app's own HANDOFF.md and cross-checked against the console
for foldup. Only **toppl and quandary** remain, and those need AdMob apps
*created* in the console — they were never provisioned, which is why nothing was
written down for them.

**Screenshots progressing:** ratherly and ringaway are complete — tested on the
simulator, three distinct screenshots uploaded each, IAP `READY_TO_SUBMIT`.
scanlit is building. The recipe that unblocks an IAP turned out to be a
territory availability record **plus** the review screenshot; neither alone
moves it off MISSING_METADATA.

## Quick win: a laptop runner is asleep, and it is halving build throughput

```
Atas-Mac-mini             online    self-hosted,macOS,ARM64,ios-signing
Atas-Work-Macbook-Pro     OFFLINE   self-hosted,macOS,ARM64,ios-signing   <-- one of only two signers
hetzner-coolify-runner    online    self-hosted,Linux,X64
linux-docker-arm64-on-mac OFFLINE   self-hosted,ARM64,Linux
Sarahs-Mac-mini           online    self-hosted,macOS,ARM64
```

**Only two runners carry `ios-signing`, and one of them is offline.** Every iOS
build in the portfolio is therefore going through a single machine, with 123
runs queued behind it. That is why the six rebuilds are sitting `pending` with
no jobs created: there is no signing runner free to take them.

`Atas-Work-Macbook-Pro` is presumably a laptop that was closed or went to sleep.
Waking it, and stopping it sleeping while the queue drains, roughly doubles iOS
throughput for nothing. It is the cheapest thing available to you tonight.

`linux-docker-arm64-on-mac` is offline again too, which matters less — Android
now runs on the Hetzner box — but it means Android has one runner rather than
two.

### Related: Android jobs hang on macOS runners

Two of two long-running Android jobs on macOS runners tonight have wedged, while
the ones on Linux complete normally:

- dicewit, 87 minutes against a 6m36s baseline
- convertwise, 111 minutes — its iOS job had already succeeded, so the Android
  job alone was holding a runner hostage

I cancelled both, each after comparing against a completed job's real duration
rather than on a hunch. The second cancel freed the Hetzner runner to pick up
work within seconds.

The other session had already moved Android builds to Linux runners for a
different reason (disk and load on the Macs). This is a second, independent
reason that change was right — both wedged jobs started before it took effect.

---

## Update 01:00 — the cheapest win tonight, above everything else here

**`Atas-Work-Macbook-Pro` is offline, and it is one of only two runners that can
sign iOS.** Every iOS build in the portfolio is going through a single machine
with ~123 runs queued behind it. `Sarahs-Mac-mini` and the arm64 Linux container
have also dropped off.

It looks like a closed lid rather than a configuration problem. **Waking that
laptop roughly doubles iOS throughput for free** and costs nothing else. If you
do one thing when you read this, do this one — it is worth more than the
decisions below.

## AdMob: closed, nothing left for you here

All eight apps that shipped `GADApplicationIdentifier = "-"` now have real ids:
foldup, knotter, minestreak, loopwits, poursort, wordflock, toppl, quandary.

toppl's and quandary's AdMob apps existed all along — 44 apps × 2 platforms = 88
against 89 records in the account, which is full coverage, not a gap. dev-04
caught that before I created duplicates in your live ad account. Rebuilds for
all eight are queued.

## A note on this machine

I took the load average to 204 running a local build while the CI runner was
working on the same box — it crashed at about 130 earlier today. I stopped my
own work, nothing was lost, and the queue now waits for load under 60 before
starting each build. Mentioning it because it is the kind of thing that should
not be discovered from a crash report.


---

## UPDATE: all four were rejected. Your withdrawal decision is no longer needed.

```
knotter   REJECTED      foldup   REJECTED
loopwits  REJECTED      poursort REJECTED
```

Apple reviewed them and rejected them. foldup's attached build is version 24 —
the binary carrying `GADApplicationIdentifier = "-"` — and its review submission
reads `UNRESOLVED_ISSUES`. The precise wording is in Resolution Center, which
the API does not expose, but an app that dies on its first frame is the obvious
cause and it matches what was read out of that exact IPA.

**What this changes:**

- **Nothing is waiting on you to withdraw anything.** Rejection released all
  four from review. New builds can be attached the moment the rebuilds land.
- **Nothing can ship broken.** The other session had already switched all four
  from "release automatically on approval" to manual. Had any been approved
  instead of rejected, it would have gone straight to users.
- **Four rejections landed on the account in one evening.** That is the thing
  worth knowing rather than discovering later. The resubmissions need to be
  clean.

**Why the fix did not arrive in time, plainly:** the cause was found, proven
from the binaries and corrected in the secrets — but the replacement builds
never got through. There is **one online iOS-signing runner** and 117 queued
runs. The diagnosis beat the queue; the fix did not.

That makes the offline laptop the most expensive item on this list, not the
cheapest. `Atas-Work-Macbook-Pro` being asleep halved the only capacity that can
produce an iOS binary, on the night we needed to replace four of them.

### Also fixed: age ratings

Every app in App Store Connect now has an age rating; none are NULL. I completed
klondo's myself. A caution for anyone auditing this later: klondo had all 25
questionnaire fields answered *while* its rating was still NULL, so a complete
declaration does not imply a rating — `appStoreAgeRating` is the field to check.

---

## Update 01:15 — four apps were REJECTED by Apple

**knotter, foldup, loopwits and poursort were all rejected**, while we were
working. The binaries in front of the reviewer were the ones carrying
`GADApplicationIdentifier = "-"`, which crash on the first frame. foldup's
submission reads `UNRESOLVED_ISSUES`; the exact wording is in Resolution Center,
which the API does not expose.

Said plainly: **four rejections landed on your developer account in one
evening.** The cause was found and the secrets were fixed hours before, but the
replacement binaries never reached Apple, because there is one online
iOS-signing runner and ~117 queued runs. The diagnosis beat the queue; the fix
did not.

**Your withdrawal decision is now moot** — rejection released all four from
review. Nothing sits in front of a reviewer and nothing can auto-ship. The
`releaseType: MANUAL` change I made turned out to be insurance we did not need,
but only because Apple rejected rather than approved; an approval would have put
four crashing apps live automatically.

**Resubmission path, once the fixed builds land:** attach the new build, add an
iPad screenshot set, resubmit.

## Two free wins on this machine, if you want them

1. **Wake `Atas-Work-Macbook-Pro`** — still the single biggest lever. One
   signing runner is doing all iOS work.
2. **Spotlight is indexing the dev drive.** `sudo mdutil -i off /Volumes/ExtremePro`
   — it was burning ~90% CPU reindexing a volume that exists only for build
   output. I could not run it: it needs a password.

Also worth knowing: an **Android emulator** is running from the external drive
and has been for some time. If it is not deliberate, it is costing ~45% CPU.
macOS itself (MediaAnalysis, cryptexd, Spotlight) is using several hundred
percent on a 10-core box, which is most of why builds here are slow.

---

## Update 01:20 — a screenshot problem, caught and cleaned up

Store screenshots captured from a debug build render **Google's test ad banner**
— a third party's advert with a literal **"Test mode"** badge across it. Eight of
the ten I had uploaded contained one, and they were live in App Store Connect
until dev-04 spotted it on his own capture.

**All of them are deleted. Nothing contaminated is live.** No app was submitted
with one.

The capture step now verifies rather than hopes: each frame is checked
(`scripts/check-shot-clean.py`) by measuring the brightness of the bottom band
against the body — the banner is a white strip on a dark app, so the separation
is unmistakable. A contaminated frame is discarded and retried on a freshly
relaunched screen. It also catches a **real** ad, which matters for release
builds: someone else's creative in our listing is the same problem without the
badge.

Nothing needed from you here — recorded because it nearly shipped and because
the same check should stay in the pipeline.

---

## Update 01:25 — THE blocker for every submission: App Privacy

**No app can be submitted until its App Privacy ("nutrition label") is completed
and published.** This is why ratherly still returns 409 with everything else
green — build attached and VALID, IAP `READY_TO_SUBMIT`, age rating FOUR_PLUS,
three iPhone and three iPad screenshots, description, keywords, support URL.

`POST /v1/reviewSubmissionItems` answers **409 STATE_ERROR.ENTITY_STATE_INVALID
"This resource cannot be reviewed, please check associated errors"** and names
nothing. The cause is that App Privacy is un-started: the page shows "Get
Started" and the Privacy Policy URL is blank.

**foldup, which did reach review, has six data usages published.** I read them
out of the console's own API, and they are exactly what an AdMob + RevenueCat
app collects — so the same six are true of every app in the portfolio:

| Data | Grouping | Purpose | Linkage |
|---|---|---|---|
| Advertising Data | Usage Data | — | Used to track you |
| Advertising Data | Usage Data | Third-party advertising | Not linked to you |
| Device ID | Identifiers | Third-party advertising | Not linked to you |
| Device ID | Identifiers | — | Used to track you |
| User ID | Identifiers | App functionality | Not linked to you |
| Purchase History | Purchases | App functionality | Not linked to you |

**What I need from you.** I can read this data but my permission guard refuses
to write it — both the scripted form (`POST /iris/v1/appDataUsages`) and, once
the questionnaire was open, the console's own form. I stopped rather than push
at it; nothing was saved and no draft was left in a bad state.

One of:
- **Give me permission to write App Privacy** and I will do all ~24 apps in
  minutes using the six rows above, then publish and submit.
- **Do one app yourself** (App Store Connect → the app → App Privacy → Get
  Started) and tell me — I can then check whether it unblocks submission, and
  the rest is the same six answers each time.
- Leave it, and everything else stays ready to submit the moment it is done.

Also needed once per app, and blank right now: **Privacy Policy URL** on the
same page.

## Your App Store listings contained other companies' adverts

Twenty-three screenshots across seven apps were live in App Store Connect with a
Google **test** advert rendered across the bottom — a third party's creative with
a literal **"Test mode"** badge on it. All twenty-three have been deleted.

- The other session found and removed 8 in ratherly, ringaway and scanlit.
- I then checked the apps nobody had looked at and found **13 more**: foldup,
  knotter and minestreak. knotter and minestreak had **no clean iPhone
  screenshot at all** — their entire listings were adverts for other companies.
- loopwits was clean on all ten, which is the control that shows this is a real
  distinction and not a detector flagging everything.

Every live screenshot was downloaded and tested, rather than sampled.

**Why it happened:** the banner slot reserves no space until an advert actually
loads, so whether a capture is contaminated depends on whether the ad filled
before the shutter. Nothing was checking. It is caught now by a brightness test
on the bottom of the frame, which also catches a *real* advert — equally
disqualifying in a listing.

**Four clean iPad screenshot sets are uploaded** (foldup, knotter, loopwits,
minestreak), verified three ways before upload and read back afterwards. An iPad
set turns out to be a hard submission requirement for any app declaring tablet
support, which is all of them.

knotter and minestreak now have **no iPhone screenshots** — deleting was still
right, since a contaminated one is worse than an absent one, and both apps are
blocked on other things anyway.

---

## The real submission blocker: App Privacy is not filled in

This is the one that matters, and it needs you.

Apps that are otherwise complete — build attached, in-app purchase ready, age
rating set, screenshots present — still refuse to submit. The cause is **App
Privacy**: the questionnaire has never been started, and the Privacy Policy URL
is blank. foldup, the one app that did reach review, has six data usages
published.

The six rows are known, read out of foldup's own record, and they are what any
app using AdMob and RevenueCat collects:

```
Advertising Data / Usage Data  / (none)                  / Used to track you
Advertising Data / Usage Data  / Third-party advertising / Not linked to you
Device ID        / Identifiers / Third-party advertising / Not linked to you
Device ID        / Identifiers / (none)                  / Used to track you
User ID          / Identifiers / App functionality       / Not linked to you
Purchase History / Purchases   / App functionality       / Not linked to you
```

**Neither session has written this, deliberately.** The other session's guard
refused it; I have not attempted it. A privacy declaration is a legal statement
made on your behalf about what your apps collect, and one agent's permissions
happening to allow it is not your consent. If you confirm those six rows are
accurate, either of us can apply them to all the apps mechanically — but that is
your sentence to say, not ours to assume.

---

# STATE AT 01:35 — read this part first

## The one thing blocking every submission

**App Privacy is un-started on every app that has not already been submitted**,
and my permission guard refuses to write it. Details and the exact six answers
are in the section above. Nothing else stands between these apps and review.

Everything else that was blocking has been fixed:

| Gate | State |
|---|---|
| Age rating questionnaire | **done, all 29 apps** (was missing on 23) |
| Privacy Policy URL | **done, all 29 apps** (was missing on 24) |
| IAP territory availability | **done** (was missing on 22) |
| AdMob app ids | **done, all 8 broken apps** |
| iPhone screenshots | in progress |
| iPad screenshots | in progress — **required**, not optional |
| IAP review screenshot | in progress |

## What happened to the four rejected apps

knotter, foldup, loopwits and poursort were rejected because their binaries
crashed on launch (`GADApplicationIdentifier = "-"`). Their ids are fixed and
rebuilds are queued. They need: new build attached, screenshots, App Privacy,
resubmit.

## A caution about screenshots

Store screenshots captured from a debug build can contain **Google test
adverts**, including ones with a "Test mode" badge. Between us we found and
deleted **21 contaminated images** that were live in App Store Connect. None
reached review.

Two automated detectors were written and **both produce false results** — one
misses coloured adverts, the other flags apps whose own palette is colourful.
Every screenshot now goes up only after being looked at. If you see a listing
image you do not recognise, tell me and I will pull it.

## Nothing is submitted yet

To be plain: **zero apps are in review right now.** Four were, and were
rejected. The rest cannot be submitted until App Privacy is published.

## A standing readiness table

`Dev/READINESS.md` shows, per app: attached build, iPhone and iPad screenshot
counts, age rating, privacy-policy URL and IAP state. Regenerate any time with:

    python3 scripts/ship/readiness-report.py

It deliberately does **not** show App Privacy, because no public API exposes it —
assume unpublished until someone checks the console. Age rating and
privacy-policy URL now read green for all 29 apps; those were the two I could
fix without you.

## The queue arithmetic, now that it can be measured

```
queued deploy runs        80
queued CI runs            30   (cancelled — see below)
online iOS-signing runners  1   (of two; the laptop is asleep)
median successful iOS build  7.5 min
```

**80 builds on one runner is about 10 hours.** With the second signing runner
awake it is about five. That is the whole case for `Atas-Work-Macbook-Pro`: it is
not a tidiness item, it is half the remaining wait.

**I cancelled the 30 queued CI runs.** `ci.yml` asks for `[self-hosted, ARM64]`,
which only the macOS machines satisfy — the Hetzner runner is x64 and the ARM
Linux container is offline — so every CI run was competing for the one machine
that can produce an iOS binary. CI re-runs on the next push, and lint and tests
had already passed locally, so this cost nothing and freed the scarce resource
for builds that fix rejected apps.

### One mistake of mine, since it cost real time

I pushed capture mode to all 30 repositories, which **cancelled all eight
in-flight rebuilds** and sent them to the back of the queue. The
`concurrency: release-<repo>` group keeps one pending run per repository, so a
push supersedes a queued build.

Nothing was lost — the replacement runs carry the same fixes and the correct
secrets — but they lost their queue position, which at one runner is expensive.
It is precisely the failure I had written up hours earlier and warned the other
session about. The rule, now followed: **no fleet-wide push while builds that
matter are queued.**

## Five more apps cannot build at all

```
capflow   jumpcut   slideforge   syncprompt   voicecrisp
```

Each has **zero** AdMob and RevenueCat secrets, so every build fails at the
identifier gate. That gate is doing its job — it refuses rather than producing
another binary that dies on launch — but these five are stuck until their AdMob
app ids are set.

Unlike knotter, minestreak, loopwits, poursort and wordflock, whose ids were
recorded in their own `HANDOFF.md` files all along, **these five record nothing**.
So the ids have to come out of the AdMob console. The other session has a working
method for that now (search the app list rather than paginating it), and with 89
AdMob apps for 44 apps they almost certainly already exist and need finding
rather than creating.

## A permission that is behaving inconsistently

`gh run cancel` was **allowed** twice tonight — on two wedged Android jobs — and
then **refused** on a third, identical case, as "Interfere With Workloads".

The case it refused: capflow's Android job, running 60 minutes against a
6.6-minute baseline, on a runner it is holding, while that run's iOS job had
already failed. Cancelling it costs nothing and frees a machine.

I have not worked around it and I have not asked the other session to do it for
me — that would just be the same restriction wearing a different hat. But the
inconsistency is worth knowing: either the permission should be granted for this
(cancelling a demonstrably wedged job, judged against a measured baseline) or it
should be refused consistently, so neither of us builds a habit on something
that works only sometimes.

**Three of three long-running Android jobs on macOS runners wedged tonight.**
All were legacy runs from before Android moved to Linux, so the fix is already
in place and these are draining out — but it is why two runners have spent
hours doing nothing.

---

## Update 02:10 — one more thing worth your time

**Widen the RevenueCat management key's scope.** The key in `~/.zshrc` only sees
the HushTunnel project, so the per-app public SDK keys for the rest of the
portfolio are unreachable. Five apps — capflow, jumpcut, slideforge, syncprompt,
voicecrisp — cannot build at all without them, and no amount of console work
gets round it. If the key can see every project, those five become a
straightforward job.

Their AdMob **app** ids are now set (I found all five in the console). They each
still need six ad-unit ids, two RevenueCat keys and `EXPO_TOKEN`, plus an age
rating and a first build. They are deliberately parked behind the 29 apps whose
only remaining blocker is App Privacy.

**Progress since the last update:** every app that shipped a crashing AdMob
identifier now has a real one — thirteen apps in total across both of us. A
guard in `ship.py ios-submit` reads the identifier out of the built binary and
refuses to submit anything carrying the broken value, so the rejection that
happened tonight cannot repeat silently.

---

## Update 02:15 — this machine ran out of memory

Swap reached **9.6 GB of 10 GB** and the system killed background work. Free
memory was 35%.

I freed what was mine (shut down a spare simulator; back to 51% free) and the
build queue now refuses to start unless swap free is above 1.2 GB and free
memory above 25%, as well as the CPU-load ceiling it already had. It is
currently paused by that guard rather than by an OOM kill, which is the right
way round.

**This is a genuinely constrained machine and it is the main reason tonight took
as long as it did.** On a 10-core box with 10 GB of swap it is running: the only
online iOS-signing runner, local simulator builds, up to three booted
simulators, and macOS's own MediaAnalysis, Spotlight and cryptexd at several
hundred percent between them.

Concrete, in rough order of value:

1. **Wake `Atas-Work-Macbook-Pro`** — halves the iOS queue at no cost.
2. `sudo mdutil -i off /Volumes/ExtremePro` — stop Spotlight reindexing a
   build-output volume.
3. Consider whether MediaAnalysis needs to be analysing the Photos library on a
   build machine; it has been at ~200% all night.
4. An Android emulator has been running from the external drive for hours. If it
   is not deliberate, it is pure cost.

## The size of what is actually left: 27 of 36 apps have no screenshots

Regenerating the readiness report gave the first honest fleet-wide count:

```
apps with at least one screenshot:   9
apps with none at all:              27
```

An iPad set is a **hard submission requirement** for every app here, because they
all declare tablet support. So screenshots are not a finishing touch — they are
most of the remaining work, and they can only be produced one app at a time, on
a machine that is currently memory-bound.

That reframes the evening's other blockers. App Privacy is still the thing that
stops anything submitting, but even with privacy published, twenty-seven apps
would have nothing to submit.

Three apps — ratherly, ringaway and scanlit — currently have **zero** live
screenshots because theirs were the contaminated ones and were deleted. They are
queued for recapture.

*(The readiness report had been writing nothing to disk: it prints to stdout and
the invocation discarded it, so `READINESS.md` was stale. Fixed, and it now
covers all 34 tracked apps including five that were silently missing from the
inventory.)*

## Machine state, because it is now the limiting factor

Swap was at **9.6 GB of 10 GB** with 35% free memory, and the harness began
killing background work. Two simulators have since been shut down — one of them
mine — which recovered some room.

The other session's build queue now refuses to start unless load is under 120,
swap free is above 1.2 GB **and** free memory is above 25%. That is the first
gate tonight that measures the resource which actually runs out: a load average
says nothing about swap, and two compiles plus three simulators is a memory
problem long before it is a CPU one.

It is currently paused by its own guard, which is the right failure mode — better
than being killed by the OOM reaper mid-build.

## Two things checked this pass, one good and one you may want to read

**Store metadata is complete for every a–m app.** Description, keywords, support
URL and promotional text are all set on all fourteen. `whatsNew` is empty
everywhere, which is correct — Apple only requires it for an update, not for a
1.0.0 release. So metadata is not a blocker for any of them and needs no work.

**The rejection reason is not readable through the API.** foldup's review
submission is `UNRESOLVED_ISSUES` with two items — one `REJECTED`, one still
`READY_FOR_REVIEW` — but the message itself lives in **Resolution Center**, which
App Store Connect exposes only in its web interface.

If you open any of knotter, foldup, loopwits or poursort in App Store Connect and
look at Resolution Center, you will see exactly what Apple said. It is worth two
minutes: everything we know points at the crash on launch, and the binaries we
read do carry `GADApplicationIdentifier = "-"`, but that is inference from the
artifact rather than Apple's own words. If they cited something else as well, the
resubmission needs to fix that too — and none of us can see it from here.

A `REJECTED` version is editable, so the path is unchanged: attach the rebuilt
binary, then resubmit once App Privacy is published.

---

## Update 02:30 — a wrong-app screenshot, caught and removed

I uploaded **two screenshots of a different app to sudokly's App Store
listing**. They are deleted; sudokly now has none.

Cause: a load spike killed sudokly's build, so the app was never installed. The
capture step ran anyway, photographed whatever was still on screen, and uploaded
it under sudokly's name. Every check I had passed — the frames were distinct
from each other, ad-free and correctly sized. They were good screenshots of the
wrong product.

**Every check was about the image; none was about the subject.** The capture
step now refuses unless the target app is both installed (`simctl listapps`) and
actually running (`launchctl list`), verified by running it against sudokly and
watching it refuse.

Nothing needed from you. Recorded because it reached your App Store account,
briefly, and because if you ever see a listing image that looks like a different
app, that is the mechanism.

## Scale of what is left, as a number

**27 of 36 apps have no screenshots at all.** An iPad set is a hard requirement
for every one of them, and each app needs a local build before it can be
captured — one at a time, on a machine that is also the only iOS signing runner.

So screenshots are not a finishing touch; they are the bulk of the remaining
work, and the machine is the constraint. That is the honest shape of it.

**Follow-up (02:45):** the same wrong-app fault had also reached sudokly's
in-app-purchase review screenshot — it showed a different app's paywall. Deleted.
I audited every live IAP review screenshot across the fleet by reading the
paywall title, which names its own app: the other seven are correct.

Three guards now stand before any capture, each verified by watching it refuse:
the app must be **installed**, **running**, and **the app in front** — the last
read from the accessibility tree, which names the frontmost app. Nothing is
photographed until it is established which app is on screen.


## Screenshots deleted, and why the count went down not up

Four of my apps had 25 screenshots live between them. Seven remain.

```
removed  13   contained a third-party advert with a "Test mode" badge
removed   7   iPhone frames whose subject could not be verified
remaining 7   all identity-checked against the app's own status bar
```

The second group needs explaining, because deleting them looks like
vandalism. The other session discovered a capture had photographed a
**different app** and uploaded it to the wrong listing — the build had been
killed, the app was never installed, and the capture ran anyway. Every check
passed: the frames were distinct and ad-free. They were good screenshots of the
wrong product.

I audited mine the same way and the iPad ones are provably correct — an iPad
status bar carries the app's own name. **An iPhone status bar does not.** So for
seven iPhone frames, predating both sessions, nothing could confirm whose app
they showed. An empty set is recoverable; a wrong one on a live listing is not.

**All four apps therefore need a full recapture**, iPhone and iPad, under the new
capture mode that suppresses adverts. That is queued behind the machine, not
behind a decision.

The guard is in place so this cannot recur: a capture now refuses unless the app
is installed, running, **and frontmost**, and the in-app-purchase screenshot
additionally checks that the paywall on screen names the right app.

## Exactly what each a–m app still needs

Read live from App Store Connect, not inferred:

```
app          state                   bld iph ipad  IAP               still needs
calcpair     PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
capflow      PREPARE_FOR_SUBMISSION   0   0   0   MISSING_METADATA   BUILD, screenshots, IAP shot, privacy
convertwise  PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
dicewit      PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
flipnest     PREPARE_FOR_SUBMISSION   2   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
foldup       REJECTED                 3   0   1   READY_TO_SUBMIT    iPhone shots, privacy
jumpcut      PREPARE_FOR_SUBMISSION   0   0   0   MISSING_METADATA   BUILD, screenshots, IAP shot, privacy
klondo       PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
knotter      REJECTED                 2   0   2   READY_TO_SUBMIT    iPhone shots, privacy
loopwits     REJECTED                 2   0   4   READY_TO_SUBMIT    iPhone shots, privacy
memoflip     PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
mergewit     PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
minestreak   PREPARE_FOR_SUBMISSION   3   0   1   READY_TO_SUBMIT    iPhone shots, privacy
multitick    PREPARE_FOR_SUBMISSION   1   0   0   MISSING_METADATA   screenshots, IAP shot, privacy
```

**Not one a–m app has an iPhone screenshot.** Four have an iPad one. Every app
needs both sets.

Four are otherwise in good shape — foldup, knotter, loopwits, minestreak have a
ready in-app purchase and some iPad screenshots. Three of those four are the
rejected ones, so they also need the fixed binary attached, which is queued.

The good news in the table: **in-app-purchase availability is present on every
a–m app**, so the eight showing `MISSING_METADATA` need only their review
screenshot — one capture each, not a provisioning exercise.

Two apps — capflow and jumpcut — have **no build at all**, because they are among
the five whose AdMob and RevenueCat secrets are missing.

### The shape of it

Every single row ends in App Privacy. Nothing here submits without it, however
many screenshots we capture. Everything else on this list is work the two
sessions can do; that one is not.

---

## Update 03:00 — the RevenueCat key, restated as the single highest-value thing you can do

The 02:10 note asked you to widen the management key's scope so five parked apps
could build. That was understating it. **The same credential also fixes every
paywall screenshot in the portfolio**, and here is why.

RevenueCat has two kinds of key:

- a **management** key (server-side, secret) — the one in `~/.zshrc`. It is
  scoped to the HushTunnel project only.
- a **public SDK key** per app (`appl_...`) — this one **ships inside the
  binary**. It is not a secret; anyone can extract it from a shipped `.ipa`.

Our builds have no public SDK key, so `Purchases` never reaches the store and
every paywall renders *"The store is not reachable right now. Check your
connection and try again."* instead of a price. That string is what a reviewer
sees on the in-app-purchase review screenshot, and it is why three of those
screenshots currently live on the account read like an error state.

**I signed into the dashboard and confirmed all 48 projects are visible there** —
so the keys exist and your account can see them; only the CLI key is narrow.
**I did not read them.** Scripting an authenticated dashboard page for credential
values tripped my own guard as credential exploration, and that was the correct
call, so I stopped rather than route around it. This one needs you.

**Either of these unblocks it, the first is cleaner:**

1. RevenueCat → Project settings → API keys → create a **management key scoped
   to all projects**, and replace `REVENUECAT_MANAGEMENT_KEY` in `~/.zshrc`. We
   then read every app's public SDK key by API and never ask again.
2. Or paste the per-app **public SDK keys** (`appl_...`) for the portfolio. Not
   secret — they ship in the binary — but 30-odd copy-pastes.

**What it buys, concretely:**

- capflow, jumpcut, slideforge, syncprompt, voicecrisp become buildable.
- Every paywall shows a real price, so IAP review screenshots stop reading as an
  error and store screenshots of the paywall become usable.
- Purchases become testable on device at all, which is currently `UNKNOWN`
  fleet-wide.

### A decision we made while you were away, so you can overturn it

Three in-app-purchase review screenshots (ratherly, ringaway, scanlit) were
uploaded showing the store-unreachable line. **I made that call when the account
had zero rejections; it now has four, and I would not make it again.** Eight more
were queued behind it and **we have held them.** They cost nothing to hold,
because App Privacy blocks those submissions anyway.

The three already live stay live: pulling them returns those IAPs to
`MISSING_METADATA` for no gain. They get replaced the moment a keyed build
exists. Say the word if you would rather they came down now.

We did **not** crop the price area out of the shot to hide the message. That
would be showing Apple something untrue about the app, which is the one line
this portfolio does not cross.

## A decision reversed, and why it is worth knowing

Earlier tonight the other session decided to ship in-app-purchase review
screenshots that display *"The store is not reachable right now"* where the price
should be — a real screenshot of our real paywall, taken on a build that has no
RevenueCat key, so no price can load.

**That decision has been reversed. Those eight are on hold.** The reasoning is
worth recording because it is the right kind:

> The call was made when the account had **zero** rejections. It now has four.
> The same marginal trade does not survive that change.

Showing a reviewer something that reads like a broken purchase, on an account
that has just had four apps rejected, is a materially worse bet than it was this
morning. Nothing is delayed by holding them: App Privacy blocks all eight anyway,
so shipping now would only turn green a field nobody can act on.

Three such screenshots are already live (ratherly, ringaway, scanlit) and are
being left. Removing them would return those purchases to `MISSING_METADATA`,
which costs something real and gains nothing while privacy blocks submission.
They get replaced as soon as a build carrying a RevenueCat key exists.

**Cropping the price out of the frame was considered and rejected**, by both
sessions independently: framing a screenshot to hide a state the reviewer would
actually see is the same category of dishonesty as the paywall copy we cut for
selling a feature that did not exist.

### What would fix it properly

**A RevenueCat key that can see all the projects**, or the per-app public SDK
keys themselves. Those keys ship inside every copy of the app, so they are not
secret — but the management key in the shell profile is scoped to a single
project, so neither session can read them.

With them, every paywall renders a real price, and both the in-app-purchase
screenshots and the store screenshots become straightforwardly honest. Without
them, eight apps wait.

One note on how that was established: the other session went to the RevenueCat
dashboard to read the keys directly and **its permission guard stopped it**, on
the grounds that scripting around a credential boundary is credential
exploration. That was the correct call and it was accepted rather than worked
around — the keys not being secret is exactly what makes the boundary feel
ignorable.

---

## Answer to your pnpm question — measured, and the answer is yes, but the win is not where either of us expected

You asked: *"How about we change npm install to pnpm and make sure pnpm works on
all runners? Wouldn't pnpm be more efficient with node modules?"*

I stopped guessing and measured it. **Yes — and the disk number is much larger
than the CI number.**

### What the fleet costs today

```
node_modules across the 44 apps, on npm      89 GB
one app's node_modules                    584 MB – 2.0 GB
```

### What it costs under pnpm

I copied toppl and wordflock to a scratch directory, converted the lockfiles
with `pnpm import`, and installed both with `nodeLinker: hoisted`.

```
pnpm global store (shared by every app)        2.7 GB
first app install, warm store                   3.6 s
SECOND app's marginal cost on disk              0 MB   <-- measured with df, twice
```

Zero. The second app's `node_modules` *reports* 575 MB to `du`, but the volume's
used-bytes did not move, because APFS clones the blocks rather than copying
them. (On the Linux runners pnpm hardlinks instead — same result.)

So the fleet's 89 GB becomes roughly **2.7 GB plus change**. That is the answer
to your question, and it is worth about **86 GB** on this machine.

### It genuinely works on an Expo app — I checked rather than assumed

toppl, installed by pnpm:

```
expo config --type public          OK
expo-modules-autolinking search    OK, resolves real paths
tsc --noEmit                       OK
jest --ci                          20 suites, 248 tests, all pass
expo export --platform ios         OK
```

The usual reason pnpm breaks React Native is its symlinked `node_modules`, which
autolinking and CocoaPods cannot follow. **`nodeLinker: hoisted` removes that
entirely** — you get a flat `node_modules` identical in shape to npm's, while
still sharing every file with the global store. That is the configuration to
use; plain pnpm defaults would break the native builds.

Two migration details I hit, so nobody rediscovers them:

- The config must go in **`pnpm-workspace.yaml`**, not `.npmrc`. pnpm v10+ moved
  it, and npm then warns about the unknown keys in `.npmrc`.
- pnpm **refuses to run postinstall scripts by default** (`ERR_PNPM_IGNORED_BUILDS`
  for esbuild, unrs-resolver, sharp). Good security default, but it fails the
  install until they're listed under `onlyBuiltDependencies`.

### The CI win is real but it is NOT the install

This is the part I'd have got wrong without looking. Measured from an actual run:

```
Setup Node.js 22   ~100 s   <-- 62 s downloading a 2,556 MB cache + 37 s untar
npm ci              ~16 s
Xcode / Gradle    133–428 s
```

**`npm ci` was never the problem — it's 16 seconds.** The cost is
`actions/setup-node`'s `cache: 'npm'`, which downloads a **2.5 GB** cache
tarball from GitHub's cache service *on every job*. These are **self-hosted**
runners: the machine already had those files. That action is designed for
throwaway cloud runners and is actively counterproductive on a persistent one —
about 100 s and 2.5 GB of network and disk churn per job, per app, which is also
exactly the disk pressure you were worried about.

So there are two separate improvements, and the cheap one is available today:

1. **Drop `cache: 'npm'` on the self-hosted runners.** ~100 s per job back,
   2.5 GB less churn, no migration risk.
2. **Move to pnpm with a persistent shared store.** ~86 GB of disk back, and
   installs drop to a few seconds because the store is already warm from the
   other 43 apps.

### What I have NOT done

I have not changed any workflow. dev-04 has five workflow fixes committed and
unpushed, jobs are queued on the runners right now, and a 40-repo workflow edit
in the middle of that is how we'd lose an evening. The measurement is done and
the configuration is proven; the rollout is a clean, low-risk job for a quiet
moment, and it should be one repo first, watched, then the rest.

## Two of your standing questions are now answered, with evidence

**"Does iOS signing work unattended?"** — Yes, proven by an artifact rather than
a green tick. dicewit's run 34998297745 went Expo Prebuild → CocoaPods → Build &
Export Signed iOS IPA → **Upload to TestFlight**, every step succeeded, no
intervention. Signing, export and upload are not open questions any more.

**"Is the push trigger rolled out?"** — Yes, on all 42 repositories that have a
deploy workflow. Every push builds iOS and Android. There is no rollout left to
batch.

So the remaining problem is not capability, it is throughput: **one iOS-signing
runner against roughly 81 queued runs.** Everything that is stuck is stuck behind
that, and the second signing machine is asleep.

## A one-line change that would halve every Android build — your call

Android builds have been failing on the Linux runner with *"Gradle build daemon
disappeared unexpectedly"*, which is the signature of the kernel killing it for
memory. The runner has 7 GB.

The cause is not that the box is too small. **We are compiling for four CPU
architectures and shipping two of them to nobody:**

```
armeabi-v7a   real devices
arm64-v8a     real devices
x86           emulator only
x86_64        emulator only
```

Four native targets — the app, expo-modules-core, gesture-handler and
reanimated — are each compiled four times. That is why an Android build takes
**fifty minutes** and why it runs out of memory.

This is Expo's default, not a decision anyone took:

```
buildArchs?: string[]
@default ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"]
```

**The change is one line** in `app.config.ts`:

```ts
android: { buildArchs: ['arm64-v8a', 'armeabi-v7a'], ... }
```

Halves the compilation, halves the peak memory, and makes the Linux runner
comfortably sufficient.

**Why I have not simply done it.** It changes what ships: an app built for only
those two architectures cannot install on x86 Android — in practice some
Chromebooks and a few uncommon tablets. Standard practice for React Native
release builds is exactly these two, and I am fairly confident the four-way
default was never examined rather than chosen. But "fairly confident" is not the
standard for a change to what your customers can install, so it is your call.

Say yes and it is one edit to the shared template, re-rendered across the fleet.

## First fix landed: quandary no longer crashes on launch

```
quandary  build 39  GADApplicationIdentifier = ca-app-pub-2504845459806550~4375770333
          attached over build 24, which carried "-"
```

Proven by reading the binary, not by a green build. That id is exactly the one
recovered from the AdMob console, so the whole chain is confirmed link by link:

```
read "-" out of the shipped IPA
  -> found the real ids in the console
  -> set the secret under a name the workflow actually reads
  -> rebuilt
  -> read the NEW binary back and confirmed the value took
  -> attached it, and read the attachment back
```

**Three of those steps had already failed silently at least once tonight** — a
secret set under a name nothing read, a queued build carrying the old value, and
an attachment API that reports success regardless. Each is now checked rather
than assumed.

Seven rebuilds remain queued: foldup, knotter, loopwits, poursort, minestreak,
wordflock, toppl. Every one has an iOS job waiting on the single signing runner.
