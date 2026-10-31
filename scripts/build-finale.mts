/**
 * Builds public/particles/finale.bin, the closing scene, from
 * docs/reference/finale/source-640.png (the reference downscaled to 640 px).
 * Deterministic. Run: npm run finale
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE, DETAIL, buildScene } from "../src/landing/particles/finale/build.ts";
import { encodeScene } from "../src/landing/particles/finale/file.ts";
import { decodePng } from "../src/landing/particles/finale/png.ts";
import { REGIONS } from "../src/landing/particles/finale/regions.ts";

const COUNT = CORE + DETAIL; // the field's 128² particles, then the detail layer
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "docs/reference/finale/source-640.png");
const target = resolve(root, "public/particles/finale.bin");
const started = performance.now();
const scene = buildScene(decodePng(readFileSync(source)), COUNT);
const bytes = encodeScene(scene);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, bytes);

// Particles per region, to check the budget lands where the picture needs it.
const tally = new Map<string, number>();
scene.region!.forEach((r) => tally.set(REGIONS[r].name, (tally.get(REGIONS[r].name) ?? 0) + 1));
console.log([...tally].map(([name, n]) => `${name} ${n}`).join(" · "));
console.log(
  `finale: ${COUNT} particles, ${scene.edges.length / 2} lines → ${target} (${(bytes.length / 1024).toFixed(0)} KB, ${(performance.now() - started).toFixed(0)} ms)`,
);
