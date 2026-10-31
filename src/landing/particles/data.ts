import { DataTexture, FloatType, NearestFilter, RGBAFormat } from "three";
import { COUNT, FORM_COUNT, SIDE } from "./forms/catalog";
import type { FormData } from "./forms/compose";
import { random } from "./forms/hash";

/** Atlas grid: GRID × GRID slots of SIDE² particles, one form per slot. */
export const GRID = Math.ceil(Math.sqrt(FORM_COUNT));

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

/** A form's lines, as particle pairs with their rest length. */
export type FormEdges = { form: number; pairs: number[]; rest: number[] };

export function createParticleData(forms: FormData[]) {
  if (forms.length !== FORM_COUNT || forms[0].points.length !== COUNT * 3)
    throw new Error("Forms file and the atlas layout disagree");
  const atlas = (SIDE * GRID) ** 2 * 4;
  const positions = new Float32Array(atlas);
  const colors = new Float32Array(atlas);
  const motions = new Float32Array(atlas);
  const params = new Float32Array(COUNT * 4);
  const ranks = new Float32Array(COUNT * 4);
  const explosion = new Float32Array(COUNT * 4);
  const initial = new Float32Array(COUNT * 4);
  const uv = new Float32Array(COUNT * 2);
  const edges: FormEdges[] = [];
  forms.forEach((form, k) => {
    for (let i = 0; i < COUNT; i++) {
      const pixel = atlasPixel(i, k);
      positions.set(
        [form.points[i * 3], form.points[i * 3 + 1], form.points[i * 3 + 2], form.ranks[i]],
        pixel,
      );
      colors.set(
        [form.colors[i * 3], form.colors[i * 3 + 1], form.colors[i * 3 + 2], form.emission[i]],
        pixel,
      );
      if (form.motion) motions.set(form.motion.subarray(i * 4, i * 4 + 4), pixel);
    }
    if (form.edges) {
      const rest: number[] = [];
      for (let e = 0; e < form.edges.length; e += 2) {
        const a = form.edges[e] * 3,
          b = form.edges[e + 1] * 3;
        rest.push(
          Math.hypot(
            form.points[a] - form.points[b],
            form.points[a + 1] - form.points[b + 1],
            form.points[a + 2] - form.points[b + 2],
          ),
        );
      }
      edges.push({ form: k, pairs: form.edges, rest });
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
    uv.set([((i % SIDE) + 0.5) / SIDE, (Math.floor(i / SIDE) + 0.5) / SIDE], i * 2);
    params.set([random(i, 20), random(i, 21), random(i, 22), random(i, 23) * 0.003], i * 4);
    ranks.set([0.6 * height + 0.4 * random(i, 27), random(i, 25), random(i, 26), random(i, 24)], i * 4);
    // Radial multiplier of the burst, calibrated to ~150 visible triangles
    // of 6–40 px in the settled cloud.
    explosion.set([3.4 + 16 * random(i, 28) ** 0.9, 0, 0, 1], i * 4);
    // The hero form, scaled out of the screen: the field flies in on load.
    initial.set([hero[i * 3] * 7.35, hero[i * 3 + 1] * 7.35, hero[i * 3 + 2] * 7.35, 1], i * 4);
  }
  const textures = {
    position: dataTexture(positions, SIDE * GRID),
    color: dataTexture(colors, SIDE * GRID),
    motion: dataTexture(motions, SIDE * GRID),
    params: dataTexture(params),
    ranks: dataTexture(ranks),
    explosion: dataTexture(explosion),
    initial: dataTexture(initial),
    zero: dataTexture(new Float32Array(COUNT * 4)),
  };
  return { textures, uv, edges };
}
