import { readFileSync } from "node:fs";
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { expect, test } from "@playwright/test";
import { CAMERA_DISTANCE, CAMERA_FOV } from "../src/landing/particles/camera";
import { decodeForms } from "../src/landing/particles/forms-file";
import { BOOK, FORM, MOTION } from "../src/landing/particles/forms/catalog";
import { BASE_FACTOR, pose } from "../src/landing/particles/timeline";

test("the landscape takes the tree's place and hides the atlas passing it", () => {
  for (const layout of ["desktop", "tablet", "mobile"] as const) {
    expect(pose(7.575, layout).progress).toBeCloseTo(FORM.saturn + 0.5);
    expect(pose(8, layout).progress).toBe(FORM.bookAtom);
    expect(pose(10.85, layout).progress).toBe(FORM.bookAtom);
    expect(pose(10.3, layout).scene).toBeCloseTo(0.5);
    // The atlas crosses the tree only while the landscape covers the field.
    for (const stage of [10.85, 10.92, 11, 11.1]) {
      expect(pose(stage, layout).scene).toBe(1);
    }
    expect(pose(11.1, layout).progress).toBe(FORM.bulb);
    expect(pose(11.55, layout).scene).toBeCloseTo(0.5);
    expect(pose(12, layout).scene).toBe(0);
    expect(pose(12, layout).progress).toBe(FORM.bulb);
  }
  expect(pose(11, "desktop").factor).toBeCloseTo(BASE_FACTOR.desktop * 1.1);
  expect(pose(11, "mobile").factor).toBeCloseTo(BASE_FACTOR.mobile * 0.88);
  expect(pose(11, "desktop").offset[1]).toBeLessThan(0);
  for (const layout of ["desktop", "tablet", "mobile"] as const) {
    const frame = pose(8, layout);
    const oldBookCentre = layout !== "desktop" ? 5.3 : 1.05;
    expect(frame.offset[1] + frame.book[1]).toBeLessThan(oldBookCentre);
  }
});

test("the open book and turning pages stay below the header", () => {
  const file = readFileSync(
    new URL("../public/particles/forms.bin", import.meta.url),
  );
  const forms = decodeForms(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  const book = forms[FORM.bookAtom];
  for (const width of [320, 390, 768, 980, 1440, 1600, 1920]) {
    const layout = width < 760 ? "mobile" : width < 1100 ? "tablet" : "desktop";
    for (const height of [664, 900]) {
      const camera = new PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 30);
      camera.position.z = CAMERA_DISTANCE;
      camera.updateMatrixWorld();
      for (const stage of [8, 8.5, 9]) {
        const frame = pose(stage, layout);
        const centre = new Vector3(...frame.book.slice(0, 3));
        const offset = new Vector3(...frame.offset);
        const facing = new Quaternion().setFromUnitVectors(
          new Vector3(0, 0, 1),
          camera.position.clone().sub(centre).sub(offset).normalize(),
        );
        let top = height;
        for (let i = 0; i < book.points.length / 3; i++) {
          const type = book.motion![i * 4];
          if (type !== MOTION.BOOK && type !== MOTION.PAGE) continue;
          const point = new Vector3().fromArray(book.points, i * 3);
          if (type === MOTION.PAGE) {
            const t = Math.min(
              1,
              Math.max(0, frame.page - book.motion![i * 4 + 1]),
            );
            const smooth = t * t * (3 - 2 * t);
            const u = Math.min(1, Math.abs(point.x) / BOOK.width);
            point.applyAxisAngle(
              new Vector3(0, 0, 1),
              (Math.PI - 2 * BOOK.open) *
                smooth *
                (1 - 0.35 * Math.sin(Math.PI * smooth) * u),
            );
          }
          point
            .applyEuler(new Euler(...BOOK.tilt))
            .multiplyScalar(frame.book[3] * frame.factor)
            .applyQuaternion(facing)
            .add(centre)
            .add(offset)
            .project(camera);
          top = Math.min(top, ((1 - point.y) * height) / 2);
        }
        expect(
          top,
          `book clears header at ${width}×${height}, stage ${stage}`,
        ).toBeGreaterThan(width <= 680 ? 84 : 100);
      }
    }
  }
});
