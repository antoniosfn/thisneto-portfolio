import { Vector3 } from "three";
import { random } from "./hash";
import { pick, poissonSelect, type Samples } from "./sampling";

/** Signed distance: negative inside. */
export type Sdf = (p: Vector3) => number;

/** Approximate ellipsoid distance (Quílez). */
export function ellipsoid(centre: Vector3, radius: Vector3): Sdf {
  const q = new Vector3();
  return (p) => {
    q.copy(p).sub(centre);
    const k0 = Math.hypot(q.x / radius.x, q.y / radius.y, q.z / radius.z);
    const k1 = Math.hypot(q.x / radius.x ** 2, q.y / radius.y ** 2, q.z / radius.z ** 2);
    return (k0 * (k0 - 1)) / Math.max(1e-9, k1);
  };
}

/** Capsule whose radius tapers from `ra` at a to `rb` at b (Quílez round cone). */
export function roundCone(a: Vector3, b: Vector3, ra: number, rb: number): Sdf {
  const ba = b.clone().sub(a);
  const l2 = ba.dot(ba);
  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pa = new Vector3(),
    x = new Vector3();
  return (p) => {
    pa.copy(p).sub(a);
    const y = pa.dot(ba);
    const z = y - l2;
    x.copy(pa).multiplyScalar(l2).addScaledVector(ba, -y);
    const x2 = x.dot(x);
    const y2 = y * y * l2;
    const z2 = z * z * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra;
  };
}

/** Polynomial smooth minimum: blends shapes into one continuous skin. */
export function smoothUnion(shapes: Sdf[], k: number): Sdf {
  return (p) => {
    let d = shapes[0](p);
    for (let i = 1; i < shapes.length; i++) {
      const e = shapes[i](p);
      const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (e - d)) / k));
      d = e * (1 - h) + d * h - k * h * (1 - h);
    }
    return d;
  };
}

/**
 * Evenly spaced points on the zero surface of `sdf`: random points near the
 * skin are pulled onto it along the gradient, then thinned to a minimum
 * spacing.
 */
export function sampleSdf(
  sdf: Sdf,
  min: Vector3,
  max: Vector3,
  count: number,
  area: number,
  salt: number,
): Samples {
  const wanted = count * 4;
  const cands: number[] = [],
    normals: number[] = [];
  const p = new Vector3(),
    g = new Vector3(),
    probe = new Vector3();
  const e = 0.0015;
  const gradient = () => {
    const at = (dx: number, dy: number, dz: number) =>
      sdf(probe.set(p.x + dx, p.y + dy, p.z + dz));
    return g
      .set(at(e, 0, 0) - at(-e, 0, 0), at(0, e, 0) - at(0, -e, 0), at(0, 0, e) - at(0, 0, -e))
      .normalize();
  };
  for (let i = 0; cands.length < wanted * 3 && i < wanted * 400; i++) {
    p.set(
      min.x + (max.x - min.x) * random(i, salt),
      min.y + (max.y - min.y) * random(i, salt + 1),
      min.z + (max.z - min.z) * random(i, salt + 2),
    );
    let d = sdf(p);
    if (Math.abs(d) > 0.03) continue;
    for (let k = 0; k < 4 && Math.abs(d) > 1e-4; k++) {
      p.addScaledVector(gradient(), -d);
      d = sdf(p);
    }
    if (Math.abs(d) > 0.002) continue;
    gradient();
    cands.push(p.x, p.y, p.z);
    normals.push(g.x, g.y, g.z);
  }
  const total = cands.length / 3;
  const radius = Math.sqrt((2 * area) / (Math.sqrt(3) * count));
  return pick(
    poissonSelect(Float32Array.from(cands), total, count, radius),
    Float32Array.from(cands),
    Float32Array.from(normals),
  );
}
