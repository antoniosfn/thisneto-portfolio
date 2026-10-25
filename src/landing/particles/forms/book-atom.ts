import { atomParts } from "./atom";
import { bookParts } from "./book";
import { isBook } from "./catalog";
import { emptyForm, fill } from "./compose";

/**
 * Knowledge, in two halves: the warm particles of the stream land as the book,
 * the cool ones as the atom. Each half is built at its own origin; the shader
 * places them (u_book, u_atom), so every layout can move them apart.
 */
export function bookAtom(count: number, seed: number) {
  const form = emptyForm("bookAtom", count);
  const warm: number[] = [],
    cool: number[] = [];
  for (let i = 0; i < count; i++) (isBook(i) ? warm : cool).push(i);
  fill(form, warm, bookParts(warm.length, seed), seed);
  fill(form, cool, atomParts(cool.length, seed + 1), seed + 1);
  return form;
}
