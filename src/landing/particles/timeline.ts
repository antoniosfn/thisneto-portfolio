/**
 * Scroll choreography. Every value is a function of the section progress f
 * (stage index + scrolled fraction): sums of clamped linear ramps, the grammar
 * read from dala.craftedbygc.com, and keyframe tracks for placement.
 *
 *   f 0  hero            the trefoil knot
 *   f 1  manifesto       knot turns frontal and grows, left of the copy
 *   f 2  manifesto line  brief burst, then an organised current
 *   f 3–5 trajectory     Lorenz, geodesic truss, neural network (left)
 *   f 6–6.4 solutions     the cube alternates opposite the static copy
 *   f 7  projects title  the cube bursts and condenses into golden Saturn
 *   f 8–9 projects       book (top right) and atom (bottom left); a leaf per project
 *   f 10 process         both gather and rain down; the cloud becomes the landscape
 *   f 11 about          the landscape (house and waterfall) in the right column
 *   f 12 FAQ            the landscape becomes a light bulb
 *   f 13 contact        the bulb holds beside the invitation
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
  scene: number; // opening landscape weight (its size follows the viewport)
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

/**
 * Each form completes as its copy arrives. A centred block enters the viewport
 * (reveal at 85% of its height) about 0.44 stage before its anchor k, and its
 * lines have settled by k − 0.3. The tree (7) is skipped: the landscape covers
 * the field from 10.85 to 11.1, and only then does the atlas pass the tree on
 * its way to the bulb, so the tree is never seen.
 */
function progress(f: number) {
  return (
    ramp(f, 2.05, 2.65) + // Lorenz arrives before its copy
    ramp(f, 3.4, 3.95) + // longer Lorenz hold, gradual truss arrival
    ramp(f, 4.4, 4.95) + // neural network
    ramp(f, 5.4, 5.95) + // cube
    ramp(f, 6.7, 7.0) + // Saturn (7)
    ramp(f, 7.15, 8.0) + // longer formation of book and atom, complete at 8
    ramp(f, 10.88, 10.96) + // tree, hidden under the landscape
    ramp(f, 10.96, 11.04) // bulb, revealed as the landscape leaves (11.1–12)
  );
}

function explode(f: number) {
  return (
    ramp(f, 1.15, 1.45) - // knot → brief cloud
    ramp(f, 2.05, 2.65) + // cloud → Lorenz
    ramp(f, 6.55, 6.7) - // cube bursts
    ramp(f, 6.7, 7.0) + // … and reforms as Saturn
    ramp(f, 9.45, 9.6) - // book and atom rain down
    ramp(f, 9.62, 9.75) // … into the seed
  );
}

// The trefoil reads at a glance in the hero, then turns fully frontal; the
// Lorenz wings keep a slight yaw so their depth shows; the cube shows its
// classic corner; everything after faces the camera.
const HERO_YAW = -1.15;
const LORENZ_YAW = 0.35;
const yaw = [
  [0, 0],
  [0.85, HERO_YAW],
  [1, -PI / 2],
  [2.05, -PI / 2],
  [2.65, LORENZ_YAW],
  [5.4, LORENZ_YAW + 0.5],
  [5.95, PI / 4],
  [6.55, PI / 4],
  [7.0, 0],
] as const;
const pitch = [
  [5.4, 0],
  [5.95, 0.5],
  [6.55, 0.5],
  [7.0, 0],
] as const;

/** Shared beats; layouts differ in placement and size only. */
function beats(f: number) {
  return {
    progress: progress(f),
    explode: explode(f),
    explodeMix: ramp(f, 8, 8.5),
    seed: ramp(f, 9.62, 9.75),
    page: ramp(f, 8.0, 8.5) + ramp(f, 9.0, 9.3),
    // The landscape takes the tree's place in the about section.
    scene: ramp(f, 9.75, 10.85) - ramp(f, 11.1, 12),
    detail: ramp(f, 10.1, 10.85) - ramp(f, 11.1, 11.65),
    rotation: [track(f, pitch), track(f, yaw), 0] as Vec3,
  };
}

/** Book and atom travel to the centre before they rain down. */
function gather(f: number, at: Vec4, centre: Vec4): Vec4 {
  const t = ramp(f, 9.3, 9.58);
  return at.map((v, i) => v + (centre[i] - v) * t) as Vec4;
}

export function desktopPose(
  f: number,
  layout: Layout = "desktop",
): ParticlePose {
  const narrow = layout === "tablet" ? 0.62 : 1;
  const x = track(f, [
    [0, 3],
    [1, -4.5],
    [1.15, -4.5],
    [1.45, -0.4],
    [2.05, -0.4],
    [2.65, -2.5],
    [5.4, -2.5],
    [5.95, 2.6],
    [6.4, 2.6],
    [7.0, 3],
    [7.35, 3],
    [7.9, 0],
    [9.75, 0],
    // The tree and bulb share the right column.
    [10.85, 4.0],
    [11.1, 4.0],
    [12.0, 3.1],
    [12.6, 3.1],
    [13.0, 3.1],
  ]);
  const y = track(f, [
    [0, OBJECT_Y - 0.35],
    [2.05, OBJECT_Y - 0.35],
    [2.65, OBJECT_Y - 0.1],
    [3.35, OBJECT_Y - 0.65],
    [3.95, OBJECT_Y - 0.1],
    [4.35, OBJECT_Y - 0.65],
    [4.95, OBJECT_Y - 0.1],
    [5.35, OBJECT_Y - 0.65],
    [5.95, OBJECT_Y - 0.1],
    [6.4, OBJECT_Y - 0.35],
    [7.0, -0.45],
    [7.35, -0.45],
    [7.9, -0.75],
    [10.85, -0.75],
    [11.1, -0.75],
    [12.0, -0.65],
    [12.6, -0.65],
    [13.0, -0.6],
  ]);
  const factor =
    BASE_FACTOR[layout] *
    (1 +
      track(f, [
        [0, 0],
        [1, 0.23],
        [1.15, 0.23],
        [1.45, 0],
      ])) *
    // The tree fills more of the free column; the bulb returns to its own scale.
    track(f, [
      [6.4, 1],
      [7, 0.78],
      [7.35, 0.78],
      [7.9, 1],
      [9.75, 1],
      [10.85, 1.1],
      [11.1, 1.1],
      [12, 0.85],
      [12.6, 0.85],
      [13, 1],
    ]);
  return {
    ...beats(f),
    offset: [x * narrow, y, 0],
    factor,
    book: gather(f, [4.1 * narrow, 1.1, 0, 1.0], [0.7, -0.3, 0, 0.9]),
    atom: gather(f, [-3.35 * narrow, -1.35, 0, 1.15], [-0.7, -0.5, 0, 0.8]),
  };
}

/**
 * Stacked screens keep copy above the figure. Its centre follows a shallow
 * diagonal descent within the reserved lower area; the renderer fits its bounds.
 */
export const MOBILE_FIGURE_Y = -1.7;
export function mobilePose(f: number): ParticlePose {
  return {
    ...beats(f),
    offset: [
      track(f, [
        [0, 0],
        [1, 0],
        [2.05, 0.3],
        [2.65, 0.15],
        [3.35, -0.2],
        [3.95, 0.15],
        [4.35, -0.2],
        [4.95, 0.15],
        [5.35, -0.2],
        [5.95, 0],
      ]),
      track(f, [
        [0, MOBILE_FIGURE_Y],
        [1, MOBILE_FIGURE_Y],
        [1.45, MOBILE_FIGURE_Y],
        [2.65, MOBILE_FIGURE_Y + 0.25],
        [3.35, MOBILE_FIGURE_Y - 0.25],
        [3.95, MOBILE_FIGURE_Y + 0.25],
        [4.35, MOBILE_FIGURE_Y - 0.25],
        [4.95, MOBILE_FIGURE_Y + 0.25],
        [5.35, MOBILE_FIGURE_Y - 0.25],
        [5.95, MOBILE_FIGURE_Y],
        [7.35, MOBILE_FIGURE_Y],
        // Book and atom use centres relative to the same lower frame.
        [7.9, MOBILE_FIGURE_Y],
        [9.3, MOBILE_FIGURE_Y],
        [10.85, MOBILE_FIGURE_Y],
        [12, MOBILE_FIGURE_Y],
        [12.6, MOBILE_FIGURE_Y],
        [13, MOBILE_FIGURE_Y],
      ]),
      0,
    ],
    factor:
      BASE_FACTOR.mobile *
      track(f, [
        [0, 0.75],
        [1, 0.78],
        [1.45, 0.88],
      ]) *
      track(f, [
        [9.75, 1],
        [10.85, 1],
        [11.1, 1],
        [12, 0.78],
        [12.6, 0.78],
        [13, 1],
      ]),
    book: gather(f, [0.65, 0.45, 0, 0.6], [0.35, 0.35, 0, 0.55]),
    atom: gather(f, [-0.65, -0.7, 0, 0.58], [-0.35, -0.3, 0, 0.5]),
  };
}

export function pose(f: number, layout: Layout) {
  return layout === "desktop" ? desktopPose(f, layout) : mobilePose(f);
}

/** One beat per [data-particle-stage], in document order. */
export const STAGE_PROGRESS = [
  0, 1, 2, 3, 4, 5, 6, 6.2, 6.4, 7, 8, 9, 10, 11, 12, 13,
] as const;

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
