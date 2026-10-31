import { expect, test } from "@playwright/test";
import { FORM } from "../src/landing/particles/forms/catalog";
import { pose } from "../src/landing/particles/timeline";

test("landscape opens the page and the Lorenz holds before the next descent", () => {
  for (const layout of ["desktop", "tablet", "mobile"] as const) {
    expect(pose(0, layout).scene).toBe(1);
    expect(pose(0, layout).detail).toBe(1);
    expect(pose(1, layout).scene).toBe(0);
    expect(pose(13, layout).scene).toBe(0);
    expect(pose(13, layout).progress).toBe(FORM.bulb);
    for (const stage of [2.65, 3, 3.35]) {
      expect(pose(stage, layout).progress).toBe(FORM.lorenz);
      expect(pose(stage, layout).explode).toBe(0);
    }
    expect(pose(3.7, layout).progress).toBeGreaterThan(FORM.lorenz);
    expect(pose(3.7, layout).progress).toBeLessThan(FORM.truss);
    expect(pose(3.95, layout).progress).toBe(FORM.truss);
    expect(pose(3.35, layout).offset[1]).toBeLessThan(
      pose(2.65, layout).offset[1],
    );
  }
  expect(pose(3.35, "mobile").offset[0]).toBeLessThan(
    pose(2.65, "mobile").offset[0],
  );
});

test("compact stages keep complete figures below stacked copy", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "One viewport matrix covers all layouts",
  );
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-opening", "1.000");
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(height, `compact page at ${width}`).toBeLessThan(900 * 16);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    for (const stage of [3, 4]) {
      await page
        .locator(`[data-particle-stage="${stage}"]`)
        .evaluate((element) => {
          const section = element as HTMLElement;
          const content =
            innerWidth <= 1099 ? section.firstElementChild! : section;
          const box = content.getBoundingClientRect();
          const shift = new DOMMatrixReadOnly(
            getComputedStyle(content).transform,
          ).m42;
          const anchor =
            innerWidth <= 1099
              ? box.top - shift + scrollY - innerHeight * 0.18
              : box.top -
                shift +
                scrollY +
                Math.min(box.height, innerHeight) / 2 -
                innerHeight / 2;
          scrollTo({ top: anchor, behavior: "instant" });
        });
      await expect
        .poll(async () =>
          Number(await field.getAttribute("data-section-progress")),
        )
        .toBeCloseTo(stage, 2);
      await expect(field).toHaveAttribute(
        "data-progress",
        (stage - 2).toFixed(3),
      );
      if (width <= 1099) {
        expect(Number(await field.getAttribute("data-figure-y"))).toBeLessThan(
          0,
        );
        const box = await page
          .locator(`[data-particle-stage="${stage}"] .chapter-copy`)
          .boundingBox();
        expect(
          box!.y + box!.height,
          "copy ends above the lower figure area",
        ).toBeLessThan(900 * 0.44);
      }
      await page.waitForTimeout(1600);
      await page.screenshot({
        path: info.outputPath(`stage-${stage}-${width}.png`),
      });
    }
  }
  expect(errors).toEqual([]);
});
