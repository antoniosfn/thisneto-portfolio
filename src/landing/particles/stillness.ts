/**
 * Stillness: the field's involuntary motion (the vacuum float of the whole
 * form and of each particle, orbits, sway, water, smoke, the tumble of the
 * triangles) is driven by an ambient clock that slows to a stop while a form is
 * complete and picks up again where it left off when the form starts to change.
 * Hover, scroll morphs, bursts and flows never use this clock.
 */
/** Distance from a whole form (progress, explode, seed) that still counts as complete. */
export const STILL_TOLERANCE = 0.015;
/** Share of the gap closed per 60 Hz frame: the clock winds down in ~0.5 s. */
export const STILL_EASE = 0.06;

/** Advance the clock by `delta` seconds, scaled by how far from still the field is. */
export function advanceClock(clock: number, delta: number, still: number) {
  return clock + Math.max(0, delta) * (1 - still);
}
