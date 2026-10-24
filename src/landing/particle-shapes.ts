import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  Quaternion,
  Shape,
  TorusKnotGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export function random(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Dala's observed palette, raw sRGB (the field is composed in display space).
 * Measured on Dala's hero, under 1% of lit pixels are near white: colour carries
 * the form and white is only a sparkle, so it stays out of the ramps.
 */
const tone = (hex: string) => new Color().setStyle(hex, LinearSRGBColorSpace);
const GOLD = tone("#F5B820"),
  VIOLET = tone("#8B4DFF"),
  WHITE = tone("#F4E6F5"),
  TEAL = tone("#2FBF9B"),
  BLUE = tone("#3F6BFF"),
  MAGENTA = tone("#D94DE0");
/** Share of particles turned into white sparkles, as inside Dala's brain. */
const SPARKLE = 0.07;

type Seedable = MeshSurfaceSampler & {
  setRandomGenerator(next: () => number): MeshSurfaceSampler;
};
type Tint = (point: Vector3, normal: Vector3, uv: Vector2, out: Color) => void;
type Form = { name: string; geometry: BufferGeometry; tint: Tint };
export type SampledForm = { points: Float32Array; colors: Float32Array };

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Merge parts as non-indexed geometry, centre it and fit it in the unit sphere.
 * `fit` maps a point from the parts' own frame into the fitted frame.
 */
function assemble(parts: BufferGeometry[]) {
  const geometry = mergeGeometries(
    parts.map((part) => (part.index ? part.toNonIndexed() : part)),
  );
  geometry.computeBoundingBox();
  const centre = geometry.boundingBox!.getCenter(new Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.computeBoundingSphere();
  const scale = 1 / geometry.boundingSphere!.radius;
  geometry.scale(scale, scale, scale);
  const fit = (v: Vector3) => v.clone().sub(centre).multiplyScalar(scale);
  return { geometry, fit, scale };
}

function surfaceArea(geometry: BufferGeometry) {
  const p = geometry.getAttribute("position");
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  let area = 0;
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1).sub(a);
    c.fromBufferAttribute(p, i + 2).sub(a);
    area += b.cross(c).length() / 2;
  }
  return area;
}

/**
 * Area-weighted surface samples thinned to a minimum spacing (Poisson disk):
 * Dala's particles sit evenly on its models, which is what gives the regular
 * gaps between them. The spacing starts at the hexagonal-packing distance for
 * `count` points and shrinks 8% at a time until enough samples are accepted.
 */
function sampleEvenly(form: Form, count: number, seed: number): SampledForm {
  // r186 ships setRandomGenerator; the installed typings predate it.
  const sampler = new MeshSurfaceSampler(new Mesh(form.geometry)) as Seedable;
  sampler.setRandomGenerator(seeded(seed));
  sampler.build();
  const total = count * 4;
  const cands = new Float32Array(total * 3),
    normals = new Float32Array(total * 3),
    uvs = new Float32Array(total * 2);
  const p = new Vector3(),
    n = new Vector3(),
    uv = new Vector2(),
    unused = new Color();
  for (let i = 0; i < total; i++) {
    sampler.sample(p, n, unused, uv);
    p.toArray(cands, i * 3);
    n.toArray(normals, i * 3);
    uv.toArray(uvs, i * 2);
  }
  let radius = Math.sqrt(
    (2 * surfaceArea(form.geometry)) / (Math.sqrt(3) * count),
  );
  const taken = new Uint8Array(total);
  const chosen: number[] = [];
  // Numeric cell keys (cells span < 2048 per axis inside the unit sphere).
  const cellKey = (gx: number, gy: number, gz: number) =>
    ((gx + 1024) * 2048 + (gy + 1024)) * 2048 + (gz + 1024);
  while (chosen.length < count) {
    const grid = new Map<number, number[]>();
    const insert = (i: number) => {
      const k = cellKey(
        Math.floor(cands[i * 3] / radius),
        Math.floor(cands[i * 3 + 1] / radius),
        Math.floor(cands[i * 3 + 2] / radius),
      );
      const bucket = grid.get(k);
      if (bucket) bucket.push(i);
      else grid.set(k, [i]);
    };
    chosen.forEach(insert);
    const limit = radius * radius;
    for (let i = 0; i < total && chosen.length < count; i++) {
      if (taken[i] || !isFree(i)) continue;
      taken[i] = 1;
      chosen.push(i);
      insert(i);
    }
    radius *= 0.92;
    function isFree(i: number) {
      const x = cands[i * 3],
        y = cands[i * 3 + 1],
        z = cands[i * 3 + 2];
      const gx = Math.floor(x / radius),
        gy = Math.floor(y / radius),
        gz = Math.floor(z / radius);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const bucket = grid.get(cellKey(gx + dx, gy + dy, gz + dz));
            if (!bucket) continue;
            for (const j of bucket) {
              const ex = cands[j * 3] - x,
                ey = cands[j * 3 + 1] - y,
                ez = cands[j * 3 + 2] - z;
              if (ex * ex + ey * ey + ez * ez < limit) return false;
            }
          }
      return true;
    }
  }
  const points = new Float32Array(count * 3),
    colors = new Float32Array(count * 3);
  const color = new Color();
  chosen.forEach((i, slot) => {
    p.fromArray(cands, i * 3);
    n.fromArray(normals, i * 3);
    uv.fromArray(uvs, i * 2);
    form.tint(p, n, uv, color);
    if (form.name !== "mark" && random(slot, 31) < SPARKLE)
      color.lerp(WHITE, 0.85);
    p.toArray(points, slot * 3);
    color.toArray(colors, slot * 3);
  });
  return { points, colors };
}

/** Linear blend through a list of colours, t in [0, 1]. */
function ramp(stops: Color[], t: number, out: Color) {
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return out.copy(stops[i]).lerp(stops[i + 1], x - i);
}

/** Hero: trefoil (2, 3) torus knot, star facing +x so it turns frontal at −π/2. */
function knot(): Form {
  const geometry = new TorusKnotGeometry(1, 0.2, 720, 24, 2, 3);
  geometry.rotateY(Math.PI / 2);
  const planar = new Vector3();
  return {
    name: "knot",
    geometry: assemble([geometry]).geometry,
    tint: (p, n, uv, out) => {
      // Violet → magenta → blue → teal along the line, gold where the tube faces out.
      ramp([VIOLET, MAGENTA, BLUE, TEAL, VIOLET], (uv.x * 3) % 1, out);
      planar.set(0, p.y, p.z).normalize();
      const rim = n.dot(planar);
      out.lerp(GOLD, Math.max(0, Math.min(1, (rim - 0.35) * 2.2)));
    },
  };
}

/** Matemática: the Lorenz attractor (σ = 10, ρ = 28, β = 8/3) as a thin tube. */
function lorenz(): Form {
  let x = 0.1,
    y = 0,
    z = 0;
  const trail: Vector3[] = [];
  // ~5 600 steps after the transient: enough orbits to show both wings, few
  // enough that each loop stays distinguishable instead of glowing as a mass.
  for (let i = 0; i < 6800; i++) {
    const dx = 10 * (y - x),
      dy = x * (28 - z) - y,
      dz = x * y - (8 / 3) * z;
    x += dx * 0.004;
    y += dy * 0.004;
    z += dz * 0.004;
    if (i > 1200 && i % 3 === 0) trail.push(new Vector3(x, z - 25, y));
  }
  const curve = new CatmullRomCurve3(trail);
  return {
    name: "lorenz",
    geometry: assemble([new TubeGeometry(curve, 3000, 0.3, 6, false)]).geometry,
    tint: (p, _n, _uv, out) => {
      // Gold and violet lobes meet in magenta; the base of the wings turns teal.
      out
        .copy(p.x > 0 ? GOLD : VIOLET)
        .lerp(MAGENTA, Math.max(0, 1 - Math.abs(p.x) * 2.4));
      out.lerp(TEAL, Math.max(0, Math.min(1, (-p.y - 0.35) * 2)));
    },
  };
}

function strut(a: Vector3, b: Vector3, radius: number) {
  const length = a.distanceTo(b);
  const geometry = new CylinderGeometry(radius, radius, length, 8, 1, true);
  const direction = b.clone().sub(a).normalize();
  const rotation = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction,
  );
  const centre = a.clone().add(b).multiplyScalar(0.5);
  return geometry.applyMatrix4(
    new Matrix4().compose(centre, rotation, new Vector3(1, 1, 1)),
  );
}

function node(at: Vector3, radius: number) {
  return new IcosahedronGeometry(radius, 2).translate(at.x, at.y, at.z);
}

/** Engenharia: geodesic icosphere (frequency 2) built from struts and joints. */
function truss(): Form {
  const sphere = new IcosahedronGeometry(1, 1);
  const p = sphere.getAttribute("position");
  const vertices: Vector3[] = [];
  const index = (v: Vector3) => {
    const found = vertices.findIndex((w) => w.distanceToSquared(v) < 1e-8);
    return found >= 0 ? found : vertices.push(v.clone()) - 1;
  };
  const edges = new Set<string>();
  for (let i = 0; i < p.count; i += 3) {
    const ids = [0, 1, 2].map((k) =>
      index(new Vector3().fromBufferAttribute(p, i + k)),
    );
    for (let k = 0; k < 3; k++) {
      const [a, b] = [ids[k], ids[(k + 1) % 3]].sort((m, n) => m - n);
      edges.add(`${a}-${b}`);
    }
  }
  const parts: BufferGeometry[] = [...edges].map((edge) => {
    const [a, b] = edge.split("-").map(Number);
    return strut(vertices[a], vertices[b], 0.022);
  });
  const JOINT = 0.065;
  vertices.forEach((v) => parts.push(node(v, JOINT)));
  const { geometry, fit, scale } = assemble(parts);
  const joints = vertices.map(fit);
  const reach = (JOINT * scale * 1.15) ** 2;
  return {
    name: "truss",
    geometry,
    tint: (point, _n, _uv, out) => {
      // Gold joints at the 42 vertices; struts blend teal → blue → violet by height.
      if (joints.some((j) => j.distanceToSquared(point) < reach))
        out.copy(GOLD);
      else ramp([TEAL, BLUE, VIOLET], point.y * 0.5 + 0.5, out);
    },
  };
}

const LAYERS = [4, 7, 7, 3] as const;
const LAYER_TONES = [TEAL, BLUE, VIOLET, GOLD];

function layerNodes() {
  return LAYERS.map((size, layer) =>
    Array.from({ length: size }, (_, k) => {
      const angle = (k / size) * Math.PI * 2 + layer * 0.4;
      const ring = 0.35 + size * 0.1;
      return new Vector3(
        (layer - 1.5) * 1.15,
        Math.cos(angle) * ring,
        Math.sin(angle) * ring,
      );
    }),
  );
}

/** IA: a four-layer network (4–7–7–3), nodes as spheres, weights as fibres. */
function neural(): Form {
  const layers = layerNodes();
  const parts: BufferGeometry[] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (const a of layers[l])
      for (const b of layers[l + 1]) parts.push(strut(a, b, 0.008));
  layers.flat().forEach((v) => parts.push(node(v, 0.13)));
  const { geometry, fit } = assemble(parts);
  const first = fit(layers[0][0]).x,
    last = fit(layers[layers.length - 1][0]).x;
  return {
    name: "neural",
    geometry,
    tint: (point, _n, _uv, out) => {
      // Node colours by layer; fibres fade between the layers they connect.
      ramp(LAYER_TONES, (point.x - first) / (last - first), out);
    },
  };
}

/**
 * Desafios: a 3×3×3 puzzle caught mid-move. The top layer is turned 30° about
 * the vertical axis; every cubie stays aligned with a uniform gap. Only the
 * puzzle's outer surface grid is drawn (180 cubie edges), so the turn shows as
 * the offset seam down the sides. Drawing the faces the turn uncovers stacked
 * three grids on top, and random corner tilts read as a glitch; both dropped.
 */
const CUBIE = 0.9;
const PITCH = 1.04; // centre spacing: 0.14 gap between cubies
const TWIST = Math.PI / 6;

function cube(): Form {
  const parts: BufferGeometry[] = [];
  const half = CUBIE / 2;
  const corners = [-1, 1].flatMap((a) =>
    [-1, 1].flatMap((b) =>
      [-1, 1].map((c) => new Vector3(a, b, c).multiplyScalar(half)),
    ),
  );
  // The 12 edges join corners one cubie apart (diagonals are √2 and √3 apart).
  const edges = corners.flatMap((a, i) =>
    corners
      .slice(i + 1)
      .filter((b) => Math.abs(a.distanceTo(b) - CUBIE) < 1e-6)
      .map((b) => [a, b] as const),
  );
  const twist = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), TWIST);
  const still = new Quaternion();
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const turned = y === 1;
        // Outward faces of this cubie on the puzzle's outer surface: [axis, sign].
        const outward: (readonly [number, number])[] = [];
        if (x) outward.push([0, x]);
        if (y) outward.push([1, y]);
        if (z) outward.push([2, z]);
        // An edge belongs to the grid when both ends lie on one outward face.
        const onSurface = (a: Vector3, b: Vector3) =>
          outward.some(([axis, sign]) => {
            const side = sign * half;
            return (
              a.getComponent(axis) === side && b.getComponent(axis) === side
            );
          });
        const rotation = turned ? twist : still;
        const at = new Vector3(x, y, z)
          .multiplyScalar(PITCH)
          .applyQuaternion(rotation);
        const placement = new Matrix4().compose(
          at,
          rotation,
          new Vector3(1, 1, 1),
        );
        for (const [a, b] of edges)
          if (onSurface(a, b))
            parts.push(strut(a, b, 0.02).applyMatrix4(placement));
      }
  const { geometry, fit } = assemble(parts);
  // Lowest point of the turned layer, in the fitted frame.
  const seam = fit(new Vector3(0, PITCH - half - 0.02, 0)).y;
  return {
    name: "cube",
    geometry,
    tint: (p, _n, _uv, out) => {
      // The layer being turned is the move: gold. The body runs teal → violet.
      if (p.y > seam) out.copy(GOLD);
      else ramp([TEAL, BLUE, VIOLET], (p.x - p.z) * 0.4 + 0.5, out);
    },
  };
}

/** Contato: the portfolio's mark, three right-pointing triangles in a 24-unit box. */
function mark(): Form {
  // .brand-mark: 12-unit triangles at (6, 0) violet, (0, 6) white, (12, 12) amber.
  const corners = [
    [6, 0],
    [0, 6],
    [12, 12],
  ];
  const parts = corners.map(([left, top]) => {
    const shape = new Shape();
    shape.moveTo(left, -top);
    shape.lineTo(left + 12, -(top + 6));
    shape.lineTo(left, -(top + 12));
    shape.closePath();
    return new ExtrudeGeometry(shape, {
      depth: 2.4,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 2,
    });
  });
  const { geometry, fit } = assemble(parts);
  // Triangle centroids (one third of the way in from the left edge).
  const centres = corners.map(([left, top]) =>
    fit(new Vector3(left + 4, -(top + 6), 1.2)),
  );
  const tones = [VIOLET, WHITE, GOLD];
  return {
    name: "mark",
    geometry,
    tint: (p, _n, _uv, out) => {
      let best = 0;
      centres.forEach((c, k) => {
        if (c.distanceToSquared(p) < centres[best].distanceToSquared(p))
          best = k;
      });
      out.copy(tones[best]);
    },
  };
}

/** Atlas order: progress k of the choreography shows form k. */
export const FORM_BUILDERS = [knot, lorenz, truss, neural, cube, mark];

export function createForms(count: number) {
  return FORM_BUILDERS.map((build, k) => {
    const form = build();
    const sampled = sampleEvenly(form, count, 1009 + k * 7919);
    form.geometry.dispose();
    return sampled;
  });
}
