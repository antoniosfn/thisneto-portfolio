import type { SceneForm } from "./build";

/**
 * The closing scene with its detail layer (public/particles/finale.bin): every
 * particle of the picture and every line. The field draws the first CORE
 * particles from forms.bin; the detail layer draws the rest from this file.
 * Little-endian: magic, count, line count, then per particle
 *   position Int16 × 3 over [−RANGE, RANGE], colour + emission Uint8 × 4,
 *   rank Uint16, motion type Uint8 + params Int16 × 3 over [−1, 1],
 * then line pairs Uint32 × 2.
 */
export const SCENE_URL = "/particles/finale.bin";
const MAGIC = 0x334e4946; // "FIN3"
const RANGE = 2;
const STRIDE = 6 + 4 + 2 + 1 + 6;

const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

export function encodeScene(form: SceneForm) {
  const count = form.ranks.length;
  const buffer = new ArrayBuffer(12 + count * STRIDE + form.edges.length * 4);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, count, true);
  view.setUint32(8, form.edges.length / 2, true);
  let at = 12;
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++, at += 2)
      view.setInt16(at, Math.round((clamp(form.points[i * 3 + a], -RANGE, RANGE) / RANGE) * 32767), true);
    for (let a = 0; a < 3; a++) view.setUint8(at++, Math.round(clamp(form.colors[i * 3 + a], 0, 1) * 255));
    view.setUint8(at++, Math.round(clamp(form.emission[i], 0, 1) * 255));
    view.setUint16(at, Math.round(clamp(form.ranks[i], 0, 1) * 65535), true);
    at += 2;
    view.setUint8(at++, form.motion[i * 4]);
    for (let a = 1; a < 4; a++, at += 2)
      view.setInt16(at, Math.round(clamp(form.motion[i * 4 + a], -1, 1) * 32767), true);
  }
  form.edges.forEach((v, k) => view.setUint32(12 + count * STRIDE + k * 4, v, true));
  return new Uint8Array(buffer);
}

export function decodeScene(buffer: ArrayBuffer): SceneForm {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("Unknown scene file");
  const count = view.getUint32(4, true),
    pairs = view.getUint32(8, true);
  const form: SceneForm = {
    name: "finale",
    points: new Float32Array(count * 3),
    colors: new Float32Array(count * 3),
    emission: new Float32Array(count),
    ranks: new Float32Array(count),
    motion: new Float32Array(count * 4),
    edges: new Array(pairs * 2),
  };
  let at = 12;
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++, at += 2) form.points[i * 3 + a] = (view.getInt16(at, true) / 32767) * RANGE;
    for (let a = 0; a < 3; a++) form.colors[i * 3 + a] = view.getUint8(at++) / 255;
    form.emission[i] = view.getUint8(at++) / 255;
    form.ranks[i] = view.getUint16(at, true) / 65535;
    at += 2;
    form.motion[i * 4] = view.getUint8(at++);
    for (let a = 1; a < 4; a++, at += 2) form.motion[i * 4 + a] = view.getInt16(at, true) / 32767;
  }
  for (let k = 0; k < pairs * 2; k++) form.edges[k] = view.getUint32(12 + count * STRIDE + k * 4, true);
  return form;
}

export async function loadScene(signal?: AbortSignal) {
  const response = await fetch(SCENE_URL, { signal, cache: "no-cache" });
  if (!response.ok) throw new Error(`Scene file: HTTP ${response.status}`);
  return decodeScene(await response.arrayBuffer());
}
