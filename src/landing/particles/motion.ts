import { Vector2 } from "three";
import type { ParticlePose } from "./timeline";

export const STEP = 1 / 60;

/**
 * Per-frame constants from Dala's bundle. Dala applies them once per animation
 * frame; here they are normalised to its 60 Hz frame, so 120 Hz screens follow
 * the same curve instead of easing twice as fast.
 */
export const POSE_EASE = 0.1;
export const ROTATION_EASE = 0.075;
export const MOUSE_EASE = 0.075;
export const DELTA_DECAY = 0.1;
export const DELTA_GAIN = 50;
export const DELTA_LIMIT = 2;

/** Fraction of the remaining distance covered after `frames` 60 Hz frames. */
export function ease(perFrame: number, frames: number) {
  return 1 - (1 - perFrame) ** frames;
}

export function createPose(): ParticlePose {
  return {
    progress: 0,
    explode: 0,
    explodeMix: 0,
    seed: 0,
    page: 0,
    scene: 0,
    detail: 0,
    factor: 0,
    offset: [0, 0, 0],
    rotation: [0, 0, 0],
    book: [0, 0, 0, 1],
    atom: [0, 0, 0, 1],
  };
}

const SCALARS = ["progress", "explode", "explodeMix", "seed", "page", "scene", "detail", "factor"] as const;

/** Move the rendered pose toward the scroll target, as Dala's uniforms do. */
export function easePose(
  current: ParticlePose,
  target: ParticlePose,
  frames: number,
) {
  const k = ease(POSE_EASE, frames),
    r = ease(ROTATION_EASE, frames);
  for (const key of SCALARS) current[key] += (target[key] - current[key]) * k;
  for (let i = 0; i < 3; i++) {
    current.offset[i] += (target.offset[i] - current.offset[i]) * k;
    current.rotation[i] += (target.rotation[i] - current.rotation[i]) * r;
  }
  for (let i = 0; i < 4; i++) {
    current.book[i] += (target.book[i] - current.book[i]) * k;
    current.atom[i] += (target.atom[i] - current.atom[i]) * k;
  }
}

/**
 * Dala's pointer chain: each move sets an impulse of 50 × the NDC step, limited
 * to ±2; the impulse decays by 10% per frame and both the cursor and the
 * shader's u_delta chase their targets at 7.5% per frame.
 */
export class PointerMotion {
  readonly target = new Vector2(10, 10);
  readonly mouse = new Vector2(10, 10);
  readonly delta = new Vector2();
  private readonly impulse = new Vector2();
  private active = false;

  get isActive() {
    return this.active;
  }

  move(x: number, y: number) {
    if (!this.active) {
      // Entering the page is a placement, not a movement.
      this.mouse.set(x, y);
      this.target.set(x, y);
      this.impulse.set(0, 0);
    }
    this.impulse
      .set(x - this.target.x, y - this.target.y)
      .multiplyScalar(DELTA_GAIN)
      .clampScalar(-DELTA_LIMIT, DELTA_LIMIT);
    this.target.set(x, y);
    this.active = true;
  }

  leave() {
    this.active = false;
    this.impulse.set(0, 0);
    this.delta.set(0, 0);
  }

  step(frames: number) {
    this.impulse.multiplyScalar((1 - DELTA_DECAY) ** frames);
    const k = ease(MOUSE_EASE, frames);
    this.mouse.lerp(this.target, k);
    this.delta.lerp(this.impulse, k);
  }
}
