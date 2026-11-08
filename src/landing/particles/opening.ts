/** Wall-clock length of the field's opening before `data-entered` flips. */
export const OPENING_SECONDS = 1.2;
/**
 * A single hitch cannot credit more than this. Slow GPUs still finish the
 * opening in a few frames; a background tab cannot skip it in one jump.
 */
export const OPENING_WALL_CAP = 1;

/**
 * The simulation caps each frame at 0.1s so a stall cannot explode the
 * spring. The opening flag used to share that cap, so a 1s GPU frame only
 * counted as 0.1s and `data-entered` stayed false for the whole CI timeout.
 * The flag follows real elapsed time instead.
 */
export function advanceOpening(show: number, elapsedSeconds: number) {
  const wall = Math.min(Math.max(0, elapsedSeconds), OPENING_WALL_CAP);
  const next = Math.min(1, show + wall / OPENING_SECONDS);
  return { show: next, entered: next >= 1 };
}
