import { BufferGeometry, Color, LinearSRGBColorSpace, Vector3 } from "three";
import { MOTION } from "./catalog";
import { meshForm } from "./mesh-form";
import { assemble, strut } from "./sampling";

/**
 * Desafios: a 3×3×3 puzzle, solved in the atlas. Each face carries one colour,
 * as the original. The shader scrambles it with CUBE_SCRAMBLE and undoes the
 * moves one by one as the solutions scroll by (motion CUBIE).
 */
const CUBIE = 0.9;
const PITCH = 1.04; // centre spacing: 0.14 gap between cubies
// The meshForm scale: grid coordinates are read back from the final points.
const SCALE = 0.6;
const tone = (hex: string) => new Color().setStyle(hex, LinearSRGBColorSpace);
// Stickers by outward axis and sign: R/L, U/D, F/B.
const FACE: Record<string, Color> = {
  "0,1": tone("#e8343a"), // right: red
  "0,-1": tone("#ff8a1f"), // left: orange
  "1,1": tone("#f4f4f0"), // up: white
  "1,-1": tone("#ffd51c"), // down: yellow
  "2,1": tone("#1fbf5b"), // front: green
  "2,-1": tone("#2a62ff"), // back: blue
};

export function cube(count: number, seed: number) {
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
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
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
        const at = new Vector3(x, y, z).multiplyScalar(PITCH);
        for (const [a, b] of edges)
          if (onSurface(a, b))
            parts.push(strut(a, b, 0.02).translate(at.x, at.y, at.z));
      }
  const { geometry, scale } = assemble(parts);
  const pitch = PITCH * scale;
  const grid = (p: Vector3) =>
    new Vector3(
      Math.round(p.x / pitch),
      Math.round(p.y / pitch),
      Math.round(p.z / pitch),
    );
  const form = meshForm("cube", geometry, count, seed, SCALE, (p, _n, _uv, out) => {
    // The sticker: the outward face this point sits furthest towards.
    const g = grid(p);
    const local = p.clone().sub(g.clone().multiplyScalar(pitch));
    let best = -Infinity,
      key = "1,1";
    for (let axis = 0; axis < 3; axis++) {
      const sign = g.getComponent(axis);
      if (!sign) continue;
      const reach = sign * local.getComponent(axis);
      if (reach > best) (best = reach), (key = `${axis},${sign}`);
    }
    out.copy(FACE[key]);
  });
  // Each particle remembers its cubie, so the shader turns whole layers.
  form.motion = new Float32Array(count * 4);
  const p = new Vector3();
  for (let i = 0; i < count; i++) {
    const g = grid(p.fromArray(form.points, i * 3).divideScalar(SCALE));
    form.motion.set([MOTION.CUBIE, g.x, g.y, g.z], i * 4);
  }
  return form;
}
