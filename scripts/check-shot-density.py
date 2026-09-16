#!/usr/bin/env python3
"""
Refuses a store screenshot that shows too little of the product.

The defect this catches is the one automated checks are worst at: a frame that
is a *true picture of a working app* and still sells nothing. minestreak's only
live screenshot is a title, a subtitle and three buttons on an otherwise black
iPad frame -- no minesweeper board anywhere in it. Every guard we have passes
it, correctly: right app, frontmost, no advert, no dev overlay, fully rendered.

It is measured as the fraction of the frame that differs from the modal
background colour, which for these dark-themed apps is the near-black ground.

WHY THE THRESHOLD IS PER DISPLAY TYPE. poursort's own frames measure 13.7-17.7%
on iPad and 34.2-54.4% on iPhone. Same app, same capture pass, same quality --
the iPad layout simply spreads a phone-shaped design over a much larger canvas.
A single threshold would either pass every bad iPad frame or fail every good
iPad one. This was the first thing the measurements showed and it is the only
part of this file I would defend strongly.

HOW THIN THE CALIBRATION IS, stated plainly because the number looks more
authoritative than it is. The iPad threshold separates two frames:

    foldup-1      8.73%   BAD   level grid, numbers at 3.35:1, 21% dead top band
    loopwits-1   12.41%   GOOD  menu, but three named puzzle types with real
                                descriptions, a streak and "2 of 3 solved"

and is sanity-checked against the extremes:

    minestreak-1  4.88%   BAD   menu with no board at all
    poursort      13.7-17.7%    GOOD (audited by hand)
    loopwits-2   28.75%   GOOD  a real puzzle mid-solve

Eight iPad frames, one of them borderline. Treat 10% as a line drawn between
two specific pictures, not as a discovered constant, and move it when better
exemplars exist.

The iPhone threshold was 15% and is now 22%. It began weaker than the iPad one:
every iPhone frame available when this was written was a good one (34.2% at
worst), so with no bad exemplar it was set well below the observed good minimum
to avoid guessing. It has since fired three times and acquired the exemplars it
lacked:

    trilite  02-settings    7.31%   BAD
    quiktap  02-settings    7.31%   BAD
    trilite  01-home       13.12%   BAD  -- a third of a scrolling screen
    ratherly 01-home       32.24%   GOOD
    namewell 01-in-use     32.72%   GOOD
    poursort iPhone       34.3-54.4%  GOOD

which showed 15% was in the wrong place: 1.9 points above the worst bad frame
and 17.2 below the worst good. It caught trilite by a hair, and any bad frame
between 15% and 32% would have passed in silence. 22% sits near the middle of
a 19-point gap -- 8.9 above the worst bad, 10.2 below the worst good.

That asymmetry is worth naming because it is invisible by construction. We had
evidence the floor did not OVER-fire (three catches, no false positives) and
none at all about whether it UNDER-fired, because a false negative produces a
screenshot that ships. "No false positives" is not evidence a threshold is
correctly placed; it is evidence about one side of it.

WHAT THIS DELIBERATELY DOES NOT CATCH. knotter-1 measures 20.73% and is a bad
screenshot -- its level numbers sit at 3.38:1 against their tiles. Density has
nothing to say about that; it is a contrast defect and check-shot-contrast is
where it belongs. A frame passing here is not a frame worth shipping.

Usage:
    check-shot-density.py <png> [<png> ...]

Exit 0 when every frame carries enough content, 1 when any does not.
"""

from __future__ import annotations

import collections
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# check-shot-clean.py owns the dependency-free PNG decoder; importing it keeps
# one decoder in the tree rather than two that can disagree.
_spec = importlib.util.spec_from_file_location(
    "shotclean", HERE.parent.parent.parent / "scripts" / "check-shot-clean.py"
)
if _spec is None or _spec.loader is None:  # pragma: no cover
    print("cannot locate check-shot-clean.py for its PNG decoder", file=sys.stderr)
    raise SystemExit(2)
_shotclean = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_shotclean)

# Keyed on the long edge, which separates the two device families without
# needing the caller to tell us which it captured.
IPAD_MIN_CONTENT = 10.0
IPHONE_MIN_CONTENT = 22.0


def content_fraction(path: Path) -> tuple[float, int, int]:
    """Percentage of the frame that is not background, plus its dimensions."""
    rows, w, h, ch = _shotclean.rows(str(path))

    # The modal colour of a coarse sample is the ground. Quantised to 3 bits per
    # channel so that a gradient or a compression artefact does not split the
    # background into a hundred near-identical colours and lose the mode.
    counts: collections.Counter = collections.Counter()
    for y in range(0, h, 16):
        row = rows[y]
        for x in range(0, w, 16):
            i = x * ch
            counts[(row[i] // 8, row[i + 1] // 8, row[i + 2] // 8)] += 1
    bg = counts.most_common(1)[0][0]

    content = total = 0
    for y in range(0, h, 4):
        row = rows[y]
        for x in range(0, w, 4):
            i = x * ch
            total += 1
            distance = (
                abs(row[i] // 8 - bg[0])
                + abs(row[i + 1] // 8 - bg[1])
                + abs(row[i + 2] // 8 - bg[2])
            )
            if distance > 2:
                content += 1
    return 100.0 * content / max(total, 1), w, h


def main() -> int:
    paths = [Path(a) for a in sys.argv[1:] if not a.startswith("--")]
    if not paths:
        print("usage: check-shot-density.py <png> [<png> ...]", file=sys.stderr)
        return 2

    failures = []
    for path in paths:
        pct, w, h = content_fraction(path)
        is_pad = min(w, h) >= 1600
        floor = IPAD_MIN_CONTENT if is_pad else IPHONE_MIN_CONTENT
        kind = "iPad" if is_pad else "iPhone"
        ok = pct >= floor
        print(
            f"{'SPARSE' if not ok else 'ok    '}  {pct:5.2f}% content "
            f"({kind}, floor {floor:.0f}%)  {path.name}"
        )
        if not ok:
            failures.append(path)

    if failures:
        print(
            f"\n{len(failures)} frame(s) show too little of the product.\n"
            "This is not a rendering fault -- the app is almost certainly fine and\n"
            "the picture is accurate. It is a picture of the app doing nothing.\n"
            "Drive the app into a real state (start a game, fill the board, play a\n"
            "round) and capture that instead of the first screen after launch."
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
