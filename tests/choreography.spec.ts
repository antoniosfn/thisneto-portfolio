import { expect, test } from "@playwright/test";
import { FORM } from "../src/landing/particles/forms/catalog";
import {
  CUBE_CROSSING,
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

test("each figure forms from a cloud while its dark section rises", () => {
  for (const layout of LAYOUTS) {
    // Half way up: still forming.
    for (const forming of [0.75, 2.75, 6.75, 8.75]) {
      expect(pose(forming, layout).explode).toBeGreaterThan(0);
      expect(pose(forming, layout).explode).toBeLessThan(1);
    }
    expect(pose(10.75, layout).scene).toBeGreaterThan(0);
    expect(pose(10.75, layout).scene).toBeLessThan(1);
    // At the anchors: complete.
    for (const dark of [1, 3, 4, 5, 7, 9]) expect(pose(dark, layout).explode).toBe(0);
    // The atlas only changes form inside the cloud.
    expect(pose(2.25, layout).explode).toBe(1);
    expect(pose(6.25, layout).explode).toBe(1);
  }
});

test("the cube zigzags opposite the copy, turning at each crossing, then bursts", () => {
  expect(solutionWeight(3)).toBe(1);
  expect(solutionWeight(5)).toBe(1);
  expect(track(3, CUBE_CROSSING)).toBe(1);
  expect(track(3.5, CUBE_CROSSING)).toBeCloseTo(0);
  // A full zigzag, opposite the copy: right, left, right.
  expect(track(4, CUBE_CROSSING)).toBe(-1);
  expect(track(5, CUBE_CROSSING)).toBe(1);
  const left = pose(3.85, "desktop").rotation[1] - pose(3.15, "desktop").rotation[1];
  const right = pose(4.85, "desktop").rotation[1] - pose(4.15, "desktop").rotation[1];
  expect(left).toBeCloseTo(-2 * Math.PI);
  expect(right).toBeCloseTo(2 * Math.PI);
  expect(pose(5, "desktop").explode).toBe(0);
  expect(pose(5.6, "desktop").explode).toBe(1);
});

test("figures are scaled to fill the stage", () => {
  // Fitted down by the renderer from well above the old base scale.
  expect(pose(3, "desktop").factor).toBeGreaterThan(9);
  expect(pose(9, "mobile").factor).toBeGreaterThan(6);
  const mobile = pose(7, "mobile");
  expect(mobile.book[3]).toBeGreaterThan(1.4);
  expect(mobile.atom[3]).toBeGreaterThan(1.2);
  expect(mobile.book[1]).toBeGreaterThan(mobile.atom[1]);
  // The atom sits lower and smaller than the book, clear of the copy.
  const desk = pose(7, "desktop");
  expect(desk.atom[3]).toBeLessThan(desk.book[3]);
  expect(desk.atom[1]).toBeLessThan(desk.book[1] - 2.5);
  expect(desk.atom[0]).toBeGreaterThan(-1);
});

test("the Lorenz holds whole right of the copy and fragments on either side", () => {
  for (const f of [0.9, 1, 1.1]) {
    expect(pose(f, "desktop").explode).toBe(0);
    expect(pose(f, "desktop").offset[0]).toBeCloseTo(1.9);
  }
  // Scrolling back up and scrolling on both break it into a cloud.
  expect(pose(0.5, "desktop").explode).toBe(1);
  expect(pose(1.5, "desktop").explode).toBe(1);
});
