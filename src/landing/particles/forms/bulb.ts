import {
  BufferGeometry,
  LatheGeometry,
  SplineCurve,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import { budget, emptyForm, fill, type Part } from "./compose";
import { AMBER, BLUE, CYAN, GOLD, WHITE } from "./palette";
import { samplePoints, tube } from "./primitives";
import { merge, strut } from "./sampling";

/** A recognisable glass envelope, screw base and filament: clarity at the FAQ. */
export function bulb(count: number, seed: number) {
  const counts = budget(count, [58, 18, 16, 8]);
  const profile = new SplineCurve([
    new Vector2(0.22, -0.57),
    new Vector2(0.23, -0.43),
    new Vector2(0.34, -0.27),
    new Vector2(0.49, -0.06),
    new Vector2(0.57, 0.18),
    new Vector2(0.54, 0.42),
    new Vector2(0.41, 0.65),
    new Vector2(0.22, 0.79),
    new Vector2(0, 0.84),
  ]);
  const glass = new LatheGeometry(profile.getPoints(18), 18);
  const wire = new WireframeGeometry(glass);
  const positions = wire.getAttribute("position");
  const ribs: BufferGeometry[] = [];
  for (let i = 0; i < positions.count; i += 2) {
    const a = new Vector3().fromBufferAttribute(positions, i);
    const b = new Vector3().fromBufferAttribute(positions, i + 1);
    if (a.distanceToSquared(b) > 1e-8) ribs.push(strut(a, b, 0.004, 3));
  }
  glass.dispose();
  wire.dispose();

  const circle = (y: number, radius: number) =>
    Array.from({ length: 65 }, (_, i) => {
      const angle = (i / 64) * Math.PI * 2;
      return new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    });
  const screw = Array.from({ length: 193 }, (_, i) => {
    const t = i / 192,
      angle = t * Math.PI * 10;
    return new Vector3(
      Math.cos(angle) * 0.215,
      -0.59 - t * 0.28,
      Math.sin(angle) * 0.215,
    );
  });
  const base = merge([
    tube(screw, 0.011, 192),
    tube(circle(-0.57, 0.22), 0.014),
    tube(circle(-0.89, 0.18), 0.014),
    tube(circle(-0.94, 0.1), 0.016),
    ...[-1, 1].map((side) =>
      strut(
        new Vector3(side * 0.18, -0.88, 0),
        new Vector3(side * 0.1, -0.94, 0),
        0.01,
      ),
    ),
  ]);
  const coil = Array.from({ length: 181 }, (_, i) => {
    const t = i / 180,
      angle = t * Math.PI * 36;
    return new Vector3(
      -0.24 + t * 0.48,
      0.14 + Math.sin(t * Math.PI) * 0.1 + Math.cos(angle) * 0.018,
      Math.sin(angle) * 0.018,
    );
  });
  const leads = merge([
    strut(new Vector3(-0.1, -0.57, 0), new Vector3(-0.24, 0.14, 0), 0.009),
    strut(new Vector3(0.1, -0.57, 0), new Vector3(0.24, 0.14, 0), 0.009),
    strut(new Vector3(0, -0.57, 0), new Vector3(0, -0.2, 0), 0.012),
  ]);
  const parts: Part[] = [
    {
      points: samplePoints(merge(ribs), counts[0], seed),
      color: (_i, _p, out) => {
        out.copy(GOLD).lerp(WHITE, 0.06).multiplyScalar(0.65);
      },
      emission: () => 0.04,
      rank: (_i, p) => Math.max(0.12, Math.min(0.92, (p.y + 0.94) / 1.9)),
      lines: { k: 2, maxLength: 0.03 },
    },
    {
      points: samplePoints(base, counts[1], seed + 1),
      color: (_i, _p, out) => {
        out.copy(BLUE).lerp(CYAN, 0.65);
      },
      rank: () => 0.08,
      lines: { k: 2, maxLength: 0.025 },
    },
    {
      points: samplePoints(tube(coil, 0.008, 240), counts[2], seed + 2),
      color: (_i, _p, out) => {
        out.copy(AMBER).lerp(WHITE, 0.15);
      },
      emission: () => 0.35,
      rank: () => 0.96,
      lines: { k: 2, maxLength: 0.02 },
    },
    {
      points: samplePoints(leads, counts[3], seed + 3),
      color: (_i, _p, out) => {
        out.copy(CYAN).lerp(WHITE, 0.12).multiplyScalar(0.65);
      },
      rank: () => 0.7,
      lines: { k: 2, maxLength: 0.025 },
    },
  ];
  const form = emptyForm("bulb", count);
  fill(
    form,
    Array.from({ length: count }, (_, i) => i),
    parts,
    seed,
  );
  // Keep the existing section's framing, including the space under the mobile header.
  for (let i = 0; i < form.points.length; i++) form.points[i] *= 0.86;
  return form;
}
