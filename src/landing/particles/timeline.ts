/**
 * Scroll choreography. Every value is a function of the section progress f
 * (stage index + scrolled fraction): sums of clamped linear ramps, the grammar
 * read from dala.craftedbygc.com, and keyframe tracks for placement.
 *
 *   f 0  hero            trefoil knot, right of the copy
 *   f 1  manifesto       knot turns frontal and grows, left of the copy
 *   f 2  manifesto line  brief burst, then an organised current
 *   f 3–5 trajectory     Lorenz, geodesic truss, neural network (left)
 *   f 6  challenges      the cube, right of the copy
 *   f 7  projects title  the cube bursts; single file to the centre, forking
 *   f 8–9 projects       book (top right) and atom (bottom left); a leaf per project
 *   f 10 process         both gather, rain down into a seed; the tree grows
 *   f 11–12 about, FAQ   the Tree of Life, breathing
 *   f 13 Lia             the tree rises into the figure of Lia
 *   f 14 contact         Lia gives way to the closing scene, formed outwards
 *                        from the couple; a detail layer completes the drawing
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
  scene: number; // 0 → 1 into the closing scene (its size follows the viewport)
  detail: number; // the closing scene's detail layer, 0 → 1
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
    if (f <= keys[i][0]) return ramp(f, keys[i - 1][0], keys[i][0], keys[i - 1][1], keys[i][1]);
  return keys[keys.length - 1][1];
}

/** Each form completes before its copy is centred, and holds while it is read. */
function progress(f: number) {
  return (
    ramp(f, 2.15, 2.75) + // Lorenz
    ramp(f, 3.3, 3.8) + // truss
    ramp(f, 4.3, 4.8) + // neural network
    ramp(f, 5.3, 5.85) + // cube
    ramp(f, 6.5, 7.05) + // stream
    ramp(f, 7.15, 7.8) + // book and atom
    ramp(f, 10.15, 10.75) + // tree
    ramp(f, 12.5, 13.05) + // Lia
    ramp(f, 13.6, 14.0) // the closing scene
  );
}

function explode(f: number) {
  return (
    ramp(f, 1.15, 1.45) - // knot → brief cloud
    ramp(f, 2.15, 2.75) + // cloud → Lorenz
    ramp(f, 6.2, 6.5) - // cube bursts
    ramp(f, 6.5, 7.0) + // … and lines up
    ramp(f, 9.7, 9.88) - // book and atom rain down
    ramp(f, 9.95, 10.1) // … into the seed
  );
}

// The trefoil reads at a glance in the hero, then turns fully frontal; the
// Lorenz wings keep a slight yaw so their depth shows; the cube shows its
// classic corner; everything after faces the camera.
const HERO_YAW = -1.15;
const LORENZ_YAW = 0.35;
const yaw = [
  [0, HERO_YAW],
  [1, -PI / 2],
  [2.15, -PI / 2],
  [2.75, LORENZ_YAW],
  [5.3, LORENZ_YAW + 0.5],
  [5.85, PI / 4],
  [6.4, PI / 4],
  [7.0, 0],
] as const;
const pitch = [
  [5.3, 0],
  [5.85, 0.5],
  [6.4, 0.5],
  [7.0, 0],
] as const;

/** Shared beats; layouts differ in placement and size only. */
function beats(f: number) {
  return {
    progress: progress(f),
    explode: explode(f),
    explodeMix: ramp(f, 8, 8.5),
    seed: ramp(f, 9.95, 10.12),
    page: ramp(f, 8.0, 8.55) + ramp(f, 9.0, 9.55),
    scene: ramp(f, 13.6, 14.0),
    detail: ramp(f, 13.8, 14.0),
    rotation: [track(f, pitch), track(f, yaw), 0] as Vec3,
  };
}

/** Book and atom travel to the centre before they rain down. */
function gather(f: number, at: Vec4, centre: Vec4): Vec4 {
  const t = ramp(f, 9.4, 9.85);
  return at.map((v, i) => v + (centre[i] - v) * t) as Vec4;
}

export function desktopPose(f: number, layout: Layout = "desktop"): ParticlePose {
  const narrow = layout === "tablet" ? 0.62 : 1;
  const x = track(f, [
    [0, 3],
    [1, -4.5],
    [1.15, -4.5],
    [1.45, -0.4],
    [2.15, -0.4],
    [2.75, -2.5],
    [5.3, -2.5],
    [5.85, 2.6],
    [6.4, 2.6],
    [7.0, 0],
    [12.45, 0],
    [13.05, 2.7],
    [13.6, 2.7],
    [14.0, 0], // the closing scene fills the screen
  ]);
  const y = track(f, [
    [6.4, OBJECT_Y],
    [7.0, 0],
    [12.45, 0],
    [13.05, -0.55],
    [13.6, -0.55],
    [14.0, 0],
  ]);
  const factor =
    BASE_FACTOR[layout] *
    (1 + track(f, [[0, 0], [1, 0.23], [1.15, 0.23], [1.45, 0]]));
  return {
    ...beats(f),
    offset: [x * narrow, y, 0],
    factor,
    book: gather(f, [4.1 * narrow, 1.05, 0, 1.25], [0.7, -0.3, 0, 0.9]),
    atom: gather(f, [-3.35 * narrow, -1.15, 0, 1.15], [-0.7, -0.5, 0, 0.8]),
  };
}

/**
 * Small screens stack copy and shape: the shape stays centred and large,
 * slightly low in the hero (below the title); book and atom split the screen
 * diagonally; the tree and Lia fill the height.
 */
export function mobilePose(f: number): ParticlePose {
  return {
    ...beats(f),
    offset: [
      track(f, [[0, 0.5], [1, 0]]),
      track(f, [
        [0, -1.7],
        [1, -1.1],
        [6.4, -1.1],
        [7.0, 0],
        [12.45, 0],
        [13.05, -0.5],
        [13.6, -0.5],
        [14.0, 0],
      ]),
      0,
    ],
    factor: BASE_FACTOR.mobile,
    book: gather(f, [0.7, 2.05, 0, 0.82], [0.35, -0.2, 0, 0.6]),
    atom: gather(f, [-0.45, -2.1, 0, 0.72], [-0.35, -0.4, 0, 0.55]),
  };
}

export function pose(f: number, layout: Layout) {
  return layout === "mobile" ? mobilePose(f) : desktopPose(f, layout);
}

/** One beat per [data-particle-stage], in document order. */
export const STAGE_PROGRESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

/** Section progress for a scroll position, interpolated between stage anchors. */
export function sectionProgress(position: number, stops: readonly number[]) {
  if (!stops.length) return 0;
  // Stages beyond the anchor table share its last beat.
  const last = Math.min(stops.length, STAGE_PROGRESS.length) - 1;
  let i = 0;
  while (i < last - 1 && position > stops[i + 1]) i++;
  const end = i + 1 <= last ? stops[i + 1] : undefined;
  if (end === undefined) return STAGE_PROGRESS[Math.min(i, STAGE_PROGRESS.length - 1)];
  const t = Math.max(0, Math.min(1, (position - stops[i]) / Math.max(1, end - stops[i])));
  return STAGE_PROGRESS[i] + (STAGE_PROGRESS[i + 1] - STAGE_PROGRESS[i]) * t;
}
