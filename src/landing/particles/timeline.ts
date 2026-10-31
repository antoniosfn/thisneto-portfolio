/**
 * Scroll choreography. Every value is a function of the section progress f
 * (stage index + scrolled fraction): sums of clamped linear ramps, the grammar
 * read from dala.craftedbygc.com, and keyframe tracks for placement.
 *
 * Each figure condenses out of a cloud while its dark section rises to the
 * middle of the screen, complete at the section's anchor, and bursts back
 * into a cloud once the section leaves. Light sections cover the cloud.
 *
 *   f 0  hero (light)        cloud, covered
 *   f 1  trajectory (dark)   the Lorenz forms, filling the stage
 *   f 2  manifesto (light)   the Lorenz bursts
 *   f 3–5 solutions (dark)   the cube zigzags opposite the copy (right, left,
 *                            right), turning once on its axis at each crossing
 *   f 6  process (light)     the cube bursts
 *   f 7  projects (dark)     book and atom form, pages turning
 *   f 8  about (light)       they burst
 *   f 9  FAQ (dark)          Saturn forms, rings spinning
 *   f 10 contact (light)     Saturn bursts
 *   f 11 closing (dark)      the landscape forms, centred
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
/**
 * Figures fill their stage; the renderer then fits each one to the screen,
 * so this only needs to be larger than any fit.
 */
const FILL = 2.4;
const PI = Math.PI;

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

/**
 * Formation windows: the dark section at stage k rises from the bottom of the
 * screen to its middle between k − 0.5 and k.
 */
const FORMS = {
  // The Lorenz holds whole on both sides of its anchor, so scrolling back
  // up fragments it just as scrolling on does.
  lorenz: [0.55, 0.85],
  cube: [2.5, 3],
  bookAtom: [6.5, 7],
  saturn: [8.5, 9],
  landscape: [10.5, 11],
} as const;
/** Bursts: each figure leaves as its section scrolls away. */
const BURSTS = {
  lorenz: [1.15, 1.45],
  cube: [5.3, 5.6],
  bookAtom: [7.4, 7.7],
  saturn: [9.4, 9.7],
} as const;

/** The atlas changes form only while the field is a cloud. */
function progress(f: number) {
  return (
    ramp(f, ...FORMS.cube) +
    ramp(f, ...FORMS.bookAtom) +
    ramp(f, ...FORMS.saturn)
  );
}

function explode(f: number) {
  return (
    1 -
    ramp(f, ...FORMS.lorenz) +
    ramp(f, ...BURSTS.lorenz) -
    ramp(f, ...FORMS.cube) +
    ramp(f, ...BURSTS.cube) -
    ramp(f, ...FORMS.bookAtom) +
    ramp(f, ...BURSTS.bookAtom) -
    ramp(f, ...FORMS.saturn) +
    ramp(f, ...BURSTS.saturn) -
    ramp(f, ...FORMS.landscape)
  );
}

/**
 * The cube zigzags, always opposite the copy: +1 on the right for the first
 * and third solutions, −1 on the left for the second.
 */
export const CUBE_CROSSING = [
  [3.15, 1],
  [3.85, -1],
  [4.15, -1],
  [4.85, 1],
] as const;
/** Weight of the solution placement: on through the three beats. */
export function solutionWeight(f: number) {
  return ramp(f, 2.4, 2.5) - ramp(f, 5.6, 5.7);
}

// The Lorenz wings keep a slight yaw so their depth shows. The cube shows its
// classic corner and turns once to the left, on its own axis, as it crosses.
const LORENZ_YAW = 0.35;
const CUBE_YAW = PI / 4;
const yaw = [
  [1.7, LORENZ_YAW],
  [2.5, CUBE_YAW],
  // Each crossing turns it once on its own axis, towards where it goes.
  [3.15, CUBE_YAW],
  [3.85, CUBE_YAW - 2 * PI],
  [4.15, CUBE_YAW - 2 * PI],
  [4.85, CUBE_YAW],
  [5.6, CUBE_YAW],
  [6.5, 0],
] as const;
const pitch = [
  [1.7, 0],
  [2.5, 0.5],
  [5.6, 0.5],
  [6.5, 0],
] as const;

/** Shared beats; layouts differ in placement and size only. */
function beats(f: number) {
  return {
    progress: progress(f),
    explode: explode(f),
    explodeMix: 0,
    seed: 0,
    page: ramp(f, 7.0, 7.3) + ramp(f, 7.2, 7.4),
    scene: ramp(f, ...FORMS.landscape),
    detail: ramp(f, FORMS.landscape[0] + 0.2, FORMS.landscape[1]),
    rotation: [track(f, pitch), track(f, yaw), 0] as Vec3,
  };
}

/**
 * Book and atom are sized by their own placement, so the field keeps its base
 * scale while they are on stage; every other figure is fitted down from FILL.
 */
function fill(f: number) {
  return f > FORMS.bookAtom[0] - 0.3 && f < FORMS.saturn[0] ? 1 : FILL;
}

/** Where the Lorenz stands on desktop (field offset) and its scale. */
const LORENZ_AT = [1.9, -0.3] as const;
const LORENZ_SCALE = 1.4;

/** Desktop and tablet: figures centred on their stage, copy over them. */
export function desktopPose(
  f: number,
  layout: Layout = "desktop",
): ParticlePose {
  const narrow = layout === "tablet" ? 0.62 : 1;
  // The Lorenz keeps its place right of the copy, about half the stage tall;
  // the field recentres in the cloud before the cube forms.
  const lorenz = 1 - ramp(f, BURSTS.lorenz[1], FORMS.cube[0]);
  return {
    ...beats(f),
    offset: [LORENZ_AT[0] * narrow * lorenz, -0.1 + (LORENZ_AT[1] + 0.1) * lorenz, 0],
    factor: BASE_FACTOR[layout] * (fill(f) + (LORENZ_SCALE - fill(f)) * lorenz),
    // Book and atom share the stage, each about half its height.
    book: [2.7 * narrow, 0.9, 0, 1.75],
    atom: [-2.7 * narrow, -0.9, 0, 1.85],
  };
}

/** Stacked screens: the figure fills the stage below the first lines of copy. */
export const MOBILE_FIGURE_Y = -0.9;
export function mobilePose(f: number): ParticlePose {
  return {
    ...beats(f),
    offset: [0, MOBILE_FIGURE_Y, 0],
    factor: BASE_FACTOR.mobile * (fill(f) === 1 ? 0.85 : FILL),
    // Book over atom, each wider than the screen's reading column.
    book: [0, 1.55, 0, 1.65],
    atom: [0, -1.45, 0, 1.55],
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
