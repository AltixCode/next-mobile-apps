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
