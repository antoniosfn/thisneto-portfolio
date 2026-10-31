import {
  BufferGeometry,
  Color,
  Euler,
  IcosahedronGeometry,
  LinearSRGBColorSpace,
  Matrix4,
  Vector3,
} from "three";
import { MOTION, isBook } from "./catalog";
import { budget, emptyForm, fill, type Motion } from "./compose";
import { random } from "./hash";
import { ramp } from "./palette";
import { edgeFrame, samplePoints } from "./primitives";
import { merge, shuffle, strut } from "./sampling";

const RADIUS = 0.43;
const TILT = new Matrix4().makeRotationFromEuler(new Euler(0.46, -0.08, -0.12));
const INVERSE = TILT.clone().invert();
// Everything turns about the planet's tilted pole: rings faster than the globe.
const POLE = new Vector3(0, 1, 0).applyMatrix4(TILT).normalize();
const spin = (speed: number) => (): Motion => [
  MOTION.SPIN,
  POLE.x * speed,
  POLE.y * speed,
  POLE.z * speed,
];
const LIGHT = new Vector3(-0.4, 0.8, 1.2).normalize();
const tone = (hex: string) => new Color().setStyle(hex, LinearSRGBColorSpace);
const UMBER = tone("#a36a38"),
  SAND = tone("#dcb47b"),
  CREAM = tone("#f6dfaa");
const RING = [
  tone("#ad8e53"),
  tone("#f5e5b7"),
  tone("#d7b96d"),
  tone("#fff1c9"),
];

/** Faceted globe and broad, tilted rings; both halves keep their next identity. */
export function saturn(count: number, seed: number) {
  const form = emptyForm("saturn", count);
  const planet: number[] = [],
    rings: number[] = [];
  // The rings become the book; the planet becomes the atom in the next beat.
  for (let i = 0; i < count; i++) (isBook(i) ? rings : planet).push(i);
  const [nSurface, nGrid] = budget(planet.length, [70, 30]);
  const globe = new IcosahedronGeometry(RADIUS, 4)
    .scale(1, 0.91, 1)
    .applyMatrix4(TILT);
  const positions = globe.getAttribute("position");
  const edges: BufferGeometry[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < positions.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = new Vector3().fromBufferAttribute(positions, i + k);
      const b = new Vector3().fromBufferAttribute(positions, i + ((k + 1) % 3));
      const key = [a, b]
        .map((v) =>
          v
            .toArray()
            .map((x) => x.toFixed(5))
            .join(","),
        )
        .sort()
        .join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(strut(a, b, 0.0011, 3));
    }
  }
  fill(
    form,
    planet,
    [
      {
        points: samplePoints(globe, nSurface, seed),
        color: (_i, p, out) => {
          const local = p.clone().applyMatrix4(INVERSE);
          const latitude = local.y / (RADIUS * 0.91);
          const band =
            0.5 + 0.5 * Math.sin(latitude * 26 + Math.sin(latitude * 9) * 0.7);
          ramp([UMBER, SAND, CREAM], 0.25 + band * 0.65, out);
          out.multiplyScalar(
            0.4 + 0.6 * Math.max(0, p.clone().normalize().dot(LIGHT)),
          );
        },
        emission: () => 0.04,
        rank: (i) => 0.05 + random(i, 31) * 0.38,
        motion: spin(0.08),
      },
      {
        points: samplePoints(merge(edges), nGrid, seed + 1),
        color: (_i, _p, out) => {
          out.copy(CREAM);
        },
        emission: () => 0.12,
        rank: (i) => 0.15 + random(i, 32) * 0.3,
        motion: spin(0.08),
        lines: { k: 2, maxLength: 0.04 },
      },
    ],
    seed,
  );

  const [nBands, nRocks] = budget(rings.length, [84, 16]);
  const bands = new Float32Array(nBands * 3);
  const bandEdges: number[] = [];
  const trackCounts = budget(nBands, Array(24).fill(1));
  let offset = 0;
  trackCounts.forEach((n, band) => {
    // A dark division separates the inner and outer ring systems.
    const radius = 0.6 + band * 0.014 + (band >= 15 ? 0.032 : 0);
    const phase = random(band, 40) * Math.PI * 2;
    for (let j = 0; j < n; j++) {
      const angle = (j / n) * Math.PI * 2 + phase;
      new Vector3(
        Math.cos(angle) * radius,
        (random(j, band + 70) - 0.5) * 0.001,
        Math.sin(angle) * radius,
      )
        .applyMatrix4(TILT)
        .toArray(bands, (offset + j) * 3);
      bandEdges.push(offset + j, offset + ((j + 1) % n));
    }
    offset += n;
  });
  const rocks = Array.from({ length: 28 }, (_, k) => {
    const angle = random(k, 51) * Math.PI * 2;
    const radius = 0.63 + random(k, 52) * 0.34;
    const centre = new Vector3(
      Math.cos(angle) * radius,
      0.012 + random(k, 53) * 0.016,
      Math.sin(angle) * radius,
    );
    return edgeFrame(
      "tetra",
      centre,
      0.012 + random(k, 54) * 0.014,
      0.0015,
      random(k, 55) * 3,
    ).applyMatrix4(TILT);
  });
  fill(
    form,
    rings,
    [
      {
        points: bands,
        color: (i, p, out) => {
          ramp(RING, (p.length() - 0.6) / 0.36, out);
          out.multiplyScalar(0.82 + random(i, 61) * 0.18);
        },
        emission: () => 0.18,
        rank: (_i, p) => 0.42 + Math.min(1, (p.length() - 0.59) / 0.39) * 0.5,
        motion: spin(0.22),
      },
      {
        points: samplePoints(merge(rocks), nRocks, seed + 3),
        color: (_i, _p, out) => {
          out.copy(CREAM);
        },
        emission: () => 0.3,
        rank: (i) => 0.65 + random(i, 62) * 0.3,
        motion: spin(0.22),
        lines: { k: 2, maxLength: 0.025 },
      },
    ],
    seed + 2,
  );
  // Explicit closed tracks preserve clean concentric rings instead of spokes.
  const ringOrder = shuffle(rings, seed + 2);
  form.edges ??= [];
  for (const index of bandEdges) form.edges.push(ringOrder[index]);
  return form;
}
