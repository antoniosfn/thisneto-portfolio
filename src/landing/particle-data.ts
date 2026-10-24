import { DataTexture, FloatType, NearestFilter, RGBAFormat } from "three";
import { random, type SampledForm } from "./particle-shapes";

export const SIDE = 100;
export const COUNT = SIDE * SIDE;
/** 3×3 atlas: room for nine forms; the choreography uses six. */
export const GRID = 3;

/**
 * Each form is fitted to the unit sphere when it is built; this sets how much
 * of the factor radius (4.35 world units) it occupies on screen. Fitted by
 * eye against the copy columns at 1440×900, 1280×720 and 390×844.
 */
const FORM_SCALE = [0.72, 0.8, 0.58, 0.72, 0.72, 0.46];

export function dataTexture(data: Float32Array, side = SIDE) {
  const texture = new DataTexture(data, side, side, RGBAFormat, FloatType);
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** RGBA offset of particle `i` in atlas slot `k`. */
function atlasPixel(i: number, k: number) {
  const row = Math.floor(i / SIDE) + Math.floor(k / GRID) * SIDE;
  const column = (i % SIDE) + (k % GRID) * SIDE;
  return (row * SIDE * GRID + column) * 4;
}

export function createParticleData(forms: SampledForm[]) {
  const atlas = (SIDE * GRID) ** 2 * 4;
  const positions = new Float32Array(atlas);
  const colors = new Float32Array(atlas);
  const scales = new Float32Array(atlas);
  const params = new Float32Array(COUNT * 4);
  const ranks = new Float32Array(COUNT * 4);
  const explosion = new Float32Array(COUNT * 4);
  const initial = new Float32Array(COUNT * 4);
  const uv = new Float32Array(COUNT * 2);
  forms.forEach((form, k) => {
    const scale = FORM_SCALE[k] ?? 0.6;
    for (let i = 0; i < COUNT; i++) {
      const pixel = atlasPixel(i, k);
      const [x, y, z] = [0, 1, 2].map((a) => form.points[i * 3 + a] * scale);
      positions.set([x * 0.5 + 0.5, y * 0.5 + 0.5, z * 0.5 + 0.5, 1], pixel);
      colors.set(
        [form.colors[i * 3], form.colors[i * 3 + 1], form.colors[i * 3 + 2], 1],
        pixel,
      );
      const size = 0.35 + 0.8 * random(i, 12) ** 3;
      scales.set([size * (k === forms.length - 1 ? 0.8 : 1), 0, 0, 1], pixel);
    }
  });
  const hero = forms[0].points;
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    low = Math.min(low, hero[i * 3 + 1]);
    high = Math.max(high, hero[i * 3 + 1]);
  }
  for (let i = 0; i < COUNT; i++) {
    // Observed on Dala at explode≈0.53: a dense crest survives on top while the
    // rest scatters, gone at explode=1. Ranking the explosion by height does it.
    const height = (hero[i * 3 + 1] - low) / (high - low);
    uv.set(
      [((i % SIDE) + 0.5) / SIDE, (Math.floor(i / SIDE) + 0.5) / SIDE],
      i * 2,
    );
    params.set(
      [
        random(i, 20),
        random(i, 21),
        random(i, 22) * (COUNT - 1),
        random(i, 23) * 0.003,
      ],
      i * 4,
    );
    ranks.set(
      [
        random(i, 24),
        random(i, 25),
        random(i, 26),
        0.6 * height + 0.4 * random(i, 27),
      ].map((v) => v * (COUNT - 1)),
      i * 4,
    );
    // Unknown source texture: radial multiplier is explicitly a reconstruction,
    // calibrated to ~150 visible triangles of 6–40 px in the settled cloud.
    explosion.set([3.4 + 16 * random(i, 28) ** 0.9, 0, 0, 1], i * 4);
    const s = FORM_SCALE[0] * 7.35;
    initial.set(
      [hero[i * 3] * s, hero[i * 3 + 1] * s, hero[i * 3 + 2] * s, 1],
      i * 4,
    );
  }
  const textures = {
    position: dataTexture(positions, SIDE * GRID),
    color: dataTexture(colors, SIDE * GRID),
    scale: dataTexture(scales, SIDE * GRID),
    params: dataTexture(params),
    ranks: dataTexture(ranks),
    explosion: dataTexture(explosion),
    initial: dataTexture(initial),
    zero: dataTexture(new Float32Array(COUNT * 4)),
  };
  return { textures, uv };
}
