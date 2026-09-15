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
