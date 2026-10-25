import { BufferGeometry, Color, Vector3 } from "three";
import { TREE_SCALE, TREE_SEED } from "./catalog";
import { colonize, thicken, type Branch } from "./colonize";
import { MOTION, budget, emptyForm, fill, type Part } from "./compose";
import { random } from "./hash";
import { BLUE, CYAN, GOLD, TEAL, VIOLET, WHITE, MAGENTA } from "./palette";
import { cloud, edgeFrame, samplePoints, tube } from "./primitives";
import { merge, strut } from "./sampling";

/**
 * The Tree of Life of the references: a grown trunk, crown and root plate whose
 * crown dissolves into particles at the tips, crossed by the ten sefirot as
 * glowing star polyhedra joined by the 22 paths. Every particle's arrival rank
 * is its path length from the seed, so the tree grows from the inside out.
 */
// Built in a local frame where the seed sits at y = −0.58, then scaled.
const SEED = new Vector3(...TREE_SEED).divideScalar(TREE_SCALE);
const PERIWINKLE = BLUE.clone().lerp(VIOLET, 0.45).lerp(WHITE, 0.2);
const TONES = [VIOLET, GOLD, TEAL, PERIWINKLE];
const THICK = 0.05; // branches thicker than this read as trunk

/** Sefirot in the field frame, with their pillar (−1 left, 0 middle, 1 right). */
const SEFIROT: [number, number, number][] = [
  [0, 0.86, 0], // Keter
  [0.3, 0.66, 1], // Chokhmah
  [-0.3, 0.66, -1], // Binah
  [0.3, 0.36, 1], // Chesed
  [-0.3, 0.36, -1], // Gevurah
  [0, 0.18, 0], // Tiferet
  [0.3, -0.04, 1], // Netzach
  [-0.3, -0.04, -1], // Hod
  [0, -0.2, 0], // Yesod
  [0, -0.42, 0], // Malkuth
];
const PATHS = [
  [0, 1], [0, 2], [0, 5], [1, 2], [1, 5], [1, 3], [2, 5], [2, 4],
  [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 8], [5, 7],
  [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9],
];

function pillarTone(pillar: number, out: Color) {
  return pillar > 0 ? out.copy(TEAL).lerp(CYAN, 0.4) : pillar < 0 ? out.copy(GOLD) : out.copy(WHITE).lerp(VIOLET, 0.25);
}

function inEllipsoid(salt: number, count: number, centre: Vector3, radius: Vector3, keep: (v: Vector3) => boolean) {
  const out: Vector3[] = [];
  for (let i = 0; out.length < count && i < count * 20; i++) {
    const v = new Vector3(random(i, salt) * 2 - 1, random(i, salt + 1) * 2 - 1, random(i, salt + 2) * 2 - 1);
    if (v.lengthSq() > 1) continue;
    v.multiply(radius).add(centre);
    if (keep(v)) out.push(v);
  }
  return out;
}

function grow() {
  const trunk = Array.from({ length: 18 }, (_, k) =>
    new Vector3(Math.sin(k * 0.4) * 0.012, SEED.y + (k / 17) * 0.52, 0),
  );
  const crown = colonize({
    start: trunk,
    attractors: inEllipsoid(11, 520, new Vector3(0, 0.38, 0), new Vector3(1.0, 0.55, 0.45), (v) => v.y > -0.08),
    step: 0.034,
    influence: 0.34,
    kill: 0.085,
    bias: new Vector3(0, 0.16, 0),
    iterations: 260,
  });
  const roots = colonize({
    start: [SEED.clone(), new Vector3(0, SEED.y - 0.07, 0)],
    attractors: inEllipsoid(21, 220, new Vector3(0, -0.85, 0), new Vector3(0.95, 0.12, 0.35), (v) => v.y < SEED.y - 0.06),
    step: 0.034,
    influence: 0.4,
    kill: 0.085,
    bias: new Vector3(0, -0.2, 0),
    iterations: 200,
  });
  // Pipe model (Shinozaki, 1964): a branch's cross-section is the sum of its
  // children's; exponent 2 keeps area, below 2 fattens the trunk.
  thicken(crown, 0.011, 1.85);
  thicken(roots, 0.011, 1.85);
  // The trunk flares towards the roots, as in the reference.
  crown.forEach((node) => {
    if (node.at.y < -0.05) node.radius = Math.max(node.radius, 0.085 + 0.09 * ((-0.05 - node.at.y) / 0.53));
  });
  return { crown, roots };
}

/** As in the reference: gold and violet limbs on the left, blue and teal on the right. */
function limbTone(nodes: Branch[], id: number) {
  const pick = random(id, 3) < 0.5;
  return nodes[id].at.x < 0 ? (pick ? GOLD : VIOLET) : pick ? TEAL : PERIWINKLE;
}

/** Limb each node belongs to: the first thin branch above the trunk. */
function limbs(nodes: Branch[]) {
  const limb = new Array<number>(nodes.length).fill(-1);
  nodes.forEach((node, i) => {
    if (node.parent < 0) return;
    limb[i] = nodes[node.parent].radius > THICK ? (node.radius > THICK ? -1 : i) : limb[node.parent];
  });
  return limb;
}

function segments(nodes: Branch[]) {
  const parts: BufferGeometry[] = [];
  nodes.forEach((node) => {
    if (node.parent < 0) return;
    parts.push(strut(nodes[node.parent].at, node.at, Math.max(0.013, node.radius), 7));
  });
  return merge(parts);
}

/** Nearest network node for every sampled point (grid lookup). */
function nearestNodes(points: Float32Array, nodes: Branch[]) {
  const cell = 0.06;
  const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const grid = new Map<string, number[]>();
  nodes.forEach((n, i) => {
    const k = key(n.at.x, n.at.y, n.at.z);
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
  });
  const out = new Int32Array(points.length / 3);
  const p = new Vector3();
  for (let i = 0; i < out.length; i++) {
    p.fromArray(points, i * 3);
    let best = 0,
      bestD = Infinity;
    for (let r = 1; r <= 3 && bestD === Infinity; r++)
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++)
          for (let dz = -r; dz <= r; dz++)
            for (const j of grid.get(key(p.x + dx * cell, p.y + dy * cell, p.z + dz * cell)) ?? []) {
              const d = nodes[j].at.distanceToSquared(p);
              if (d < bestD) {
                bestD = d;
                best = j;
              }
            }
    out[i] = best;
  }
  return out;
}

export function tree(count: number, seed: number) {
  const [nCrown, nRoots, nLeaves, nSefirot, nPaths, nSparkle] = budget(count, [31, 12, 32, 12, 9, 4]);
  const { crown, roots } = grow();
  const maxLength = Math.max(...crown.map((n) => n.length));
  const crownLimb = limbs(crown),
    rootLimb = limbs(roots);

  const network = (nodes: Branch[], limb: number[], n: number, salt: number): Part => {
    const points = samplePoints(segments(nodes), n, seed + salt);
    const near = nearestNodes(points, nodes);
    return {
      points,
      color: (i, p, out) => {
        const node = nodes[near[i]];
        const id = limb[near[i]];
        if (id < 0 || node.radius > THICK) {
          // Trunk and limbs: strands of colour winding up the bark.
          const a = (Math.atan2(p.z, p.x) + Math.PI) / (Math.PI * 2);
          out.copy(TONES[Math.floor(a * 4 + p.y * 2.2 + 8) % 4]);
        } else out.copy(limbTone(nodes, id));
        if (random(i, 4) < 0.03) out.lerp(WHITE, 0.8);
      },
      emission: (i) => (random(i, 4) < 0.03 ? 0.6 : 0.1),
      rank: (i) => nodes[near[i]].length / maxLength,
    };
  };

  // Crown dissolving into particles around every tip.
  const tips = crown.map((n, i) => [n, i] as const).filter(([n]) => !n.children.length);
  const leafTip = (i: number) => tips[Math.floor(random(i, 30) * tips.length)];
  const leaves = new Float32Array(nLeaves * 3);
  for (let i = 0; i < nLeaves; i++) {
    const [tip] = leafTip(i);
    const halo = random(i, 31) < 0.3;
    leaves.set(cloud(1, tip.at, new Vector3(1, 1, 1).multiplyScalar(halo ? 0.17 : 0.07), 32 + i * 9), i * 3);
  }

  // Sefirot: star tetrahedron inside an icosahedron, all edges glowing.
  const centres = SEFIROT.map(([x, y]) => new Vector3(x, y, 0.06));
  const sefira = centres.map((c, k) => {
    const size = k === 9 ? 0.09 : k === 0 ? 0.08 : 0.072;
    return merge([edgeFrame("star", c, size, 0.003, 0.3), edgeFrame("icosa", c, size * 0.78, 0.0025, 0.1)]);
  });
  const sefiraPoints = samplePoints(merge(sefira), nSefirot, seed + 5);
  const nearestSefira = (p: Vector3) => {
    let best = 0;
    centres.forEach((c, k) => {
      if (c.distanceToSquared(p) < centres[best].distanceToSquared(p)) best = k;
    });
    return best;
  };
  const pathPoints = samplePoints(
    merge(PATHS.map(([a, b]) => tube([centres[a], centres[b]], 0.0035, 24))),
    nPaths,
    seed + 6,
  );
  const reach = (y: number) => Math.min(1, Math.max(0, (y - SEED.y) / (0.95 - SEED.y)));
  const sparkles = cloud(nSparkle, new Vector3(0, 0.35, 0), new Vector3(1.05, 0.65, 0.5), 400);

  const form = emptyForm("tree", count);
  fill(
    form,
    [...Array(count).keys()],
    [
      network(crown, crownLimb, nCrown, 1),
      network(roots, rootLimb, nRoots, 2),
      {
        points: leaves,
        color: (i, _p, out) => {
          const [, index] = leafTip(i);
          const id = crownLimb[index];
          out.copy(id < 0 ? TONES[0] : limbTone(crown, id));
          if (random(i, 33) < 0.1) out.lerp(WHITE, 0.7);
        },
        emission: (i) => (random(i, 33) < 0.1 ? 0.5 : 0.1),
        rank: (i) => Math.min(1, leafTip(i)[0].length / maxLength + 0.05 + 0.08 * random(i, 34)),
        motion: (i) => [MOTION.LEAF, random(i, 35), 0, 0],
      },
      {
        points: sefiraPoints,
        color: (_i, p, out) => pillarTone(SEFIROT[nearestSefira(p)][2], out).lerp(WHITE, 0.2),
        emission: () => 0.55,
        rank: (_i, p) => reach(p.y) * 0.9 + 0.05,
        motion: (_i, p) => [MOTION.SEPHIRA, nearestSefira(p) / 9, 0, 0],
        lines: { k: 2, maxLength: 0.016 },
      },
      {
        points: pathPoints,
        color: (_i, p, out) => {
          pillarTone(Math.abs(p.x) > 0.12 ? Math.sign(p.x) : 0, out).lerp(WHITE, 0.55);
        },
        emission: () => 0.5,
        rank: (_i, p) => reach(p.y) * 0.9 + 0.08,
        lines: { k: 2, maxLength: 0.014 },
      },
      {
        points: sparkles,
        color: (i, _p, out) => out.copy([VIOLET, GOLD, TEAL, MAGENTA][Math.floor(random(i, 36) * 4)]),
        emission: () => 0.2,
        rank: (i) => 0.5 + 0.5 * random(i, 37),
        motion: (i) => [MOTION.LEAF, random(i, 38), 0, 0],
      },
    ],
    seed,
  );
  for (let i = 0; i < form.points.length; i++) form.points[i] *= TREE_SCALE;
  return form;
}
