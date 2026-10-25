import { TorusKnotGeometry, Vector3 } from "three";
import { meshForm } from "./mesh-form";
import { BLUE, GOLD, MAGENTA, TEAL, VIOLET, ramp } from "./palette";
import { assemble } from "./sampling";

/** Hero: trefoil (2, 3) torus knot, star facing +x so it turns frontal at −π/2. */
export function knot(count: number, seed: number) {
  const geometry = new TorusKnotGeometry(1, 0.2, 720, 24, 2, 3);
  geometry.rotateY(Math.PI / 2);
  const planar = new Vector3();
  return meshForm(
    "knot",
    assemble([geometry]).geometry,
    count,
    seed,
    0.72,
    (p, n, uv, out) => {
      // Violet → magenta → blue → teal along the line, gold where the tube faces out.
      ramp([VIOLET, MAGENTA, BLUE, TEAL, VIOLET], (uv.x * 3) % 1, out);
      planar.set(0, p.y, p.z).normalize();
      const rim = n.dot(planar);
      out.lerp(GOLD, Math.max(0, Math.min(1, (rim - 0.35) * 2.2)));
    },
  );
}
