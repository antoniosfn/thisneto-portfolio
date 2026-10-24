import {
  LinearSRGBColorSpace,
  Color,
  DataTexture,
  FloatType,
  NearestFilter,
  RGBAFormat,
} from "three";
import { createParticleTargets, random } from "./particle-shapes";

export const SIDE = 100;
export const COUNT = SIDE * SIDE;
/**
 * Brain placement in model space, fitted to Dala's hero at f = 0.12 (1568×758,
 * literal camera). Dala's brain body spans 0.182–0.834 H and centres near
 * 0.66 W; ours spanned 0.210–0.938 H around 0.62 W. Scaling by 0.652 / 0.728 and
 * shifting by (+0.8, +0.665) world units at factor 4.35 matches it. The lateral
 * axis is stretched 1.6× so the frontal introduction spans as wide as Dala's.
 */
const BRAIN_FIT = {
  scale: 0.896,
  depth: 1.6,
  x: 0.8 / 4.35,
  y: 0.665 / 4.35,
} as const;

function fitBrain(points: Float32Array) {
  const out = new Float32Array(points.length);
  for (let i = 0; i < points.length; i += 3) {
    out[i] = points[i] * BRAIN_FIT.scale + BRAIN_FIT.x;
    out[i + 1] = points[i + 1] * BRAIN_FIT.scale + BRAIN_FIT.y;
    out[i + 2] = points[i + 2] * BRAIN_FIT.scale * BRAIN_FIT.depth;
  }
  return out;
}

export function dataTexture(data: Float32Array, side = SIDE) {
  const texture = new DataTexture(data, side, side, RGBAFormat, FloatType);
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Gold contour, violet bands, white body and teal base, as on Dala's brain. */
function colorBrain(
  brain: Float32Array,
  i: number,
  palette: Color[],
  color: Color,
) {
  const x = brain[i * 3],
    y = brain[i * 3 + 1],
    z = brain[i * 3 + 2];
  const contour = Math.sqrt((x / 0.82) ** 2 + ((y - 0.16) / 0.62) ** 2);
  const band = 0.5 + 0.5 * Math.sin(y * 10 + x * 3 + z * 4);
  color.copy(y < -0.24 ? palette[3] : palette[2]);
  color.lerp(palette[1], Math.max(0, (band - 0.48) * 1.7));
  color.lerp(palette[0], Math.max(0, Math.min(1, (contour - 0.72) * 4)));
}

export function createParticleData() {
  const targets = createParticleTargets(COUNT);
  const positions = new Float32Array(COUNT * 16);
  const colors = new Float32Array(COUNT * 16);
  const scales = new Float32Array(COUNT * 16);
  const params = new Float32Array(COUNT * 4);
  const ranks = new Float32Array(COUNT * 4);
  const explosion = new Float32Array(COUNT * 4);
  const initial = new Float32Array(COUNT * 4);
  const uv = new Float32Array(COUNT * 2);
  const palette = [
    "#F5B820",
    "#8B4DFF",
    "#F4E6F5",
    "#2FBF9B",
    "#3F6BFF",
    "#D94DE0",
    // Raw sRGB values: the field is composed in display space, like Dala's
    // pre-r152 three.js, so blending and the bloom threshold act on them.
  ].map((c) => new Color().setStyle(c, LinearSRGBColorSpace));
  const color = new Color();
  const brain = fitBrain(targets.brain);
  [brain, targets.bulb, targets.globe, targets.mark].forEach(
    (shape, quadrant) => {
      for (let i = 0; i < COUNT; i++) {
        const x = shape[i * 3],
          y = shape[i * 3 + 1],
          z = shape[i * 3 + 2];
        const pixel =
          ((Math.floor(i / SIDE) + Math.floor(quadrant / 2) * SIDE) * SIDE * 2 +
            (i % SIDE) +
            (quadrant % 2) * SIDE) *
          4;
        positions.set([x * 0.5 + 0.5, y * 0.5 + 0.5, z * 0.5 + 0.5, 1], pixel);
        // The brain's palette keeps its thresholds in the original proportions.
        if (quadrant === 0) {
          colorBrain(targets.brain, i, palette, color);
          colors.set([color.r, color.g, color.b, 1], pixel);
          scales.set([0.35 + 0.8 * random(i, 12) ** 3, 0, 0, 1], pixel);
          continue;
        }
        // Palette is baked in object space independently for each atlas quadrant.
        if (quadrant === 2) {
          color.copy(
            targets.seed[i * 4 + 3] ? palette[y > 0.1 ? 0 : 3] : palette[4],
          );
          if (!targets.seed[i * 4 + 3]) color.multiplyScalar(0.12);
        } else {
          color.copy(palette[quadrant === 1 ? 0 : 1]);
          color.lerp(palette[2], 0.5 + 0.5 * Math.sin(y * 7 + z * 2));
          if (y < -0.25) color.lerp(palette[3], 0.7);
        }
        colors.set([color.r, color.g, color.b, 1], pixel);
        const size = 0.35 + 0.8 * random(i, 12) ** 3;
        scales.set([size * (quadrant === 3 ? 0.8 : 1), 0, 0, 1], pixel);
      }
    },
  );
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i < COUNT; i++) {
    low = Math.min(low, brain[i * 3 + 1]);
    high = Math.max(high, brain[i * 3 + 1]);
  }
  for (let i = 0; i < COUNT; i++) {
    // Observed at explode≈0.53: a dense crest survives on top while the rest scatters,
    // and it is gone at explode=1. Ranking the explosion by height reproduces that.
    const height = (brain[i * 3 + 1] - low) / (high - low);
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
    initial.set(
      [
        brain[i * 3] * 7.35,
        brain[i * 3 + 1] * 7.35,
        brain[i * 3 + 2] * 7.35,
        1,
      ],
      i * 4,
    );
  }
  const textures = {
    position: dataTexture(positions, SIDE * 2),
    color: dataTexture(colors, SIDE * 2),
    scale: dataTexture(scales, SIDE * 2),
    params: dataTexture(params),
    ranks: dataTexture(ranks),
    explosion: dataTexture(explosion),
    initial: dataTexture(initial),
    zero: dataTexture(new Float32Array(COUNT * 4)),
  };
  return { textures, uv };
}
