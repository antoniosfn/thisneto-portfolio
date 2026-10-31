import type { Raster } from "./png";
import { ANCHORS, REFERENCE, REGIONS, SCENE_MOTION, regionAt } from "./regions";

/**
 * Same shape as FormData on the v6 branch (forms/compose.ts), so the scene
 * drops into the forms atlas as one more form.
 */
export type SceneForm = {
  name: string;
  points: Float32Array; // xyz, field frame
  colors: Float32Array; // rgb, raw sRGB
  emission: Float32Array;
  ranks: Float32Array; // arrival order: outwards from the couple
  motion: Float32Array; // type, a, b, size ÷ 2 (motion params stay in [−1, 1])
  edges: number[];
  /** Region index per particle (REGIONS), for checks; not stored. */
  region?: Int8Array;
};

/**
 * The field's 16 384 particles arrive first and draw the whole scene coarsely
 * (any prefix of the shuffled indices covers the picture); a detail layer of
 * light triangles then completes the drawing to the reference's density.
 */
export const CORE = 16384;
export const DETAIL = 32768;
/** Depth is halved from the regions' values: the scene reads as a picture. */
const DEPTH = 0.5;

/** The picture's height in the field frame; its width follows the aspect. */
export const SCENE_HEIGHT = 1.9;
export const SCENE_WIDTH = (SCENE_HEIGHT * REFERENCE.width) / REFERENCE.height;
/** Scene geometry the shader motions need, in the field frame. */
export const SCENE = {
  fallsTop: toY(ANCHORS.fallsTop),
  fallsBottom: toY(ANCHORS.fallsBottom),
  chimney: [toX(ANCHORS.chimney[0]), toY(ANCHORS.chimney[1])] as const,
} as const;

function toX(x: number) {
  return (x / REFERENCE.width - 0.5) * SCENE_WIDTH;
}
function toY(y: number) {
  return (0.5 - y / REFERENCE.height) * SCENE_HEIGHT;
}

/** Spacing of the waterfall's strands, in reference pixels. */
const STRAND = 7;

/** Deterministic hash in [0, 1). */
function random(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Particles from the picture's own pixels (technique C of the bg3d plan):
 * brightness and edges decide where particles go, so the strokes of the
 * drawing — trunks, roof, the couple's outline — come out as dense lines;
 * each region adds depth, motion and its share of the budget.
 */
export function buildScene(image: Raster, count: number): SceneForm {
  const { width, height, channels, data } = image;
  const scale = REFERENCE.width / width;
  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++)
    luma[i] = 0.3 * data[i * channels] + 0.59 * data[i * channels + 1] + 0.11 * data[i * channels + 2];
  const regionOf = new Int8Array(width * height);
  const edgeOf = new Float32Array(width * height);
  const weight = new Float64Array(width * height);
  let total = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const r = regionAt((x + 0.5) * scale, (y + 0.5) * scale);
      regionOf[i] = r;
      const gx = luma[y * width + Math.min(width - 1, x + 1)] - luma[y * width + Math.max(0, x - 1)];
      const gy = luma[Math.min(height - 1, y + 1) * width + x] - luma[Math.max(0, y - 1) * width + x];
      const edge = Math.min(1, Math.hypot(gx, gy) / 120);
      edgeOf[i] = edge;
      // Black is the void: only drawn pixels carry particles. Strokes (edges)
      // and bright marks outweigh flat fill, so trunks, the roof, the strands
      // of water and the couple's outline come out as lines, not dither.
      const lit = Math.max(0, luma[i] - 14) / 241;
      weight[i] = lit ** 1.3 * (0.35 + 2.2 * edge ** 0.8) * REGIONS[r].boost;
      total += weight[i];
    }

  // Systematic resampling along the raster: as many particles as each pixel's
  // share of the weight, spread evenly instead of clumping.
  const picks: number[] = [];
  const step = total / count;
  let next = step * random(1, 1),
    acc = 0;
  for (let i = 0; i < weight.length && picks.length < count; i++) {
    acc += weight[i];
    while (acc > next && picks.length < count) {
      picks.push(i);
      next += step;
    }
  }
  while (picks.length < count) picks.push(picks[picks.length - 1]);

  const form: SceneForm = {
    name: "finale",
    points: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    emission: new Float32Array(count),
    ranks: new Float32Array(count),
    motion: new Float32Array(count * 4),
    edges: [],
    region: new Int8Array(count),
  };
  const [coupleX, coupleY] = ANCHORS.couple;
  const reach = Math.hypot(REFERENCE.width, REFERENCE.height) * 0.62;
  // Shuffle so any prefix of the indices (small screens draw a prefix) still
  // covers the whole picture.
  const order = picks.map((_, k) => k).sort((a, b) => random(a, 9) - random(b, 9));
  picks.forEach((pixel, k) => {
    const slot = order[k];
    let px = ((pixel % width) + random(k, 2)) * scale;
    const py = (Math.floor(pixel / width) + random(k, 3)) * scale;
    const region = REGIONS[regionOf[pixel]];
    // Water gathers into strands, as the falls of the reference.
    if (region.motion === SCENE_MOTION.WATER)
      px = Math.round(px / STRAND) * STRAND + (random(k, 7) - 0.5) * STRAND * 0.35;
    const foliage = region.motion === SCENE_MOTION.LEAF;
    form.points.set(
      [toX(px), toY(py), DEPTH * region.depth(px, py) + (foliage ? (random(k, 4) - 0.5) * 0.05 : 0)],
      slot * 3,
    );
    const c = pixel * channels;
    const rgb = [data[c], data[c + 1], data[c + 2]].map((v) => v / 255);
    // A touch more saturation, and dim strokes lifted to a readable level
    // with their hue kept: the drawing's greens and teals read on black.
    const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
    const vivid = rgb.map((v) => Math.min(1, Math.max(0, mean + (v - mean) * 1.55)));
    const floor = region.motion === SCENE_MOTION.WATER ? 0.85 : 0.62;
    const lift = Math.max(1, floor / Math.max(0.05, ...vivid));
    form.colors.set(vivid.map((v) => Math.min(1, v * lift)), slot * 3);
    // Leaves keep their own light low, so highlights stay green, not white.
    const own = region.motion === SCENE_MOTION.LEAF ? 0.12 : 0.5;
    form.emission[slot] = Math.min(1, (luma[pixel] / 255) ** 2 * own + region.glow);
    form.ranks[slot] = Math.min(1, (Math.hypot(px - coupleX, py - coupleY) / reach) * 0.85 + 0.15 * random(k, 5));
    form.motion.set(motionOf(region.motion, px, py, k), slot * 4);
    form.motion[slot * 4 + 3] = region.size / 2;
    form.region![slot] = regionOf[pixel];
  });
  form.edges = sceneEdges(
    form,
    picks.map((pixel) => regionOf[pixel]),
    picks.map((pixel) => edgeOf[pixel]),
    order,
  );
  return form;
}

/** Motion parameters per type; see finale/shaders.ts for how each is played. */
function motionOf(type: number, px: number, py: number, k: number): [number, number, number, number] {
  const phase = random(k, 6);
  switch (type) {
    case SCENE_MOTION.WATER:
      // Random place in the fall's cycle: brightness picked the strands
      // (x); a sampled height would travel down as visible bands.
      return [type, phase, 0, 0];
    case SCENE_MOTION.SMOKE: {
      const h = (ANCHORS.chimney[1] - py) / (ANCHORS.chimney[1] - 320);
      return [type, Math.min(1, Math.max(0, h)), phase, 0];
    }
    case SCENE_MOTION.STILL:
      return [type, 0, 0, 0];
    default:
      return [type, phase, 0, 0];
  }
}

/** Lines of light between near neighbours of the same region. */
function sceneEdges(form: SceneForm, regionBySample: number[], edgeBySample: number[], order: number[]) {
  const count = form.ranks.length;
  const regionOfSlot = new Int8Array(count);
  const edgeOfSlot = new Float32Array(count);
  regionBySample.forEach((r, k) => (regionOfSlot[order[k]] = r));
  edgeBySample.forEach((e, k) => (edgeOfSlot[order[k]] = e));
  // In foliage, only particles sitting on a drawn stroke are joined.
  const joins = (i: number) => {
    const lines = REGIONS[regionOfSlot[i]].lines;
    return lines === true || (lines === "strokes" && edgeOfSlot[i] > 0.45);
  };
  const maxLength = 0.03;
  const cell = maxLength;
  const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    if (!joins(i)) continue;
    const k = key(form.points[i * 3], form.points[i * 3 + 1]);
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
  }
  const seen = new Set<number>();
  const edges: number[] = [];
  for (const bucket of grid.values())
    for (const i of bucket) {
      const x = form.points[i * 3],
        y = form.points[i * 3 + 1];
      const near: [number, number][] = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const j of grid.get(key(x + dx * cell, y + dy * cell)) ?? []) {
            if (j === i || regionOfSlot[j] !== regionOfSlot[i]) continue;
            const d = Math.hypot(form.points[j * 3] - x, form.points[j * 3 + 1] - y);
            if (d < maxLength) near.push([d, j]);
          }
      near.sort((a, b) => a[0] - b[0]);
      for (const [, j] of near.slice(0, 2)) {
        const id = Math.min(i, j) * count + Math.max(i, j);
        if (seen.has(id)) continue;
        seen.add(id);
        edges.push(i, j);
      }
    }
  return edges;
}
