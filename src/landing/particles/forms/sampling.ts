import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { seeded } from "./palette";

type Seedable = MeshSurfaceSampler & {
  setRandomGenerator(next: () => number): MeshSurfaceSampler;
};

/** Surface samples: positions, normals and uvs, `count` of each. */
export type Samples = {
  points: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  count: number;
};

/**
 * Merge parts as non-indexed geometry, centre it and fit it in the unit sphere.
 * `fit` maps a point from the parts' own frame into the fitted frame.
 */
export function assemble(parts: BufferGeometry[]) {
  const geometry = merge(parts);
  geometry.computeBoundingBox();
  const centre = geometry.boundingBox!.getCenter(new Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.computeBoundingSphere();
  const scale = 1 / geometry.boundingSphere!.radius;
  geometry.scale(scale, scale, scale);
  const fit = (v: Vector3) => v.clone().sub(centre).multiplyScalar(scale);
  return { geometry, fit, scale };
}

/** Merge parts as one non-indexed geometry, without refitting. */
export function merge(parts: BufferGeometry[]) {
  // Merging needs identical attribute sets; uv survives only if all have it.
  const keep = parts.every((part) => part.getAttribute("uv"))
    ? ["position", "normal", "uv"]
    : ["position", "normal"];
  return mergeGeometries(
    parts.map((part) => {
      const flat = part.index ? part.toNonIndexed() : part;
      for (const name of Object.keys(flat.attributes))
        if (!keep.includes(name)) flat.deleteAttribute(name);
      if (!flat.getAttribute("normal")) flat.computeVertexNormals();
      return flat;
    }),
  );
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
 * Keep `count` of the candidates with a minimum spacing (Poisson disk), so
 * particles sit evenly: that is what gives the regular gaps between them. The
 * spacing starts at `radius` and shrinks 8% at a time until enough samples
 * are accepted. Returns the chosen candidate indices in acceptance order.
 */
export function poissonSelect(
  cands: Float32Array,
  total: number,
  count: number,
  radius: number,
) {
  const taken = new Uint8Array(total);
  const chosen: number[] = [];
  // Numeric cell keys (cells span < 2048 per axis inside the working volume).
  const cellKey = (gx: number, gy: number, gz: number) =>
    ((gx + 1024) * 2048 + (gy + 1024)) * 2048 + (gz + 1024);
  while (chosen.length < count) {
    const grid = new Map<number, number[]>();
    const cell = (v: number) => Math.floor(v / radius);
    const insert = (i: number) => {
      const k = cellKey(
        cell(cands[i * 3]),
        cell(cands[i * 3 + 1]),
        cell(cands[i * 3 + 2]),
      );
      const bucket = grid.get(k);
      if (bucket) bucket.push(i);
      else grid.set(k, [i]);
    };
    chosen.forEach(insert);
    const limit = radius * radius;
    const isFree = (i: number) => {
      const x = cands[i * 3],
        y = cands[i * 3 + 1],
        z = cands[i * 3 + 2];
      const gx = cell(x),
        gy = cell(y),
        gz = cell(z);
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
    };
    for (let i = 0; i < total && chosen.length < count; i++) {
      if (taken[i] || !isFree(i)) continue;
      taken[i] = 1;
      chosen.push(i);
      insert(i);
    }
    radius *= 0.92;
  }
  return chosen;
}

/** Area-weighted, evenly spaced samples on a mesh surface. */
export function sampleMesh(
  geometry: BufferGeometry,
  count: number,
  seed: number,
): Samples {
  // r186 ships setRandomGenerator; the installed typings predate it.
  const sampler = new MeshSurfaceSampler(new Mesh(geometry)) as Seedable;
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
  // Hexagonal packing: each point owns (√3/2)·r², so r = √(2A / (√3·N)).
  // Greedy dart throwing reaches ~55% of that density: hence the shrink loop.
  const radius = Math.sqrt(
    (2 * surfaceArea(geometry)) / (Math.sqrt(3) * count),
  );
  return pick(poissonSelect(cands, total, count, radius), cands, normals, uvs);
}

/** Gather the chosen candidates into packed arrays. */
export function pick(
  chosen: number[],
  cands: Float32Array,
  normals?: Float32Array,
  uvs?: Float32Array,
): Samples {
  const count = chosen.length;
  const out: Samples = {
    points: new Float32Array(count * 3),
    normals: new Float32Array(count * 3),
    uvs: new Float32Array(count * 2),
    count,
  };
  chosen.forEach((i, slot) => {
    out.points.set(cands.subarray(i * 3, i * 3 + 3), slot * 3);
    if (normals) out.normals.set(normals.subarray(i * 3, i * 3 + 3), slot * 3);
    if (uvs) out.uvs.set(uvs.subarray(i * 2, i * 2 + 2), slot * 2);
  });
  return out;
}

export function strut(a: Vector3, b: Vector3, radius: number, sides = 8) {
  const length = a.distanceTo(b);
  const geometry = new CylinderGeometry(radius, radius, length, sides, 1, true);
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

export function node(at: Vector3, radius: number) {
  return new IcosahedronGeometry(radius, 2).translate(at.x, at.y, at.z);
}

/**
 * Undirected k-nearest-neighbour graph over `points`, keeping edges shorter
 * than `maxLength`. These are the thin lines of light between nodes.
 */
export function knnEdges(points: Float32Array, k: number, maxLength: number) {
  const count = points.length / 3;
  const cell = maxLength;
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < count; i++) {
    const id = key(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]);
    const bucket = grid.get(id);
    if (bucket) bucket.push(i);
    else grid.set(id, [i]);
  }
  const seen = new Set<number>();
  const edges: number[] = [];
  const limit = maxLength * maxLength;
  for (let i = 0; i < count; i++) {
    const x = points[i * 3],
      y = points[i * 3 + 1],
      z = points[i * 3 + 2];
    const gx = Math.floor(x / cell),
      gy = Math.floor(y / cell),
      gz = Math.floor(z / cell);
    const near: [number, number][] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const j of grid.get(`${gx + dx},${gy + dy},${gz + dz}`) ?? []) {
            if (j === i) continue;
            const ex = points[j * 3] - x,
              ey = points[j * 3 + 1] - y,
              ez = points[j * 3 + 2] - z;
            const d = ex * ex + ey * ey + ez * ez;
            if (d < limit) near.push([d, j]);
          }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, j] of near.slice(0, k)) {
      const id = Math.min(i, j) * count + Math.max(i, j);
      if (seen.has(id)) continue;
      seen.add(id);
      edges.push(i, j);
    }
  }
  return edges;
}

/** Fisher–Yates shuffle with a seeded generator. */
export function shuffle<T>(items: T[], seed: number) {
  const next = seeded(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
