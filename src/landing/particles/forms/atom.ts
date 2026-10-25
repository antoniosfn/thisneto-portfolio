import { BufferGeometry, Vector3 } from "three";
import { MOTION, budget, type Part } from "./compose";
import { random } from "./hash";
import {
  BLUE,
  CYAN,
  MAGENTA,
  PINK,
  SKY,
  VIOLET,
  WHITE,
  ramp,
} from "./palette";
import { cloud, edgeFrame, samplePoints } from "./primitives";
import { merge } from "./sampling";

/**
 * The atom of the references: a crystalline nucleus of glowing polyhedra with
 * light rays, three orbits seen as ellipses 60° apart, electrons as white-hot
 * heads with comet tails, and a faint field of sparkles. Orbits and electrons
 * turn about their own normals in the shader (motion ORBIT, ELECTRON).
 */
export const ORBIT_RADIUS = 0.6;
// A circle tilted θ about an in-plane axis projects with axis ratio cos θ.
const ORBIT_TILT = Math.acos(1 / 2.8); // a 2.8 : 1 ellipse face-on
const NUCLEUS = 0.16;
const ELECTRONS = [
  [0, 0.3],
  [1, 2.4],
  [2, 4.4],
  [0, 3.6],
  [2, 1.2],
] as const;
const TAIL = 1.6; // radians of orbit behind each head

/** Orthonormal basis of orbit j: the ellipse lies in (e1, e2), normal n. */
export function orbitBasis(j: number) {
  const c = Math.cos(ORBIT_TILT),
    s = Math.sin(ORBIT_TILT);
  const turn = (v: Vector3) =>
    v.applyAxisAngle(new Vector3(0, 0, 1), (j * Math.PI) / 3);
  return {
    e1: turn(new Vector3(1, 0, 0)),
    e2: turn(new Vector3(0, c, s)),
    n: turn(new Vector3(0, -s, c)),
  };
}

function orbitPoint(j: number, phi: number, spread: number, i: number, salt: number) {
  const { e1, e2 } = orbitBasis(j);
  const g = (k: number) => (random(i, salt + k) + random(i, salt + k + 1) - 1) * spread;
  return e1
    .clone()
    .multiplyScalar(Math.cos(phi) * ORBIT_RADIUS)
    .addScaledVector(e2, Math.sin(phi) * ORBIT_RADIUS)
    .add(new Vector3(g(0), g(2), g(4)));
}

export function atomParts(count: number, seed: number): Part[] {
  const [nCrystal, nCore, nRays, nOrbit, nElectron, nSparkle] = budget(count, [
    12, 2, 4, 50, 22, 10,
  ]);
  // Nucleus: a tight cluster of edge-drawn polyhedra.
  const crystals: BufferGeometry[] = [];
  const kinds = ["tetra", "octa", "icosa", "tetra"] as const;
  for (let k = 0; k < 18; k++) {
    const dir = new Vector3(
      random(k, 1) - 0.5,
      random(k, 2) - 0.5,
      random(k, 3) - 0.5,
    ).normalize();
    crystals.push(
      edgeFrame(
        kinds[k % 4],
        dir.multiplyScalar(NUCLEUS * 0.62 * Math.cbrt(random(k, 4))),
        0.045 + 0.04 * random(k, 5),
        0.002,
        random(k, 6) * 3,
      ),
    );
  }
  const core = cloud(nCore, new Vector3(), new Vector3(0.03, 0.03, 0.03), 70);
  const rays = new Float32Array(nRays * 3);
  for (let i = 0; i < nRays; i++) {
    const ray = Math.floor(random(i, 80) * 30);
    const dir = new Vector3(
      Math.cos(ray * 2.4),
      Math.sin(ray * 2.4),
      (random(ray, 81) - 0.5) * 0.6,
    ).normalize();
    const reach = NUCLEUS * (1.05 + 1.6 * random(ray, 82));
    dir.multiplyScalar(NUCLEUS * 0.9 + (reach - NUCLEUS * 0.9) * random(i, 83)).toArray(rays, i * 3);
  }
  const orbitOf = (i: number) => Math.floor(random(i, 84) * 3);
  const orbits = new Float32Array(nOrbit * 3);
  for (let i = 0; i < nOrbit; i++)
    orbitPoint(orbitOf(i), random(i, 85) * Math.PI * 2, 0.014, i, 86).toArray(orbits, i * 3);
  // Electrons: dense head, tail thinning out behind it along the orbit.
  const electronOf = (i: number) => Math.floor(random(i, 90) * ELECTRONS.length);
  const tailOf = (i: number) => random(i, 91) ** 1.8; // 0 at the head
  const electrons = new Float32Array(nElectron * 3);
  for (let i = 0; i < nElectron; i++) {
    const [j, phi] = ELECTRONS[electronOf(i)];
    const t = tailOf(i);
    const head = random(i, 92) < 0.36;
    orbitPoint(j, phi - (head ? 0 : t * TAIL), head ? 0.012 : 0.01 * (1 - t) + 0.002, i, 93).toArray(
      electrons,
      i * 3,
    );
  }
  const sparkles = new Float32Array(nSparkle * 3);
  for (let i = 0; i < nSparkle; i++) {
    const a = random(i, 95) * Math.PI * 2,
      r = 0.15 + 0.85 * Math.sqrt(random(i, 96));
    sparkles.set([Math.cos(a) * r, Math.sin(a) * r * 0.85, (random(i, 97) - 0.5) * 0.3], i * 3);
  }
  const orbitTones = [
    [BLUE, SKY],
    [VIOLET, PINK],
    [SKY, VIOLET],
  ];
  // Arrival: the nucleus first, then the orbits outwards.
  const outward = (i: number, p: Vector3) => 0.7 * Math.min(1, p.length() / 0.75) + 0.3 * random(i, 98);
  const nucleus: Part["motion"] = () => [MOTION.NUCLEUS, 0, 0, 0];
  const around = (j: number, type: number): readonly [number, number, number, number] => {
    const { n } = orbitBasis(j);
    return [type, n.x, n.y, n.z];
  };
  return [
    {
      points: samplePoints(merge(crystals), nCrystal, seed),
      color: (i, _p, out) => out.copy([CYAN, MAGENTA, WHITE, VIOLET][Math.floor(random(i, 99) * 4)]),
      emission: (i) => 0.4 + 0.35 * random(i, 100),
      rank: outward,
      motion: nucleus,
      lines: { k: 2, maxLength: 0.018 },
    },
    {
      points: core,
      color: (i, _p, out) => out.copy(WHITE).lerp(CYAN, random(i, 101) * 0.4),
      emission: () => 0.85,
      rank: outward,
      motion: nucleus,
    },
    {
      points: rays,
      color: (i, _p, out) => out.copy(WHITE).lerp(SKY, random(i, 102)),
      emission: (_i, p) => Math.max(0.25, 1 - p.length() / 0.35),
      rank: outward,
      motion: nucleus,
    },
    {
      points: orbits,
      color: (i, _p, out) => {
        if (random(i, 103) < 0.12) return out.copy(WHITE);
        const [a, b] = orbitTones[orbitOf(i)];
        return ramp([a, b, a], random(i, 104), out);
      },
      emission: (i) => (random(i, 103) < 0.12 ? 0.7 : 0.28),
      rank: outward,
      motion: (i) => around(orbitOf(i), MOTION.ORBIT),
      lines: { k: 2, maxLength: 0.03 },
    },
    {
      points: electrons,
      color: (i, _p, out) => out.copy(WHITE).lerp(SKY, tailOf(i) * 0.8),
      emission: (i) => 1 - tailOf(i) * 0.75,
      rank: outward,
      motion: (i) => around(ELECTRONS[electronOf(i)][0], MOTION.ELECTRON),
      lines: { k: 2, maxLength: 0.03 },
    },
    {
      points: sparkles,
      color: (i, _p, out) => ramp([SKY, VIOLET, WHITE], random(i, 105), out),
      emission: () => 0.18,
      rank: (i) => 0.6 + 0.4 * random(i, 106),
      motion: () => [MOTION.ORBIT, 0, 0, 1],
    },
  ];
}
