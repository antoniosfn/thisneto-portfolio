import { BufferGeometry, Color, Vector2, Vector3 } from "three";
import { emptyForm, fill, type FormData } from "./compose";
import { WHITE, random } from "./palette";
import { sampleMesh } from "./sampling";

export type Tint = (
  point: Vector3,
  normal: Vector3,
  uv: Vector2,
  out: Color,
) => void;

/** Share of particles turned into white sparkles, as inside Dala's brain. */
const SPARKLE = 0.07;

/**
 * A form made of one fitted mesh, sampled evenly: the five original shapes.
 * `scale` sets how much of the factor radius the unit-sphere mesh occupies.
 */
export function meshForm(
  name: string,
  geometry: BufferGeometry,
  count: number,
  seed: number,
  scale: number,
  tint: Tint,
  lines?: { k: number; maxLength: number },
): FormData {
  const samples = sampleMesh(geometry, count, seed);
  geometry.dispose();
  const colors = new Float32Array(count * 3);
  const p = new Vector3(),
    n = new Vector3(),
    uv = new Vector2(),
    color = new Color();
  for (let i = 0; i < count; i++) {
    p.fromArray(samples.points, i * 3);
    n.fromArray(samples.normals, i * 3);
    uv.fromArray(samples.uvs, i * 2);
    tint(p, n, uv, color);
    if (random(i, 31) < SPARKLE) color.lerp(WHITE, 0.85);
    color.toArray(colors, i * 3);
  }
  const points = samples.points.map((v) => v * scale);
  const form = emptyForm(name, count);
  fill(
    form,
    [...Array(count).keys()],
    [
      {
        points,
        color: (i, _p, out) => out.fromArray(colors, i * 3),
        emission: (i) => (random(i, 31) < SPARKLE ? 0.55 : 0),
        lines: lines && {
          k: lines.k,
          maxLength: lines.maxLength * scale,
        },
      },
    ],
    seed,
  );
  return form;
}
