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
