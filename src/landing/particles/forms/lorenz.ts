import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import { meshForm } from "./mesh-form";
import { GOLD, MAGENTA, TEAL, VIOLET } from "./palette";
import { assemble } from "./sampling";

/** Matemática: the Lorenz attractor (σ = 10, ρ = 28, β = 8/3) as a thin tube. */
export function lorenz(count: number, seed: number) {
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
  const tube = new TubeGeometry(curve, 3000, 0.3, 6, false);
  return meshForm(
    "lorenz",
    assemble([tube]).geometry,
    count,
    seed,
    0.94,
    (p, _n, _uv, out) => {
      // Gold and violet lobes meet in magenta; the base of the wings turns teal.
      out
        .copy(p.x > 0 ? GOLD : VIOLET)
        .lerp(MAGENTA, Math.max(0, 1 - Math.abs(p.x) * 2.4));
      out.lerp(TEAL, Math.max(0, Math.min(1, (-p.y - 0.35) * 2)));
    },
  );
}
