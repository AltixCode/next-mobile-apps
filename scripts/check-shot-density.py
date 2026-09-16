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



# A dead viewport is a large flat box that is NOT the background.
#
# The previous BLANK rule was `detail < MIN_DETAIL_RATIO and variety <= 1`,
# where detail is edges-per-covered-area. That divides by coverage, so a frame
# is penalised for showing MORE of the product: toppl's real home screen scored
# the highest absolute edge density of any frame in the portfolio (0.041 x
# 42.61% = 1.75, against 1.08 for a passing loopwits frame) and was still called
# BLANK, because its 42.61% coverage dragged the ratio under the floor. foldup's
# board was discarded twice the same way. The rule got steadily more elaborate
# -- a colour-variety clause was bolted on for foldup -- while the underlying
# measure stayed inverted.
#
# Nothing global separates these cases. Measured on the known pair, the true
# blank scores BELOW a good frame on dominant colour (0.503 vs 0.875) and on
# bucket count (66 vs 57), so no threshold on either can work in both
# directions.
#
# What actually distinguishes a camera preview is spatial: it is one large
# CONTIGUOUS flat region in a colour that is not the page background. A dark UI
# has a large flat background too, which is why "flat" alone fails -- the
# region has to be foreign to the background to count.
#
#     scanlit dead viewport (true blank)   41.3%
#     multitick home (good)                 3.2%
#     loopwits in-use (good)                2.9%
#     toppl home (good, was rejected)       0.1%
#     worddrop home (good, light theme)     0.1%
#
# A 13x margin, against the 0.029-vs-0.041 the old rule tried to split.
CELL = 32
FLAT_SPREAD = 24
BLANK_BOX_PCT = 20.0


def largest_foreign_flat_box(rows, w: int, h: int, ch: int) -> float:
    """Largest connected run of flat cells differing from the background, in %."""
    gw, gh = w // CELL, h // CELL
    if gw == 0 or gh == 0:
        return 0.0

    palette: collections.Counter = collections.Counter()
    for gy in range(gh):
        row = rows[gy * CELL]
        for gx in range(gw):
            i = (gx * CELL) * ch
            palette[(row[i] // 16, row[i + 1] // 16, row[i + 2] // 16)] += 1
    background = palette.most_common(1)[0][0]

    flat = [[False] * gw for _ in range(gh)]
    for gy in range(gh):
        for gx in range(gw):
            values = []
            for dy in range(0, CELL, 8):
                row = rows[gy * CELL + dy]
                for dx in range(0, CELL, 8):
                    i = (gx * CELL + dx) * ch
                    values.append((row[i], row[i + 1], row[i + 2]))
            spread = max(max(v) for v in values) - min(min(v) for v in values)
            first = values[0]
            coarse = (first[0] // 16, first[1] // 16, first[2] // 16)
            flat[gy][gx] = spread < FLAT_SPREAD and coarse != background

    seen = [[False] * gw for _ in range(gh)]
    best = 0
    for gy in range(gh):
        for gx in range(gw):
            if not flat[gy][gx] or seen[gy][gx]:
                continue
            stack = [(gy, gx)]
            seen[gy][gx] = True
            size = 0
            while stack:
                y, x = stack.pop()
                size += 1
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < gh and 0 <= nx < gw and flat[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((ny, nx))
            best = max(best, size)
    return 100.0 * best / (gw * gh)


def measure(path: Path) -> tuple[float, float, int, int, int, float]:
    """(content %, detail ratio, colour variety, width, height).

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

    # Distinct colours covering at least 1% of the frame, background excluded.
    #
    # This is what actually separates a blank region from a board, and the
    # detail ratio alone does not. foldup's game screen -- four purple tiles on
    # a 3x3 grid, "Tap a tile, then its twin" -- scored 0.039 against a 0.045
    # threshold and was discarded twice as BLANK. It is the best frame that app
    # produces. A board of large flat tiles has exactly the edge-per-area
    # signature of one large flat box, because that is what it is made of.
    #
    # But a blank viewport is ONE colour and a board is several:
    #
    #     scanlit blank viewport (bad)      1
    #     foldup board (good, rejected)     3
    #     foldup level grid (good)          4
    #     knotter board (good)              7
    #
    # So BLANK now requires both a low detail ratio AND near-total colour
    # uniformity. A frame can have big flat shapes; it cannot have only one.
    palette: collections.Counter = collections.Counter()
    for y in range(0, h, 16):
        row = rows[y]
        for x in range(0, w, 16):
            i = x * ch
            palette[(row[i] // 16, row[i + 1] // 16, row[i + 2] // 16)] += 1
    ground = palette.most_common(1)[0][0]
    seen = sum(palette.values())
    variety = sum(
        1 for c, n in palette.items() if c != ground and n / max(seen, 1) >= 0.01
    )

    pct = 100.0 * content / max(total, 1)
    structure = 100.0 * edges / max(samples, 1)
    flat_box = largest_foreign_flat_box(rows, w, h, ch)
    return pct, (structure / pct if pct > 0 else 0.0), variety, w, h, flat_box


def main() -> int:
    paths = [Path(a) for a in sys.argv[1:] if not a.startswith("--")]
    if not paths:
        print("usage: check-shot-density.py <png> [<png> ...]", file=sys.stderr)
        return 2

    failures = []
    for path in paths:
        pct, detail, variety, w, h, flat_box = measure(path)
        is_pad = min(w, h) >= 1600
        floor = IPAD_MIN_CONTENT if is_pad else IPHONE_MIN_CONTENT
        kind = "iPad" if is_pad else "iPhone"
        sparse = pct < floor
        # All three must hold. The flat-box test is an ADDITIONAL condition on
        # the original rule, never a replacement for it: on its own it flags
        # hushtunnel's subscription list at 50.3% -- higher than the true blank
        # -- because a column of large flat cards has the same spatial
        # signature as a dead viewport. Intersecting the two is strictly more
        # conservative than either, so this can only ever clear a false
        # positive, never create one.
        blank = (
            not sparse
            and detail < MIN_DETAIL_RATIO
            and variety <= 1
            and flat_box >= BLANK_BOX_PCT
        )
        label = "SPARSE" if sparse else ("BLANK " if blank else "ok    ")
        print(
            f"{label}  {pct:5.2f}% content  flat-box {flat_box:4.1f}% "
            f"detail {detail:.3f} colours {variety} "
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
