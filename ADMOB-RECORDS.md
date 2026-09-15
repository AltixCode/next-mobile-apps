# What the AdMob tables cover, and what they do not

`admob-ids.tsv` and `admob-adunits.tsv` are a **local record of what was read
back from the AdMob console**. They are not the account, and they have twice
been mistaken for it.

## Scope

| Wave | Apps | In these files |
|---|---|---|
| The earlier fourteen | GridHabit, WordDrop, CapFlow, SlideForge, JumpCut, NetPulse, PackPixel, SyncPrompt, VoiceCrisp, StoryChop, SignPure, ScribeZero, RedactPro, Gridlock Pop | **No** |
| dev-7b's twelve (`PLAN_2.md`) | loopwits, poursort, foldup, knotter, wordflock, minestreak, toppl, solari, poplet, quandary, flipnest, quiktap | Yes |
| dev-a0's eighteen (`ADS-PLAN.md`) | convertwise, splitjar, spinwit, calcpair, multitick, dicewit, mergewit, memoflip, sudokly, klondo, tapforge, ratherly, quizburst, namewell, scanlit, trilite, ringaway (+ rectap, unshipped) | Yes, added 2026-09-15 |

The console holds **89 apps**. These files hold fewer. A slug that is absent
here tells you nothing about whether it exists in AdMob.

## The mistake this file exists to prevent

On 2026-09-15 I checked all seventeen of the `ADS-PLAN.md` slugs against
`admob-ids.tsv`, got zero matches, and recorded in `PORTFOLIO-STATE.md` that
**no AdMob app or ad unit existed for any of them** — that no production build
could be made and no app could earn anything. It was wrong. All thirty-four
records existed, each with three active ad units, and all ten identifiers were
already present as GitHub Actions secrets on every repo. The file only ever
covered another wave, and nothing in it said so.

The lookup returned nothing and I read that as "nothing is there", when it
meant "this file does not cover that". dev-3a hit the identical shape the same
day: reading `items` off the wrong level of a JSON envelope returned `None`,
which became an empty list, which became a confident "0 apps need Apple
credentials" while the CLI was plainly saying otherwise.

**If a check finds zero problems, prove the check can find one.** Point it at a
case you know is broken before you believe a clean result — and prefer the
account over any file that claims to describe it.

## How these were read

Not clicked. The console's own RPC, replayed from the signed-in tab:

    POST https://admob.google.com/v2/inventory/_/rpc/AdUnitService/List
    f.req={"1":["<admobAppId>"]}

captured once off a real page navigation and then replayed for all thirty-four
app records in a single pass. Two things that cost time first:

- The ad units are **not in the page HTML**. `GET /v2/apps/<id>/adunits/list`
  returns the same SPA shell for every app — identical byte length, which is
  the tell. Only the RPC has the data.
- Most controls are `material-button`, not `<button>`, so
  `querySelectorAll("button")` finds nothing and reports it as "no such
  control" rather than as a wrong selector.

Ad unit ids are recorded in full (`ca-app-pub-2504845459806550/<unit>`); app ids
are the bare number, and take a `~` rather than a `/` when written as an
application id.
