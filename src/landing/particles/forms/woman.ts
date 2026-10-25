import { BufferGeometry, Color, Vector3 } from "three";
import { MOTION, budget, emptyForm, fill } from "./compose";
import { random } from "./hash";
import {
  AMBER,
  BLUE,
  CYAN,
  GOLD,
  MAGENTA,
  PINK,
  RED,
  SKY,
  VIOLET,
  WHITE,
  ramp,
} from "./palette";
import { cloud, edgeFrame, samplePoints, tube } from "./primitives";
import { merge } from "./sampling";
import { ellipsoid, roundCone, sampleSdf, smoothUnion, type Sdf } from "./sdf";

/**
 * Lia, the closing figure: a woman floating upright, arms open with the palms
 * forward, feet pointed, hair streaming up like flame, seven chakra stars along
 * the spine and thin orbits around the body. The skin is a smooth union of
 * ellipsoids and tapered capsules (8-head canon, 1.9 units tall), sampled on
 * its surface and joined by lines of light into a triangulated mesh.
 * The figure's left is +x.
 */
const v = (x: number, y: number, z: number) => new Vector3(x, y, z);
const HEAD = v(0, 0.84, 0);
/** Built 1.9 units tall, then scaled so the hair stays on screen. */
const SCALE = 0.8;

function body(): Sdf {
  const shapes: Sdf[] = [
    ellipsoid(HEAD, v(0.07, 0.096, 0.084)),
    ellipsoid(v(0, 0.77, 0.014), v(0.052, 0.05, 0.058)), // jaw
    roundCone(v(0, 0.69, -0.006), v(0, 0.76, 0), 0.034, 0.03), // neck
    ellipsoid(v(0, 0.578, -0.006), v(0.17, 0.066, 0.08)), // shoulders
    ellipsoid(v(0, 0.47, 0), v(0.135, 0.13, 0.088)), // ribcage
    ellipsoid(v(0, 0.3, 0), v(0.092, 0.11, 0.07)), // waist
    ellipsoid(v(0, 0.13, -0.006), v(0.19, 0.125, 0.1)), // pelvis
  ];
  for (const s of [-1, 1]) {
    shapes.push(
      ellipsoid(v(s * 0.06, 0.47, 0.064), v(0.06, 0.056, 0.056)), // breast
      roundCone(v(s * 0.165, 0.585, 0), v(s * 0.265, 0.34, 0.01), 0.044, 0.036),
      roundCone(v(s * 0.265, 0.34, 0.01), v(s * 0.36, 0.12, 0.05), 0.034, 0.025),
      ellipsoid(v(s * 0.388, 0.072, 0.066), v(0.024, 0.05, 0.013)), // palm
      roundCone(v(s * 0.095, 0.08, 0), v(s * 0.055, -0.42, 0.005), 0.082, 0.052),
      ellipsoid(v(s * 0.058, -0.56, -0.012), v(0.05, 0.11, 0.052)), // calf
      roundCone(v(s * 0.055, -0.44, 0), v(s * 0.042, -0.86, -0.005), 0.05, 0.03),
      roundCone(v(s * 0.04, -0.86, 0), v(s * 0.045, -0.97, 0.03), 0.024, 0.013),
    );
    // Fingers fanned slightly, palms open.
    for (let f = 0; f < 4; f++) {
      const x = s * (0.375 + f * 0.009);
      shapes.push(roundCone(v(x, 0.03, 0.068), v(x + s * f * 0.006, -0.03, 0.074), 0.0065, 0.005));
    }
    shapes.push(roundCone(v(s * 0.372, 0.08, 0.075), v(s * 0.35, 0.03, 0.09), 0.007, 0.005)); // thumb
  }
  return smoothUnion(shapes, 0.034);
}

/** Skin colour: gold head and hands, red heart, violet torso, blue legs. */
function skin(p: Vector3, out: Color) {
  if (Math.abs(p.x) > 0.31 && p.y < 0.22) return out.copy(AMBER).lerp(WHITE, 0.25);
  if (p.y > 0.7) return out.copy(WHITE).lerp(PINK, 0.35); // face and scalp
  if (p.y > 0.55) return ramp([RED, GOLD], (p.y - 0.55) / 0.15, out);
  if (p.y > 0.38) return ramp([MAGENTA, RED, PINK], (p.y - 0.38) / 0.17, out);
  if (p.y > 0.1) return ramp([VIOLET, MAGENTA], (p.y - 0.1) / 0.28, out);
  if (p.y > -0.5) return ramp([BLUE, VIOLET], (p.y + 0.5) / 0.6, out);
  return ramp([CYAN, SKY, BLUE], (p.y + 0.97) / 0.47, out);
}

/**
 * Hair: strands leave the crown and the back of the head and stream up and out
 * to both sides like flame, as in the reference; tips fray into loose
 * particles. Roots stay behind the face so the face reads.
 */
function hair(count: number) {
  const strands = 190;
  const parts: BufferGeometry[] = [];
  const tips: Vector3[] = [];
  for (let k = 0; k < strands; k++) {
    const polar = 0.1 + 1.5 * random(k, 1);
    const azimuth = Math.PI * (1.05 + 0.9 * random(k, 2)); // back half: z < 0
    const dir = v(Math.sin(polar) * Math.cos(azimuth), Math.cos(polar), Math.sin(polar) * Math.sin(azimuth));
    const root = HEAD.clone().add(dir.clone().multiply(v(0.07, 0.096, 0.084)));
    const side = Math.sign(dir.x || (random(k, 5) - 0.5));
    const length = 0.3 + 0.32 * random(k, 3);
    const flow = v(side * (0.8 + 0.5 * random(k, 6)), 0.5, -0.35).normalize();
    const phase = random(k, 4) * 6;
    const points = Array.from({ length: 8 }, (_, s) => {
      const t = s / 7;
      return root
        .clone()
        .addScaledVector(dir, 0.04 * t)
        .addScaledVector(flow, length * t)
        .add(v(0, Math.sin(phase + t * 4.5) * 0.06 * t, Math.cos(phase + t * 3) * 0.04 * t));
    });
    tips.push(points[7]);
    parts.push(tube(points, 0.0024, 28));
  }
  const strandCount = Math.floor(count * 0.78);
  const loose = new Float32Array((count - strandCount) * 3);
  for (let i = 0; i < count - strandCount; i++) {
    const tip = tips[Math.floor(random(i, 7) * tips.length)];
    loose.set(cloud(1, tip, v(0.06, 0.05, 0.05), 900 + i * 9), i * 3);
  }
  const strandsPoints = samplePoints(merge(parts), strandCount, 501);
  const out = new Float32Array(count * 3);
  out.set(strandsPoints);
  out.set(loose, strandsPoints.length);
  return out;
}

const CHAKRAS: [number, number, number, Color][] = [
  [1.0, 0.0, 0.034, VIOLET.clone().lerp(WHITE, 0.4)],
  [0.875, 0.1, 0.016, VIOLET],
  [0.71, 0.045, 0.04, SKY],
  [0.5, 0.1, 0.066, RED],
  [0.36, 0.085, 0.05, AMBER],
  [0.2, 0.09, 0.048, MAGENTA],
  [0.05, 0.08, 0.044, VIOLET.clone().lerp(MAGENTA, 0.5)],
];

const RINGS = [
  { y: 0.12, radius: 0.42, tilt: 0.35 },
  { y: -0.5, radius: 0.32, tilt: -0.28 },
];

export function woman(count: number, seed: number) {
  const [nBody, nHair, nChakra, nRing, nShard] = budget(count, [66, 16, 5, 6, 7]);
  const skinSamples = sampleSdf(body(), v(-0.5, -1, -0.2), v(0.5, 1, 0.2), nBody, 2.6, 300);
  const hairPoints = hair(nHair);
  const chakraGeometry = merge(
    CHAKRAS.flatMap(([y, z, size]) => [
      edgeFrame("star", v(0, y, z), size, 0.0018),
      tube(Array.from({ length: 33 }, (_, k) => v(Math.cos(k / 5.1) * size * 1.35, y + Math.sin(k / 5.1) * size * 1.35, z)), 0.0016, 48),
    ]),
  );
  const chakraPoints = samplePoints(chakraGeometry, nChakra, seed + 2);
  const ringOf = (i: number) => (random(i, 40) < 0.55 ? 0 : 1);
  const rings = new Float32Array(nRing * 3);
  for (let i = 0; i < nRing; i++) {
    const { y, radius, tilt } = RINGS[ringOf(i)];
    const a = random(i, 41) * Math.PI * 2;
    v(Math.cos(a) * radius, 0, Math.sin(a) * radius)
      .applyAxisAngle(v(1, 0, 0), tilt)
      .add(v(0, y, 0))
      .toArray(rings, i * 3);
  }
  // A sparse aura around the whole figure, thicker near the shoulders.
  const shards = new Float32Array(nShard * 3);
  for (let i = 0; i < nShard; i++) {
    const a = random(i, 42) * Math.PI * 2;
    const r = 0.3 + 0.45 * random(i, 43) ** 0.7;
    const y = 0.75 - 1.6 * random(i, 44) ** 1.4;
    shards.set([Math.cos(a) * r * (0.8 + 0.4 * Math.max(0, y)), y, Math.sin(a) * r * 0.4], i * 3);
  }
  const nearestChakra = (p: Vector3) => {
    let best = 0;
    CHAKRAS.forEach(([y], k) => {
      if (Math.abs(y - p.y) < Math.abs(CHAKRAS[best][0] - p.y)) best = k;
    });
    return best;
  };
  const rise = (i: number, p: Vector3) => Math.min(1, ((p.y + 1) / 2) * 0.85 + 0.15 * random(i, 45));
  const form = emptyForm("woman", count);
  fill(
    form,
    [...Array(count).keys()],
    [
      {
        points: skinSamples.points,
        color: (i, p, out) => {
          skin(p, out);
          if (random(i, 46) < 0.07) out.lerp(WHITE, 0.75);
        },
        // The silhouette glows: the rim faces away from the camera axis.
        emission: (i, p) => {
          const rim = 1 - Math.abs(skinSamples.normals[i * 3 + 2]);
          const hand = Math.abs(p.x) > 0.31 && p.y < 0.22 ? 0.45 : 0;
          return Math.max(hand, 0.08 + 0.62 * rim ** 2.5 + (random(i, 46) < 0.07 ? 0.35 : 0));
        },
        rank: rise,
        lines: { k: 3, maxLength: 0.034 },
      },
      {
        points: hairPoints,
        color: (i, _p, out) =>
          random(i, 47) < 0.45 ? out.copy(GOLD).lerp(RED, 0.15 + random(i, 56) * 0.35) : out.copy(AMBER).lerp(GOLD, random(i, 57)),
        emission: (i) => 0.22 + 0.25 * random(i, 58),
        rank: (i) => 0.82 + 0.18 * random(i, 48),
        motion: (i, p) => [MOTION.HAIR, Math.min(1, Math.max(0, (p.y - 0.78) / 0.6)), random(i, 49), Math.sign(p.x)],
        lines: { k: 2, maxLength: 0.02 },
      },
      {
        points: chakraPoints,
        color: (_i, p, out) => out.copy(CHAKRAS[nearestChakra(p)][3]).lerp(WHITE, 0.1),
        emission: () => 0.38,
        rank: () => 0.97,
        motion: (_i, p) => {
          const [y, z] = CHAKRAS[nearestChakra(p)];
          return [MOTION.CHAKRA, 0, y, z];
        },
        lines: { k: 2, maxLength: 0.01 },
      },
      {
        points: rings,
        color: (i, _p, out) => ramp([SKY, VIOLET, WHITE], random(i, 50), out),
        emission: (i) => 0.3 + 0.3 * random(i, 51),
        rank: (i) => 0.7 + 0.3 * random(i, 52),
        motion: (i) => [MOTION.RING, RINGS[ringOf(i)].y, RINGS[ringOf(i)].tilt, 0],
      },
      {
        points: shards,
        color: (i, _p, out) => ramp([VIOLET, PINK, SKY], random(i, 53), out),
        emission: () => 0.32,
        rank: (i) => 0.6 + 0.4 * random(i, 54),
        motion: (i) => [MOTION.LEAF, random(i, 55), 0, 0],
      },
    ],
    seed,
  );
  for (let i = 0; i < form.points.length; i++) form.points[i] *= SCALE;
  // Rotation centres travel with the figure.
  const m = form.motion!;
  for (let i = 0; i < m.length; i += 4) {
    if (m[i] === MOTION.CHAKRA) (m[i + 2] *= SCALE), (m[i + 3] *= SCALE);
    if (m[i] === MOTION.RING) m[i + 1] *= SCALE;
  }
  return form;
}
