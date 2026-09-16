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

# Detail per unit of covered area. See `structure_ratio` below.
MIN_DETAIL_RATIO = 0.045


def measure(path: Path) -> tuple[float, float, int, int]:
    """(content %, detail ratio, width, height).

    COVERAGE ALONE IS NOT ENOUGH, and scanlit proved it. Its scan screen is a
    camera viewport filling roughly 60% of the frame; a simulator has no camera,
    so the viewport renders as a flat filled box. It measured 49.47% content and
    passed comfortably -- **the box is covered, and there is nothing in it**.
    No threshold fixes that: 49% is nowhere near any floor either of us would
    set, and raising the floor makes it worse, not better.

    So a second measure. Real interface has internal detail -- text, borders,
    controls -- and its edge count scales with the AREA it occupies. A flat
    region has edges only at its perimeter, which scales with the perimeter.
    So detail-per-covered-area collapses as a blank region grows, while it
    stays roughly constant for genuine UI at any size:

        frame                  content%   structure%   ratio
        blank viewport (BAD)     49.32       1.44      0.029
        mid-solve (GOOD)         28.80       1.82      0.063
        menu w/ content (GOOD)   12.43       1.09      0.088
        poursort iPhone (GOOD)   54.59       5.20      0.095
        poursort iPhone (GOOD)   34.36       3.28      0.095

    Note the structure column alone would be useless: the blank viewport scores
    1.44, ABOVE a perfectly good frame at 1.09. Only the ratio separates them.

    ONE BAD EXEMPLAR. This rests on a single frame, with the nearest good one
    2.2x above it. That is a wider margin than the density floor ever had, and
    it is still one example -- treat 0.045 as a line drawn under one picture.
    The same caution the iPhone floor needed, for the same reason.
    """
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

    content = total = edges = samples = 0
    dx = 4
    for y in range(0, h, 4):
        row = rows[y]
        for x in range(0, w - dx, 4):
            i = x * ch
            total += 1
            distance = (
                abs(row[i] // 8 - bg[0])
                + abs(row[i + 1] // 8 - bg[1])
                + abs(row[i + 2] // 8 - bg[2])
            )
            if distance > 2:
                content += 1
            # Horizontal neighbour four pixels away: an edge is a visible step
            # in any channel. Sampling one axis is enough -- text and borders
            # produce horizontal transitions everywhere.
            j = (x + dx) * ch
            samples += 1
            if (
                abs(row[i] - row[j])
                + abs(row[i + 1] - row[j + 1])
                + abs(row[i + 2] - row[j + 2])
            ) > 24:
                edges += 1

    pct = 100.0 * content / max(total, 1)
    structure = 100.0 * edges / max(samples, 1)
    return pct, (structure / pct if pct > 0 else 0.0), w, h


def main() -> int:
    paths = [Path(a) for a in sys.argv[1:] if not a.startswith("--")]
    if not paths:
        print("usage: check-shot-density.py <png> [<png> ...]", file=sys.stderr)
        return 2

    failures = []
    for path in paths:
        pct, detail, w, h = measure(path)
        is_pad = min(w, h) >= 1600
        floor = IPAD_MIN_CONTENT if is_pad else IPHONE_MIN_CONTENT
        kind = "iPad" if is_pad else "iPhone"
        sparse = pct < floor
        blank = not sparse and detail < MIN_DETAIL_RATIO
        label = "SPARSE" if sparse else ("BLANK " if blank else "ok    ")
        print(
            f"{label}  {pct:5.2f}% content  detail {detail:.3f} "
            f"({kind}, floor {floor:.0f}%)  {path.name}"
        )
        if sparse or blank:
            failures.append(path)

    if failures:
        print(
            f"\n{len(failures)} frame(s) show too little of the product.\n"
            "SPARSE: too little of the frame is covered.\n"
            "BLANK:  the frame is covered by something with no detail in it --\n"
            "        usually a view that cannot render in a simulator, such as a\n"
            "        camera preview, which comes out as a flat filled box.\n\n"
            "This is not a rendering fault -- the app is almost certainly fine and\n"
            "the picture is accurate. It is a picture of the app doing nothing.\n"
            "Drive the app into a real state (start a game, fill the board, play a\n"
            "round) and capture that instead of the first screen after launch."
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
