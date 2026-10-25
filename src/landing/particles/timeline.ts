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

/**
 * Each form completes as its copy arrives. A centred block enters the viewport
 * (reveal at 85% of its height) about 0.44 stage before its anchor k, and its
 * lines have settled by k − 0.3; every window below ends there, starts half a
 * stage earlier, and the form then holds until the next one starts at k + 0.2.
 */
function progress(f: number) {
  return (
    ramp(f, 2.2, 2.7) + // Lorenz (anchor 3)
    ramp(f, 3.2, 3.7) + // truss (4)
    ramp(f, 4.2, 4.7) + // neural network (5)
    ramp(f, 5.2, 5.7) + // cube (6)
    ramp(f, 6.5, 7.0) + // stream (7)
    ramp(f, 7.1, 7.6) + // book and atom (8)
    ramp(f, 9.75, 10.3) + // tree (10)
    ramp(f, 12.35, 12.8) + // Lia (13)
    ramp(f, 13.6, 14.0) // the closing scene (14)
  );
}

function explode(f: number) {
  return (
    ramp(f, 1.15, 1.45) - // knot → brief cloud
    ramp(f, 2.2, 2.7) + // cloud → Lorenz
    ramp(f, 6.2, 6.5) - // cube bursts
    ramp(f, 6.5, 7.0) + // … and lines up
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
  [0, HERO_YAW],
  [1, -PI / 2],
  [2.2, -PI / 2],
  [2.7, LORENZ_YAW],
  [5.2, LORENZ_YAW + 0.5],
  [5.7, PI / 4],
  [6.4, PI / 4],
  [7.0, 0],
] as const;
const pitch = [
  [5.2, 0],
  [5.7, 0.5],
  [6.4, 0.5],
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
    scene: ramp(f, 13.6, 14.0),
    detail: ramp(f, 13.8, 14.0),
    rotation: [track(f, pitch), track(f, yaw), 0] as Vec3,
  };
}

/** Book and atom travel to the centre before they rain down. */
function gather(f: number, at: Vec4, centre: Vec4): Vec4 {
  const t = ramp(f, 9.3, 9.58);
  return at.map((v, i) => v + (centre[i] - v) * t) as Vec4;
}

export function desktopPose(f: number, layout: Layout = "desktop"): ParticlePose {
  const narrow = layout === "tablet" ? 0.62 : 1;
  const x = track(f, [
    [0, 3],
    [1, -4.5],
    [1.15, -4.5],
    [1.45, -0.4],
    [2.2, -0.4],
    [2.7, -2.5],
    [5.2, -2.5],
    [5.7, 2.6],
    [6.4, 2.6],
    [7.0, 0],
    [9.75, 0],
    // Process, about and FAQ keep their copy on the left: the tree stands right.
    [10.3, 4.1],
    [12.35, 4.1],
    [12.8, 2.7],
    [13.6, 2.7],
    [14.0, 2.4], // the closing scene sits right of the contact copy
  ]);
  const y = track(f, [
    [6.4, OBJECT_Y],
    [7.0, 0],
    [12.35, 0],
    [12.8, -0.55],
    [13.6, -0.55],
    [14.0, 0.45], // a little up: the couple clears the footer text
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
 * Small screens stack copy and shape. The hero keeps the title above and the
 * shape below it; from the manifesto on, the copy sits in the lower half (see
 * MOBILE_COPY_ALIGN) and the shape in the upper half, under the header, so the
 * complete figure and its text never overlap. The visible height at z = 0 is
 * 9.33 world units: the upper half is centred at +2.1.
 */
export const MOBILE_FIGURE_Y = 2.1;
export function mobilePose(f: number): ParticlePose {
  return {
    ...beats(f),
    offset: [
      track(f, [[0, 0.5], [1, 0]]),
      track(f, [
        [0, -1.7],
        [1, -1.1],
        [1.45, MOBILE_FIGURE_Y],
        [14.0, MOBILE_FIGURE_Y],
      ]),
      0,
    ],
    factor: BASE_FACTOR.mobile * track(f, [[1, 1], [1.45, 0.88]]),
    // Book above, atom below it, both in the upper half.
    book: gather(f, [0.9, 3.2, 0, 0.7], [0.35, 2.4, 0, 0.55]),
    atom: gather(f, [-0.8, 1.3, 0, 0.66], [-0.35, 1.8, 0, 0.5]),
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
