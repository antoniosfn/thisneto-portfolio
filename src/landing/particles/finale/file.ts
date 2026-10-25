import type { SceneForm } from "./build";

/**
 * Preview file for the closing scene (public/particles/finale.bin), until it
 * joins the forms atlas. Little-endian: magic, count, edge count, then
 * Float32 points ×3, colours ×3, emission, rank, motion ×4, Uint32 edge pairs.
 */
export const SCENE_URL = "/particles/finale.bin";
const MAGIC = 0x324e4946; // "FIN2"

export function encodeScene(form: SceneForm) {
  const count = form.ranks.length;
  const floats = count * 12;
  const buffer = new ArrayBuffer(12 + floats * 4 + form.edges.length * 4);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, count, true);
  view.setUint32(8, form.edges.length / 2, true);
  const body = new Float32Array(buffer, 12, floats);
  [form.points, form.colors, form.emission, form.ranks, form.motion].reduce((offset, part) => {
    body.set(part, offset);
    return offset + part.length;
  }, 0);
  new Uint32Array(buffer, 12 + floats * 4).set(form.edges);
  return new Uint8Array(buffer);
}

export function decodeScene(buffer: ArrayBuffer): SceneForm {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("Unknown scene file");
  const count = view.getUint32(4, true),
    pairs = view.getUint32(8, true);
  const body = new Float32Array(buffer, 12, count * 12);
  let offset = 0;
  const take = (size: number) => body.slice(offset, (offset += size));
  return {
    name: "finale",
    points: take(count * 3),
    colors: take(count * 3),
    emission: take(count),
    ranks: take(count),
    motion: take(count * 4),
    edges: Array.from(new Uint32Array(buffer, 12 + count * 48, pairs * 2)),
  };
}
