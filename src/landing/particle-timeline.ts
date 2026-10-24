/**
 * Choreography of dala.craftedbygc.com, read from its production bundle: every
 * uniform is a sum of clamped linear maps of the section progress f, where
 * f = section index + scrolled fraction of that section. Keying the pose to the
 * copy's sections, not to pixels, keeps background and text locked together at
 * any viewport size. See docs/particle-experience.md.
 */
export type ParticlePose = {
  progress: number;
  progress2: number;
  explode: number;
  offset: [number, number, number];
  rotation: [number, number, number];
  factor: number;
};

export const BASE_FACTOR = { desktop: 4.35, mobile: 2.5 } as const;
const PI = Math.PI;

/** Linear map of f from [a, b] to [c, d], clamped to the image interval. */
export function ramp(f: number, a: number, b: number, c = 0, d = 1) {
  // Dala's 5.5→5.5 map divides by zero; read as the step it produces.
  if (a === b) return f >= a ? d : c;
  const value = c + ((f - a) / (b - a)) * (d - c);
  return Math.min(Math.max(c, d), Math.max(Math.min(c, d), value));
}

/** Same as ramp, with Dala's explicit clamp bounds when they differ from [c, d]. */
function rampWithin(
  f: number,
  a: number,
  b: number,
  c: number,
  d: number,
  low: number,
  high: number,
) {
  const value = a === b ? (f >= a ? d : c) : c + ((f - a) / (b - a)) * (d - c);
  return Math.min(high, Math.max(low, value));
}

function rotation(f: number, yEnd: number): [number, number, number] {
  const y =
    ramp(f, 0, 1, 0, -PI / 2) +
    ramp(f, 2.7, 3, 0, PI / 2) +
    ramp(f, 3.3, 3.5, 0, PI / 4) -
    ramp(f, 4.5, 5, 0, 1.25 * PI) +
    ramp(f, 5.7, yEnd, 0, PI);
  const z = ramp(f, 2.7, 3, 0, -0.489) + ramp(f, 3.3, 3.5, 0, 0.6);
  return [0, y, z];
}

export function desktopPose(f: number): ParticlePose {
  const x =
    ramp(f, 0, 1, 3, -4.5) +
    ramp(f, 1.25, 1.5, 0.905, 5) -
    ramp(f, 2.8, 3, 0.905, 3) +
    ramp(f, 3.3, 3.5, 0.905, 6) -
    rampWithin(f, 4.5, 5, 0.905, 5, 0.905, 4);
  const y =
    ramp(f, 2.7, 3, 0, 0.5) -
    ramp(f, 3.3, 3.5, 0, 0.5) +
    ramp(f, 5.7, 6, 0, 1.75);
  return {
    offset: [x, y, 0],
    rotation: rotation(f, 6),
    explode:
      ramp(f, 1.1, 2.2) - ramp(f, 2.8, 3) + ramp(f, 4.5, 5) - ramp(f, 5.7, 6),
    factor:
      BASE_FACTOR.desktop +
      ramp(f, 0, 1) -
      ramp(f, 1.25, 1.5) +
      ramp(f, 3.3, 3.5, 0, 0.3) -
      ramp(f, 5.7, 6),
    progress: ramp(f, 2.7, 3) + ramp(f, 3.3, 3.5) + ramp(f, 5.7, 6),
    progress2:
      ramp(f, 0, 1) - ramp(f, 2.7, 3) + ramp(f, 3, 3.5) - ramp(f, 5.5, 5.5),
  };
}

/**
 * Dala's small-screen branch keeps factor and progress2 fixed and only moves x.
 * The vertical offset is mirrored (+2 → −2) because this portfolio stacks the
 * shape below its title, while Dala's copy sits below the shape.
 */
export function mobilePose(f: number): ParticlePose {
  return {
    offset: [ramp(f, 0, 1, 1.5, 0), -2, 0],
    rotation: rotation(f, 5.8),
    explode:
      ramp(f, 1.4, 1.7) - ramp(f, 2.7, 3) + ramp(f, 4.5, 5) - ramp(f, 5.7, 5.8),
    factor: BASE_FACTOR.mobile,
    progress: ramp(f, 2.7, 3) + ramp(f, 3.3, 3.5) + ramp(f, 5.7, 5.8),
    progress2: 0,
  };
}

/**
 * Section progress of each data-particle-stage anchor. Dala's beats sit on its
 * sections (0 hero, 1 introduction, 2–3 manifesto, 3 bulb, 3.5 globe, 5 team,
 * 6 footer); this portfolio's ten stages are mapped onto the same beats.
 */
export const STAGE_PROGRESS = [0, 1, 2.2, 3, 3.5, 5, 5.2, 5.4, 5.6, 6] as const;

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
