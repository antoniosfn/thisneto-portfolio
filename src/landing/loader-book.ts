import { Euler, Vector3 } from "three";
import { BOOK } from "./particles/forms/catalog";

type Point = [number, number];
export type BookStroke = { points: Point[]; color: string; weight: number };

/** The field's open book, projected for a lightweight loading illustration. */
export function bookStrokes(): BookStroke[] {
  const tilt = new Euler(...BOOK.tilt);
  const project = (side: number, leaf: number, u: number, v: number): Point => {
    // Same curved pages, opening and proportions as particles/forms/book.ts.
    const arch =
      0.07 *
        Math.sqrt(Math.sin((Math.min(u * 1.9, 1) * Math.PI) / 2)) *
        (0.45 + (0.55 * leaf) / 9) -
      0.025 * u * u;
    const x = BOOK.width * u;
    const y = arch + leaf * 0.0095 * (0.2 + u);
    const c = Math.cos(BOOK.open),
      s = Math.sin(BOOK.open);
    const p = new Vector3(
      side * (x * c - y * s),
      x * s + y * c,
      (v - 0.5) * BOOK.depth,
    ).applyEuler(tilt);
    const perspective = 2.8 / (2.8 - p.z);
    return [12 + p.x * 22 * perspective, 14 - p.y * 22 * perspective];
  };
  const strokes: BookStroke[] = [];
  const add = (points: Point[], color: string, weight = 1) => {
    strokes.push({ points, color, weight });
  };
  const sample = (fn: (t: number) => Point) =>
    Array.from({ length: 25 }, (_, k) => fn(k / 24));
  for (const side of [-1, 1]) {
    for (const leaf of [-1.4, 1, 3, 5, 8]) {
      const color = leaf < 0 ? "#ec7548" : leaf === 8 ? "#ffe8ba" : "#ffb829";
      add(
        sample((u) => project(side, leaf, u, 0)),
        color,
        1.5,
      );
      add(
        sample((u) => project(side, leaf, u, 1)),
        color,
        1.5,
      );
      add(
        sample((v) => project(side, leaf, 1, v)),
        color,
        1.2,
      );
    }
    for (let line = 0; line < 9; line++) {
      const end = line % 4 === 3 ? 0.55 : 0.88;
      add(
        sample((t) =>
          project(side, 8.35, 0.13 + (end - 0.13) * t, 0.14 + line * 0.085),
        ),
        "#fff3d9",
        0.8,
      );
    }
  }
  add(
    sample((v) => project(1, -1.4, 0, v)),
    "#ffb829",
    2,
  );
  return strokes;
}
