import { bookAtom } from "./book-atom";
import { FORM, FORM_COUNT } from "./catalog";
import type { FormData } from "./compose";
import { cube } from "./cube";
import { finale } from "./finale";
import { lorenz } from "./lorenz";
import { saturn } from "./saturn";

/** Builders in atlas order (see FORM). Build-time only: run `npm run particles`. */
export const FORM_BUILDERS: ((count: number, seed: number) => FormData)[] = [
  lorenz,
  cube,
  bookAtom,
  saturn,
  finale,
];

if (FORM_BUILDERS.length !== FORM_COUNT || FORM.finale !== FORM_COUNT - 1)
  throw new Error("FORM_BUILDERS and FORM disagree");

export function createForms(count: number, log?: (line: string) => void) {
  return FORM_BUILDERS.map((build, k) => {
    const started = performance.now();
    const form = build(count, 1009 + k * 7919);
    log?.(
      `${form.name.padEnd(9)} ${(performance.now() - started).toFixed(0).padStart(6)} ms, ${(form.edges?.length ?? 0) / 2} edges${form.motion ? ", motion" : ""}`,
    );
    return form;
  });
}
