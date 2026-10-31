import { expect, test } from "@playwright/test";
import { FORM } from "../src/landing/particles/forms/catalog";
import {
  SOLUTION_SIDES,
  pose,
  solutionWeight,
  track,
} from "../src/landing/particles/timeline";

const LAYOUTS = ["desktop", "tablet", "mobile"] as const;

test("every dark section opens on a complete figure", () => {
  for (const layout of LAYOUTS) {
    expect(pose(1, layout).progress).toBe(FORM.lorenz);
    for (const stage of [3, 4, 5]) expect(pose(stage, layout).progress).toBe(FORM.cube);
    expect(pose(7, layout).progress).toBe(FORM.bookAtom);
    expect(pose(9, layout).progress).toBe(FORM.saturn);
    expect(pose(11, layout).scene).toBe(1);
  }
});

test("morphs happen only inside the light sections", () => {
  // Light sections sit at even stages 2, 6, 8 and 10; each morph stays
  // between that stage and the next dark one.
  for (const layout of LAYOUTS) {
    expect(pose(2.45, layout).progress).toBeGreaterThan(FORM.lorenz);
    expect(pose(2.45, layout).progress).toBeLessThan(FORM.cube);
    expect(pose(6.45, layout).progress).toBeGreaterThan(FORM.cube);
    expect(pose(8.45, layout).progress).toBeGreaterThan(FORM.bookAtom);
    expect(pose(10.45, layout).scene).toBeGreaterThan(0);
    expect(pose(10.45, layout).scene).toBeLessThan(1);
    for (const dark of [1, 3, 4, 5, 7, 9]) {
      expect(pose(dark, layout).scene).toBe(0);
      expect(pose(dark, layout).explode).toBe(0);
    }
  }
});

test("the cube alternates sides and turns a full 360° through the solutions", () => {
  expect(solutionWeight(3)).toBe(1);
  expect(solutionWeight(5)).toBe(1);
  expect(track(3, SOLUTION_SIDES)).toBe(1);
  expect(track(4, SOLUTION_SIDES)).toBe(-1);
  expect(track(5, SOLUTION_SIDES)).toBe(1);
  const turn = pose(5.5, "desktop").rotation[1] - pose(3, "desktop").rotation[1];
  expect(turn).toBeCloseTo(2 * Math.PI);
});

test("book and atom fill stacked screens; Saturn grows on desktop", () => {
  const mobile = pose(7, "mobile");
  expect(mobile.book[3]).toBeGreaterThan(1.2);
  expect(mobile.atom[3]).toBeGreaterThan(1.2);
  // Stacked one over the other, centred.
  expect(mobile.book[0]).toBe(0);
  expect(mobile.book[1]).toBeGreaterThan(mobile.atom[1]);
  expect(pose(9, "desktop").factor).toBeGreaterThan(pose(7, "desktop").factor * 1.3);
  expect(pose(9, "desktop").offset[0]).toBeLessThan(0);
});
