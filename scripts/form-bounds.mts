/** Prints each form's bounds and centre from public/particles/forms.bin. */
import { readFileSync } from "node:fs";
import { decodeForms } from "../src/landing/particles/forms-file.ts";

const bytes = readFileSync(new URL("../public/particles/forms.bin", import.meta.url));
for (const form of decodeForms(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < form.points.length; i += 3)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], form.points[i + a]);
      max[a] = Math.max(max[a], form.points[i + a]);
    }
  const f = (v: number[]) => v.map((x) => x.toFixed(2)).join(", ");
  console.log(`${form.name.padEnd(9)} min [${f(min)}]  max [${f(max)}]`);
}
