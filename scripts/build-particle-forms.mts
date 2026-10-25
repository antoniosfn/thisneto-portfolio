/**
 * Builds public/particles/forms.bin from the exact meshes in
 * src/landing/particles/forms. Deterministic: the same source always
 * produces the same file. Run after changing a form: npm run particles
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COUNT } from "../src/landing/particles/forms/catalog.ts";
import { createForms } from "../src/landing/particles/forms/index.ts";
import { encodeForms } from "../src/landing/particles/forms-file.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "public/particles/forms.bin");
const started = performance.now();
const forms = createForms(COUNT, console.log);
const bytes = encodeForms(forms);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, bytes);
console.log(
  `${forms.length} forms × ${COUNT} points → ${target} (${(bytes.length / 1024).toFixed(0)} KB, ${(performance.now() - started).toFixed(0)} ms)`,
);
