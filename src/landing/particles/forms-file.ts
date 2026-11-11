import type { FormData } from "./forms/compose";

/**
 * Precomputed particle forms. Sampling nine forms evenly costs seconds of CPU,
 * so scripts/build-particle-forms.mts runs it once and ships the result.
 * Layout (little-endian): magic, form count, point count, then per form:
 *   flags (1 motion, 2 edges), name length + name,
 *   positions Int16 × 3 over [−RANGE, RANGE], rank Uint16, colour + emission Uint8 × 4,
 *   [motion: type Uint16, params Int16 × 3 over [−1, 1]],
 *   [edges: count Uint32, index pairs Uint16 × 2].
 */
export const FORMS_URL = "/particles/forms.bin";
const MAGIC = 0x32524650; // "PFR2"
const RANGE = 2;
const HAS_MOTION = 1,
  HAS_EDGES = 2;

class Writer {
  private bytes: number[] = [];
  private view = new DataView(new ArrayBuffer(8));
  private push(size: number) {
    for (let i = 0; i < size; i++) this.bytes.push(this.view.getUint8(i));
  }
  u8(v: number) {
    this.bytes.push(v & 255);
  }
  u16(v: number) {
    this.view.setUint16(0, v, true);
    this.push(2);
  }
  i16(v: number) {
    this.view.setInt16(0, v, true);
    this.push(2);
  }
  u32(v: number) {
    this.view.setUint32(0, v, true);
    this.push(4);
  }
  result() {
    return Uint8Array.from(this.bytes);
  }
}

class Reader {
  private offset = 0;
  private view: DataView;
  constructor(view: DataView) {
    this.view = view;
  }
  u8() {
    return this.view.getUint8(this.offset++);
  }
  u16() {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }
  i16() {
    const v = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return v;
  }
  u32() {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }
}

const clamp = (v: number, low: number, high: number) =>
  Math.max(low, Math.min(high, v));
const signed = (v: number, range: number) =>
  Math.round((clamp(v, -range, range) / range) * 32767);

export function encodeForms(forms: FormData[]) {
  const count = forms[0].points.length / 3;
  const out = new Writer();
  out.u32(MAGIC);
  out.u32(forms.length);
  out.u32(count);
  for (const form of forms) {
    out.u32((form.motion ? HAS_MOTION : 0) | (form.edges ? HAS_EDGES : 0));
    out.u8(form.name.length);
    for (const c of form.name) out.u8(c.charCodeAt(0));
    form.points.forEach((v) => out.i16(signed(v, RANGE)));
    form.ranks.forEach((v) => out.u16(Math.round(clamp(v, 0, 1) * 65535)));
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < 3; c++)
        out.u8(Math.round(clamp(form.colors[i * 3 + c], 0, 1) * 255));
      out.u8(Math.round(clamp(form.emission[i], 0, 1) * 255));
    }
    if (form.motion)
      for (let i = 0; i < count; i++) {
        out.u16(form.motion[i * 4]);
        for (let c = 1; c < 4; c++) out.i16(signed(form.motion[i * 4 + c], 1));
      }
    if (form.edges) {
      out.u32(form.edges.length / 2);
      form.edges.forEach((v) => out.u16(v));
    }
  }
  return out.result();
}

export function decodeForms(buffer: ArrayBuffer): FormData[] {
  const input = new Reader(new DataView(buffer));
  if (input.u32() !== MAGIC) throw new Error("Unknown forms file");
  const forms = input.u32(),
    count = input.u32();
  return Array.from({ length: forms }, () => {
    const flags = input.u32();
    const name = String.fromCharCode(
      ...Array.from({ length: input.u8() }, () => input.u8()),
    );
    const points = new Float32Array(count * 3);
    for (let i = 0; i < points.length; i++)
      points[i] = (input.i16() / 32767) * RANGE;
    const ranks = new Float32Array(count);
    for (let i = 0; i < count; i++) ranks[i] = input.u16() / 65535;
    const colors = new Float32Array(count * 3),
      emission = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < 3; c++) colors[i * 3 + c] = input.u8() / 255;
      emission[i] = input.u8() / 255;
    }
    let motion: Float32Array | null = null;
    if (flags & HAS_MOTION) {
      motion = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        motion[i * 4] = input.u16();
        for (let c = 1; c < 4; c++) motion[i * 4 + c] = input.i16() / 32767;
      }
    }
    let edges: number[] | null = null;
    if (flags & HAS_EDGES) {
      const pairs = input.u32();
      edges = Array.from({ length: pairs * 2 }, () => input.u16());
    }
    return { name, points, colors, emission, ranks, motion, edges };
  });
}

/**
 * How long one `read()` may sit before we treat the stream as stuck.
 * WebKit withholds bytes that arrive while the reader is busy and only
 * flushes them when more network data arrives (bugs 322545 and 330332).
 * The book is drawn on the main thread, so after the first buffer — about
 * 256 KiB of the 1,625,571-byte file, 14% of this bar — `read()` can hang
 * and the counter stays on 014. A quiet read is abandoned and the file is
 * fetched again as a single buffer, which does complete.
 */
const READ_STALL_MS = 3000;

class FormsStall extends Error {
  constructor() {
    super("forms-stall");
    this.name = "FormsStall";
  }
}

function withStall<T>(work: Promise<T>, ms: number) {
  let timer = 0;
  const limit = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new FormsStall()), ms);
  });
  return Promise.race([work, limit]).finally(() => window.clearTimeout(timer));
}

async function readStream(response: Response, onProgress?: (fraction: number) => void) {
  const total = Number(response.headers.get("content-length"));
  if (!onProgress || !response.body || !Number.isFinite(total) || total <= 0)
    return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await withStall(reader.read(), READ_STALL_MS);
      if (done || !value) break;
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(0.98, received / total));
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes.buffer;
}

async function fetchForms(signal?: AbortSignal) {
  // Revalidate (ETag): a rebuilt forms file is never served stale.
  const response = await fetch(FORMS_URL, { signal, cache: "no-cache" });
  if (!response.ok) throw new Error(`Forms file: HTTP ${response.status}`);
  return response;
}

export async function loadForms(signal?: AbortSignal, onProgress?: (fraction: number) => void) {
  let buffer: ArrayBuffer;
  try {
    buffer = await readStream(await fetchForms(signal), onProgress);
  } catch (error) {
    if (signal?.aborted || !(error instanceof FormsStall)) throw error;
    buffer = await (await fetchForms(signal)).arrayBuffer();
  }
  onProgress?.(1);
  return decodeForms(buffer);
}
