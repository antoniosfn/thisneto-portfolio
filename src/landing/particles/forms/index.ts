import { bookAtom } from "./book-atom";
import { FORM, FORM_COUNT } from "./catalog";
import type { FormData } from "./compose";
import { cube } from "./cube";
import { knot } from "./knot";
import { lorenz } from "./lorenz";
import { neural } from "./neural";
import { stream } from "./stream";
import { tree } from "./tree";
import { truss } from "./truss";
import { woman } from "./woman";

/** Builders in atlas order (see FORM). Build-time only: run `npm run particles`. */
export const FORM_BUILDERS: ((count: number, seed: number) => FormData)[] = [
  knot,
  lorenz,
  truss,
  neural,
  cube,
  stream,
  bookAtom,
  tree,
  woman,
];

if (FORM_BUILDERS.length !== FORM_COUNT || FORM.woman !== FORM_COUNT - 1)
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
