import { expect, test } from "@playwright/test";
import { CAMERA_DISTANCE, CAMERA_FOV } from "../src/landing/particles/camera";
import { pose } from "../src/landing/particles/timeline";
import {
  changedPixels,
  settleParticles,
  settleQuality,
} from "./particle-helpers";

test("complete figures and background stay still without input", async ({
  page,
}) => {
  test.setTimeout(60000);
  // The opening landscape has flowing water; this contract covers static forms.
  await page.goto("/?f=1");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  await settleQuality(page);
  await settleParticles(page);
  const field = page.locator(".particle-field");
  const before = await field.screenshot();
  await page.waitForTimeout(1200);
  expect(
    await changedPixels(page, before, await field.screenshot()),
  ).toBeLessThan(0.0001);
});

test("electrons keep orbiting while the nucleus stays anchored", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Both layouts share the atom motion",
  );
  test.setTimeout(60000);
  await page.goto("/?f=8");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  await settleQuality(page);
  await page.addStyleTag({
    content:
      "main,.site-header,.header-backdrop,.reading-progress,.site-footer,nextjs-portal { visibility:hidden!important }",
  });
  const field = page.locator(".particle-field");
  const view = page.viewportSize()!;
  const atom = pose(8, "desktop");
  const height = 2 * CAMERA_DISTANCE * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const scale = view.height / height;
  const x = view.width / 2 + (atom.atom[0] + atom.offset[0]) * scale;
  const y = view.height / 2 - (atom.atom[1] + atom.offset[1]) * scale;
  const clip = {
    x: Math.round(x - 16),
    y: Math.round(y - 16),
    width: 32,
    height: 32,
  };
  const before = await field.screenshot();
  const core = await page.screenshot({ clip });
  await page.waitForTimeout(1200);
  expect(
    await changedPixels(page, before, await field.screenshot()),
  ).toBeGreaterThan(0.001);
  const after = await page.screenshot({ clip });
  const cores = await page.evaluate(
    async (images) => {
      return Promise.all(
        images.map(async (base64) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(
            0,
            0,
            image.width,
            image.height,
          ).data;
          let x = 0,
            y = 0,
            count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 180)
              continue;
            x += (i / 4) % image.width;
            y += Math.floor(i / 4 / image.width);
            count++;
          }
          return { x: x / count, y: y / count, count };
        }),
      );
    },
    [core.toString("base64"), after.toString("base64")],
  );
  expect(cores[0].count).toBeGreaterThan(16);
  expect(cores[1].count).toBeGreaterThan(16);
  // Moving electrons can alter the bloom; the nucleus itself must stay centred.
  expect(
    Math.hypot(cores[1].x - cores[0].x, cores[1].y - cores[0].y),
  ).toBeLessThan(0.75);
});
