import { inflateSync } from "node:zlib";

/** Decoded 8-bit image, RGB(A) interleaved. */
export type Raster = {
  width: number;
  height: number;
  channels: 3 | 4;
  data: Uint8Array;
};

/**
 * Minimal PNG decoder for the build: 8-bit RGB or RGBA, not interlaced, which
 * is what Pillow and most tools write. Build-time only (node:zlib).
 */
export function decodePng(file: Uint8Array): Raster {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (view.getUint32(0) !== 0x89504e47) throw new Error("Not a PNG file");
  let offset = 8,
    width = 0,
    height = 0,
    channels: 3 | 4 = 3;
  const chunks: Uint8Array[] = [];
  while (offset < file.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...file.subarray(offset + 4, offset + 8));
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const depth = body[8],
        color = body[9],
        interlace = body[12];
      if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6))
        throw new Error("Only 8-bit, non-interlaced RGB/RGBA PNG is supported");
      channels = color === 6 ? 4 : 3;
    } else if (type === "IDAT") chunks.push(body);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  const packed = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)];
    const row = packed.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? data[y * stride + x - channels] : 0;
      const up = y ? data[(y - 1) * stride + x] : 0;
      const corner = y && x >= channels ? data[(y - 1) * stride + x - channels] : 0;
      let value = row[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        // Paeth predictor
        const p = left + up - corner;
        const pa = Math.abs(p - left),
          pb = Math.abs(p - up),
          pc = Math.abs(p - corner);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      }
      data[y * stride + x] = value & 255;
    }
  }
  return { width, height, channels, data };
}
