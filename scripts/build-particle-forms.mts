/**
 * Builds public/particles/forms.bin from the exact meshes in
 * src/landing/particle-shapes.ts. Deterministic: the same source always
 * produces the same file. Run after changing a form: npm run particles
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeForms } from "../src/landing/particle-forms-file.ts";
import { FORM_BUILDERS, createForms } from "../src/landing/particle-shapes.ts";

const COUNT = 10000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "public/particles/forms.bin");
const started = performance.now();
const bytes = encodeForms(createForms(COUNT));
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, bytes);
console.log(
  `${FORM_BUILDERS.length} forms × ${COUNT} points → ${target} (${(bytes.length / 1024).toFixed(0)} KB, ${(performance.now() - started).toFixed(0)} ms)`,
);
