/**
 * Scroll choreography: every uniform is a sum of clamped linear maps of the
 * section progress f (stage index + scrolled fraction), the grammar read from
 * dala.craftedbygc.com's bundle. The forms and beats are this portfolio's:
 *
 *   f 0  hero          trefoil knot, nearly frontal, right of the copy
 *   f 1  manifesto     knot turns frontal and grows, left of the copy
 *   f 2  manifesto line  knot explodes into the cloud (crest on top)
 *   f 3  Matemática    cloud condenses into the Lorenz attractor, left
 *   f 4  Engenharia    morphs into the geodesic truss
 *   f 5  IA            morphs into the layered neural network
 *   f 6  Desafios      morphs into the fragmented cube, right of the copy
 *   f 7–10 projects…FAQ  explodes into a sparse cloud behind the reading
 *   f 11 contact       condenses into the portfolio mark above the copy
 *
 * Form k of the atlas is shown at u_progress = k. See docs/particle-experience.md.
 */
export type ParticlePose = {
  progress: number;
  progress2: number;
  explode: number;
  offset: [number, number, number];
  rotation: [number, number, number];
  factor: number;
};

export const BASE_FACTOR = { desktop: 4.35, mobile: 2.2 } as const;
const PI = Math.PI;

/** Linear map of f from [a, b] to [c, d], clamped to the image interval. */
export function ramp(f: number, a: number, b: number, c = 0, d = 1) {
  if (a === b) return f >= a ? d : c;
  const value = c + ((f - a) / (b - a)) * (d - c);
  return Math.min(Math.max(c, d), Math.max(Math.min(c, d), value));
}

/** Morph to form k across the end of the scroll toward stage `at`. */
const arrive = (f: number, at: number) => ramp(f, at - 0.55, at);

function progress(f: number) {
  return (
    arrive(f, 3) + // Lorenz
    arrive(f, 4) + // truss
    arrive(f, 5) + // neural network
    arrive(f, 6) + // cube
    ramp(f, 10.6, 11) // mark
  );
}

function explode(f: number) {
  return (
    ramp(f, 1.1, 2) - // knot → cloud
    arrive(f, 3) + // cloud → Lorenz
    ramp(f, 6.4, 7) - // cube → sparse cloud
    ramp(f, 10.6, 11) // cloud → mark
  );
}

// The trefoil reads at a glance in the hero, then turns fully frontal; the
// Lorenz wings keep a slight yaw so their depth shows.
const HERO_YAW = -1.15;
const LORENZ_YAW = 0.35;

function rotation(f: number): [number, number, number] {
  // Hero 3/4 view → frontal knot; Lorenz and network face the camera; the cube
  // shows its classic corner view; the cloud turns half a revolution; the mark
  // returns to a frontal pose.
  const y =
    HERO_YAW +
    ramp(f, 0, 1, 0, -(PI / 2 + HERO_YAW)) +
    arrive(f, 3) * (PI / 2 + LORENZ_YAW) +
    ramp(f, 3, 5.45, 0, 0.5) +
    arrive(f, 6) * (PI / 4 - 0.5 - LORENZ_YAW) +
    ramp(f, 6.4, 7, 0, -PI) +
    ramp(f, 10.6, 11, 0, PI - PI / 4);
  const x = arrive(f, 6) * 0.5 - ramp(f, 10.6, 11, 0, 0.5);
  return [x, y, 0];
}

export function desktopPose(f: number): ParticlePose {
  const x =
    ramp(f, 0, 1, 3, -4.5) +
    ramp(f, 1.25, 1.5, 0, 4.095) + // centre the cloud (−0.405)
    ramp(f, 2.6, 3, 0, -2.095) + // chapters: left of the copy (−2.5)
    arrive(f, 6) * 5.1 + // challenges: right of the copy (+2.6)
    ramp(f, 6.4, 7, 0, -3.1) + // reading sections: centred cloud (−0.5)
    ramp(f, 10.6, 11, 0, 0.5);
  return {
    offset: [x, ramp(f, 10.6, 11, 0, 1.75), 0],
    rotation: rotation(f),
    explode: explode(f),
    factor: BASE_FACTOR.desktop + ramp(f, 0, 1) - ramp(f, 1.25, 1.5),
    progress: progress(f),
    progress2: ramp(f, 0, 1) - arrive(f, 3),
  };
}

/**
 * Small screens stack copy and shape, so the shape stays centred low, below
 * the title (y = −2.9), and keeps one size; the mark rises to 0.42 H, just
 * above the contact copy.
 */
export function mobilePose(f: number): ParticlePose {
  return {
    offset: [ramp(f, 0, 1, 0.6, 0), -2.9 + ramp(f, 10.6, 11, 0, 3.65), 0],
    rotation: rotation(f),
    explode: explode(f),
    factor: BASE_FACTOR.mobile,
    progress: progress(f),
    progress2: 0,
  };
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
