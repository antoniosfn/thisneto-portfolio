import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { random } from "./hash";
import { merge, sampleMesh, strut } from "./sampling";

/** Grid surface p(u, v), u and v in [0, 1]. */
export function surface(
  at: (u: number, v: number) => Vector3,
  nu = 48,
  nv = 32,
) {
  const positions: number[] = [];
  const corner = (i: number, j: number) => at(i / nu, j / nv);
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = corner(i, j),
        b = corner(i + 1, j),
        c = corner(i + 1, j + 1),
        d = corner(i, j + 1);
      for (const p of [a, b, c, a, c, d]) positions.push(p.x, p.y, p.z);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Thin tube through `points`: a filament of light once sampled. */
export function tube(points: Vector3[], radius: number, segments = 64) {
  return new TubeGeometry(
    new CatmullRomCurve3(points),
    segments,
    radius,
    5,
    false,
  );
}

/** Polyhedron drawn by its edges: the crystal and sacred-geometry nodes. */
export function edgeFrame(
  kind: "tetra" | "octa" | "icosa" | "star",
  centre: Vector3,
  size: number,
  bar: number,
  spin = 0,
) {
  const solids =
    kind === "star"
      ? [new TetrahedronGeometry(size), new TetrahedronGeometry(size).rotateY(Math.PI / 2)]
      : [
          kind === "tetra"
            ? new TetrahedronGeometry(size)
            : kind === "octa"
              ? new OctahedronGeometry(size)
              : new IcosahedronGeometry(size),
        ];
  const parts: BufferGeometry[] = [];
  for (const solid of solids) {
    solid.rotateX(spin).rotateZ(spin * 0.7);
    const p = solid.getAttribute("position");
    const seen = new Set<string>();
    for (let i = 0; i < p.count; i += 3)
      for (let k = 0; k < 3; k++) {
        const a = new Vector3().fromBufferAttribute(p, i + k);
        const b = new Vector3().fromBufferAttribute(p, i + ((k + 1) % 3));
        const key = [a, b]
          .map((v) => v.toArray().map((x) => x.toFixed(4)).join(","))
          .sort()
          .join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        parts.push(strut(a.add(centre), b.add(centre), bar, 4));
      }
  }
  return merge(parts);
}

/** Evenly spaced samples of a geometry, as a plain point array. */
export function samplePoints(
  geometry: BufferGeometry,
  count: number,
  seed: number,
) {
  if (count <= 0) return new Float32Array(0);
  const points = sampleMesh(geometry, count, seed).points;
  geometry.dispose();
  return points;
}

/** Points scattered around a centre with a soft (approximately normal) falloff. */
export function cloud(
  count: number,
  centre: Vector3,
  radius: Vector3,
  salt: number,
) {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const g = (s: number) =>
      (random(i, salt + s) +
        random(i, salt + s + 1) +
        random(i, salt + s + 2) -
        1.5) /
      1.5;
    points.set(
      [
        centre.x + g(0) * radius.x,
        centre.y + g(3) * radius.y,
        centre.z + g(6) * radius.z,
      ],
      i * 3,
    );
  }
  return points;
}

/** Concatenate point arrays. */
export function concat(...arrays: Float32Array[]) {
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}
