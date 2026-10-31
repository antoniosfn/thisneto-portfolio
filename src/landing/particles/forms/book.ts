import { BufferGeometry, Euler, Matrix4, Vector3 } from "three";
import { BOOK } from "./catalog";
import { MOTION, budget, type Part } from "./compose";
import { random } from "./hash";
import { AMBER, GOLD, RED, WHITE, ramp } from "./palette";
import { concat, samplePoints, surface, tube } from "./primitives";
import { merge } from "./sampling";

/**
 * The half-open book of the reference: two blocks of curved leaves rising from
 * a V-shaped gutter, the fore-edges drawn as stacked lines, lines of text on
 * the top leaves, a red cover, and a plume of sparks rising from the gutter.
 * Built in the book's own frame (spine along z); the shader tilts it towards
 * the camera, places it and turns one leaf per project (motion PAGE).
 */
const LEAVES = 9; // per side
const TEXT_LINES = 13;

/** A point of leaf `j` (0 = bottom of the block) on side `side` (±1). */
export function leafPoint(side: number, j: number, u: number, v: number) {
  const fan = j / LEAVES;
  // Steep rise out of the gutter, then a gentle arch to the fore-edge.
  const arch =
    0.07 * Math.sqrt(Math.sin(Math.min(u * 1.9, 1) * (Math.PI / 2))) *
      (0.45 + 0.55 * fan) -
    0.025 * u * u;
  const x = BOOK.width * u;
  const y = arch + j * 0.0095 * (0.2 + u);
  const c = Math.cos(BOOK.open),
    s = Math.sin(BOOK.open);
  return new Vector3(side * (x * c - y * s), x * s + y * c, (v - 0.5) * BOOK.depth);
}

function leaf(side: number, j: number, inset = 0) {
  return surface(
    (u, v) => leafPoint(side, j, inset + u * (1 - inset), v),
    40,
    24,
  );
}

/** Head, tail and fore-edge outline of a leaf: the stacked page lines. */
function outline(side: number, j: number, radius: number) {
  const steps = 24;
  const along = (v: number) =>
    Array.from({ length: steps + 1 }, (_, k) => leafPoint(side, j, k / steps, v));
  const fore = Array.from({ length: steps + 1 }, (_, k) =>
    leafPoint(side, j, 1, k / steps),
  );
  return [tube(along(0), radius), tube(along(1), radius), tube(fore, radius)];
}

function textLines(side: number, radius: number) {
  const top = LEAVES - 1 + 0.35;
  return Array.from({ length: TEXT_LINES }, (_, k) => {
    const v = 0.14 + (0.72 * k) / (TEXT_LINES - 1);
    const end = k % 4 === 3 ? 0.55 : 0.88; // paragraph ends
    return tube(
      Array.from({ length: 16 }, (_, s) =>
        leafPoint(side, top, 0.12 + (end - 0.12) * (s / 15), v),
      ),
      radius,
      40,
    );
  });
}

/** Spark plume, shared with the shader: height h in [0, 1). */
export function plumePoint(h: number, angle: number, jitter: number, time = 0) {
  const tilt = new Matrix4().makeRotationFromEuler(new Euler(...BOOK.tilt));
  const origin = new Vector3(...BOOK.gutter).applyMatrix4(tilt);
  const radius = 0.03 + 0.22 * h * (0.8 + 0.4 * jitter);
  const a = angle * Math.PI * 2 + h * 5 + time * 0.35;
  return origin.add(
    new Vector3(
      Math.cos(a) * radius + h * h * 0.22,
      h * 0.9,
      Math.sin(a) * radius * 0.6,
    ),
  );
}

export function bookParts(count: number, seed: number): Part[] {
  const [nLeaf, nEdge, nText, nCover, nTurn, nSpark] = budget(
    count,
    [22, 30, 14, 8, 8, 18],
  );
  const leaves: BufferGeometry[] = [],
    edges: BufferGeometry[] = [],
    covers: BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    // Only the top leaf is a surface; the block below reads as the stacked
    // lines of its head, tail and fore-edge, as in the reference.
    leaves.push(leaf(side, LEAVES - 1));
    for (let j = 0; j < LEAVES; j++) edges.push(...outline(side, j, 0.0032));
    covers.push(leaf(side, -1.4), ...outline(side, -1.4, 0.005));
  }
  const spine = tube(
    Array.from({ length: 12 }, (_, k) => new Vector3(0, -0.012, (k / 11 - 0.5) * BOOK.depth)),
    0.01,
  );
  covers.push(spine);
  // Two loose leaves lie on top of the right block; one turns per project.
  const turning = [0, 1].map((k) =>
    samplePoints(
      merge([leaf(1, LEAVES + 0.4 + k * 0.5), ...outline(1, LEAVES + 0.4 + k * 0.5, 0.003)]),
      Math.floor(nTurn / 2) + (k === 0 ? nTurn % 2 : 0),
      seed + 40 + k,
    ),
  );
  const sparkPhase = (i: number) => random(i, 51);
  const sparkAngle = (i: number) => random(i, 52);
  const sparkJitter = (i: number) => random(i, 53);
  const sparks = new Float32Array(nSpark * 3);
  for (let i = 0; i < nSpark; i++)
    plumePoint(sparkPhase(i), sparkAngle(i), sparkJitter(i)).toArray(sparks, i * 3);

  const pages: Part["color"] = (i, _p, out) => {
    // Red and amber in equal measure, with white sparks, as in the reference.
    const r = random(i, 54);
    if (r < 0.14) return out.copy(WHITE);
    if (r < 0.6) return out.copy(RED).lerp(AMBER, random(i, 55) * 0.25);
    return out.copy(AMBER).lerp(GOLD, random(i, 55));
  };
  const glowing: Part["color"] = (i, _p, out) =>
    random(i, 56) < 0.45
      ? out.copy(RED).lerp(AMBER, random(i, 63) * 0.4)
      : out.copy(AMBER).lerp(WHITE, 0.3 + random(i, 64) * 0.6);
  const fromCentre = (_i: number, p: Vector3) => p.length() / 0.65;
  const fill = (i: number, p: Vector3) => 0.65 * Math.min(1, fromCentre(i, p)) + 0.35 * random(i, 57);
  const book: Part["motion"] = () => [MOTION.BOOK, 0, 0, 0];
  return [
    {
      points: samplePoints(merge(leaves), nLeaf, seed),
      color: pages,
      emission: (i) => (random(i, 54) < 0.14 ? 0.5 : 0.06),
      rank: fill,
      motion: book,
    },
    {
      points: samplePoints(merge(edges), nEdge, seed + 1),
      color: glowing,
      emission: (i) => 0.25 + 0.25 * random(i, 65),
      rank: fill,
      motion: book,
      lines: { k: 2, maxLength: 0.022 },
    },
    {
      points: samplePoints(merge([...textLines(-1, 0.0026), ...textLines(1, 0.0026)]), nText, seed + 2),
      color: (i, _p, out) => out.copy(WHITE).lerp(AMBER, random(i, 58) * 0.7),
      emission: () => 0.32,
      rank: fill,
      motion: book,
      lines: { k: 2, maxLength: 0.02 },
    },
    {
      points: samplePoints(merge(covers), nCover, seed + 3),
      color: (i, _p, out) => out.copy(RED).lerp(AMBER, random(i, 59) * 0.3),
      emission: () => 0.2,
      rank: fill,
      motion: book,
    },
    ...turning.map(
      (points, k): Part => ({
        points,
        color: pages,
        emission: (i) => (random(i, 54) < 0.12 ? 0.5 : 0.12),
        rank: fill,
        motion: () => [MOTION.PAGE, k, 0, 0],
      }),
    ),
    {
      points: concat(sparks),
      color: (i, _p, out) => ramp([RED, AMBER, WHITE], random(i, 60), out),
      emission: (i) => 0.25 + 0.5 * random(i, 61),
      rank: (i) => 0.75 + 0.25 * random(i, 62),
      motion: (i) => [MOTION.SPARK, sparkPhase(i), sparkAngle(i), sparkJitter(i)],
    },
  ];
}
