import { Color, Vector3 } from "three";
import { random } from "./palette";
import { knnEdges, shuffle } from "./sampling";

export { MOTION } from "./catalog";

/** One form of the atlas: what every particle does when the form is shown. */
export type FormData = {
  name: string;
  points: Float32Array; // xyz in the field's normalised frame
  colors: Float32Array; // rgb, raw sRGB
  emission: Float32Array; // 0 dull … 1 white-hot focal point
  ranks: Float32Array; // arrival order in [0, 1]
  motion: Float32Array | null; // type, a, b, c
  edges: number[] | null; // particle index pairs drawn as lines of light
};

export type Motion = readonly [number, number, number, number];

/** A sampled piece of a form and how its particles look and move. */
export type Part = {
  points: Float32Array;
  color: (i: number, p: Vector3, out: Color) => void;
  emission?: (i: number, p: Vector3) => number;
  rank?: (i: number, p: Vector3) => number;
  motion?: (i: number, p: Vector3) => Motion;
  lines?: { k: number; maxLength: number };
};

export function emptyForm(name: string, count: number): FormData {
  return {
    name,
    points: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    emission: new Float32Array(count),
    ranks: new Float32Array(count),
    motion: null,
    edges: null,
  };
}

/** Integer shares of `total` proportional to `weights`, summing exactly. */
export function budget(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((total * w) / sum));
  counts[0] += total - counts.reduce((a, b) => a + b, 0);
  return counts;
}

/**
 * Place parts into `slots` (particle indices) of `form`. Slots are shuffled
 * first, so any prefix of the particle indices — mobile draws a prefix — holds
 * a fair sample of every part.
 */
export function fill(
  form: FormData,
  slots: number[],
  parts: Part[],
  seed: number,
) {
  const order = shuffle(slots, seed);
  const p = new Vector3(),
    color = new Color();
  let cursor = 0;
  for (const part of parts) {
    const count = part.points.length / 3;
    const mapped: number[] = [];
    for (let i = 0; i < count; i++) {
      const slot = order[cursor++];
      if (slot === undefined) throw new Error(`${form.name}: too many points`);
      mapped.push(slot);
      p.fromArray(part.points, i * 3);
      p.toArray(form.points, slot * 3);
      part.color(i, p, color);
      color.toArray(form.colors, slot * 3);
      form.emission[slot] = part.emission?.(i, p) ?? 0;
      form.ranks[slot] = part.rank?.(i, p) ?? random(slot, 91);
      if (part.motion) {
        form.motion ??= new Float32Array((form.points.length / 3) * 4);
        form.motion.set(part.motion(i, p), slot * 4);
      }
    }
    if (part.lines) {
      const local = knnEdges(part.points, part.lines.k, part.lines.maxLength);
      form.edges ??= [];
      for (const index of local) form.edges.push(mapped[index]);
    }
  }
  if (cursor !== slots.length)
    throw new Error(`${form.name}: ${slots.length - cursor} empty slots`);
}

/** Rescale `values` to span [0, 1]. */
export function normalise(values: number[]) {
  let low = Infinity,
    high = -Infinity;
  for (const v of values) {
    low = Math.min(low, v);
    high = Math.max(high, v);
  }
  return values.map((v) => (v - low) / Math.max(1e-9, high - low));
}
