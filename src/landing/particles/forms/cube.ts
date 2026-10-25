import { BufferGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { meshForm } from "./mesh-form";
import { BLUE, GOLD, TEAL, VIOLET, ramp } from "./palette";
import { assemble, strut } from "./sampling";

/**
 * Desafios: a 3×3×3 puzzle caught mid-move. The top layer is turned 30° about
 * the vertical axis; every cubie stays aligned with a uniform gap. Only the
 * puzzle's outer surface grid is drawn (180 cubie edges), so the turn shows as
 * the offset seam down the sides.
 */
const CUBIE = 0.9;
const PITCH = 1.04; // centre spacing: 0.14 gap between cubies
const TWIST = Math.PI / 6;

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
  return meshForm(
    "cube",
    geometry,
    count,
    seed,
    0.6,
    (p, _n, _uv, out) => {
      // The layer being turned is the move: gold. The body runs teal → violet.
      if (p.y > seam) out.copy(GOLD);
      else ramp([TEAL, BLUE, VIOLET], (p.x - p.z) * 0.4 + 0.5, out);
    },
  );
}
