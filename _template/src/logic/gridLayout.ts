/**
 * How many columns fit a measured width, and how wide each one must be to
 * consume it exactly.
 *
 * This exists because of a bug a user reported from a device: a level grid of
 * fixed 56pt tiles in a wrapping row left a band of empty space against the
 * right edge, while the cards above and below ran the full width. The tiles
 * looked misaligned rather than deliberately narrow.
 *
 * The leftover is `width - (columns * cell + gaps)`, so it depends on the screen
 * — which is why it is invisible on whichever device the layout was written on,
 * and why this is arithmetic worth testing rather than eyeballing. Fitting the
 * cell up to absorb the remainder removes the gutter; centring the row would
 * only move it to both sides.
 */

export interface GridMetrics {
  /** Columns that fit. At least 1, even when the width is smaller than a cell. */
  columns: number;
  /** Cell edge length, chosen so `columns` of them plus gaps fill the width exactly. */
  cellSize: number;
}

/**
 * `width` is the measured inner width of the row. `minCell` is the smallest
 * comfortable tile; the real tile is sized up from it, never down, so a tile
 * never becomes smaller than the 44pt minimum touch target its caller chose.
 */
export function gridMetrics(
  width: number,
  minCell: number,
  gap: number,
): GridMetrics {
  // Before the first layout pass the width is 0. Report the minimum rather than
  // a NaN or an Infinity, so the first frame renders something sane.
  if (!Number.isFinite(width) || width <= 0)
    return { columns: 0, cellSize: minCell };

  // A row of n cells spans n*cell + (n-1)*gap. Adding one gap to both sides of
  // that inequality turns it into an exact division.
  const columns = Math.max(1, Math.floor((width + gap) / (minCell + gap)));
  const cellSize = (width - gap * (columns - 1)) / columns;
  return { columns, cellSize };
}
