/**
 * Scroll choreography. Every value is a function of the section progress f
 * (stage index + scrolled fraction): sums of clamped linear ramps, the grammar
 * read from dala.craftedbygc.com, and keyframe tracks for placement.
 *
 * Light sections are opaque and cover the field; every change of form happens
 * behind them, so each dark section opens on a complete figure.
 *
 *   f 0  hero (light)        the Lorenz waits, covered
 *   f 1  trajectory (dark)   Lorenz, right of the copy
 *   f 2  manifesto (light)   Lorenz → cube
 *   f 3–5 solutions (dark)   the cube alternates sides and turns a full 360°
 *   f 6  process (light)     cube → book and atom
 *   f 7  projects (dark)     book and atom, pages turning
 *   f 8  about (light)       book and atom → Saturn
 *   f 9  FAQ (dark)          Saturn, rings spinning, left of the questions
 *   f 10 contact (light)     Saturn → the landscape
 *   f 11 closing (dark)      the landscape, centred
 *
 * Form k of the atlas is shown at u_progress = k. See docs/particle-experience.md.
 */
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type ParticlePose = {
  progress: number;
  explode: number;
  explodeMix: number; // 0 radial burst, 1 rain downwards
  seed: number;
  page: number;
  scene: number; // landscape weight (its size follows the viewport)
  detail: number; // the landscape's detail layer, 0 → 1
  factor: number;
  offset: Vec3;
  rotation: Vec3;
  book: Vec4; // world centre xyz, scale
  atom: Vec4;
};
export type Layout = "desktop" | "tablet" | "mobile";

export const BASE_FACTOR = { desktop: 4.35, tablet: 3.9, mobile: 3.0 } as const;
const PI = Math.PI;
/** Dala's particle object sits at y = −1.19 in front of the camera. */
const OBJECT_Y = -1.19;

/** Linear map of f from [a, b] to [c, d], clamped to the image interval. */
export function ramp(f: number, a: number, b: number, c = 0, d = 1) {
  if (a === b) return f >= a ? d : c;
  const value = c + ((f - a) / (b - a)) * (d - c);
  return Math.min(Math.max(c, d), Math.max(Math.min(c, d), value));
}

/** Piecewise-linear keyframes [f, value], held flat outside the range. */
export function track(f: number, keys: readonly (readonly [number, number])[]) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++)
    if (f <= keys[i][0])
      return ramp(f, keys[i - 1][0], keys[i][0], keys[i - 1][1], keys[i][1]);
  return keys[keys.length - 1][1];
}

/** Each morph runs inside a light section, while the field is covered. */
function progress(f: number) {
  return (
    ramp(f, 2.1, 2.8) + // Lorenz → cube (manifesto)
    ramp(f, 6.1, 6.8) + // cube → book and atom (process)
    ramp(f, 8.1, 8.8) // book and atom → Saturn (about)
  );
}

/** The three solution beats: the cube's side, +1 right of the copy, −1 left. */
export const SOLUTION_SIDES = [
  [3.3, 1],
  [3.7, -1],
  [4.3, -1],
  [4.7, 1],
] as const;
/** Weight of the solution placement: on through the three beats. */
export function solutionWeight(f: number) {
  return ramp(f, 2.6, 2.95) - ramp(f, 5.55, 6.0);
}

// The Lorenz wings keep a slight yaw so their depth shows; the cube shows its
// classic corner and turns once around through the solutions.
const LORENZ_YAW = 0.35;
const CUBE_YAW = PI / 4;
const yaw = [
  [2.1, LORENZ_YAW],
  [2.8, CUBE_YAW],
  [3.0, CUBE_YAW],
  [5.5, CUBE_YAW + 2 * PI],
  [6.1, CUBE_YAW + 2 * PI],
  [6.8, 2 * PI],
] as const;
const pitch = [
  [2.1, 0],
  [2.8, 0.5],
  [5.5, 0.5],
  [6.8, 0],
] as const;

/** Shared beats; layouts differ in placement and size only. */
function beats(f: number) {
  return {
    progress: progress(f),
    explode: 0,
    explodeMix: 0,
    seed: 0,
    page: ramp(f, 6.9, 7.4) + ramp(f, 7.3, 7.9),
    scene: ramp(f, 10.1, 10.8),
    detail: ramp(f, 10.3, 10.9),
    rotation: [track(f, pitch), track(f, yaw), 0] as Vec3,
  };
}

export function desktopPose(
  f: number,
  layout: Layout = "desktop",
): ParticlePose {
  const narrow = layout === "tablet" ? 0.62 : 1;
  // Each figure takes the column opposite its copy.
  const x = track(f, [
    [2.1, 2.2],
    [2.8, 0],
    [8.1, 0],
    [8.8, -3.1],
  ]);
  // The Lorenz sits higher and smaller so both wings clear the fold.
  const y = track(f, [
    [2.1, OBJECT_Y + 0.55],
    [2.8, OBJECT_Y - 0.35],
    [8.1, OBJECT_Y - 0.35],
    [8.8, -0.45],
  ]);
  // Saturn grows to fill its column.
  const factor =
    BASE_FACTOR[layout] *
    track(f, [
      [2.1, 0.82],
      [2.8, 1],
      [8.1, 1],
      [8.8, 1.35],
    ]);
  return {
    ...beats(f),
    offset: [x * narrow, y, 0],
    factor,
    book: [3.9 * narrow, 0.95, 0, 1.05],
    atom: [1.9 * narrow, -1.55, 0, 1.15],
  };
}

/**
 * Stacked screens keep copy above the figure, which fills the lower area;
 * the renderer fits its bounds.
 */
export const MOBILE_FIGURE_Y = -1.7;
export function mobilePose(f: number): ParticlePose {
  return {
    ...beats(f),
    offset: [0, MOBILE_FIGURE_Y, 0],
    factor: BASE_FACTOR.mobile * 0.85,
    // Book over atom, each about as wide as the screen.
    book: [0, 0.95, 0, 1.35],
    atom: [0, -1.25, 0, 1.25],
  };
}

export function pose(f: number, layout: Layout) {
  return layout === "desktop" ? desktopPose(f, layout) : mobilePose(f);
}

/** One beat per [data-particle-stage], in document order. */
export const STAGE_PROGRESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

/** Section progress for a scroll position, interpolated between stage anchors. */
export function sectionProgress(position: number, stops: readonly number[]) {
  if (!stops.length) return 0;
  // Stages beyond the anchor table share its last beat.
  const last = Math.min(stops.length, STAGE_PROGRESS.length) - 1;
  let i = 0;
  while (i < last - 1 && position > stops[i + 1]) i++;
  const end = i + 1 <= last ? stops[i + 1] : undefined;
  if (end === undefined)
    return STAGE_PROGRESS[Math.min(i, STAGE_PROGRESS.length - 1)];
  const t = Math.max(
    0,
    Math.min(1, (position - stops[i]) / Math.max(1, end - stops[i])),
  );
  return STAGE_PROGRESS[i] + (STAGE_PROGRESS[i + 1] - STAGE_PROGRESS[i]) * t;
}
