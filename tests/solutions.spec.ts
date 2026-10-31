import { expect, test } from "@playwright/test";
import { FORM } from "../src/landing/particles/forms/catalog";
import {
  pose,
  sectionProgress,
  STAGE_PROGRESS,
} from "../src/landing/particles/timeline";
import { settleParticles } from "./particle-helpers";

test("service anchors keep the cube complete before the next section", () => {
  const stops = STAGE_PROGRESS.map((_, index) => index * 1000);
  STAGE_PROGRESS.forEach((stage, index) => {
    expect(sectionProgress(stops[index], stops)).toBeCloseTo(stage, 8);
  });
  for (const stage of [6, 6.2, 6.4]) {
    expect(pose(stage, "desktop").progress).toBe(FORM.cube);
    expect(pose(stage, "mobile").explode).toBe(0);
  }
  expect(pose(7, "desktop").progress).toBe(FORM.saturn);
});

test("static service copy alternates around the complete figure", async ({
  page,
}, testInfo) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-entered", "true", {
    timeout: 15000,
  });
  const solutions = page.locator(".solution");
  for (let index = 0; index < 3; index++) {
    const copy = solutions.nth(index).locator(".solution-copy");
    await copy.evaluate((element) => {
      const box = element.getBoundingClientRect();
      scrollTo({
        top:
          scrollY +
          box.top +
          (innerWidth < 1100
            ? -innerHeight * 0.18
            : box.height / 2 - innerHeight / 2),
        behavior: "instant",
      });
    });
    await expect
      .poll(async () =>
        Number(await field.getAttribute("data-section-progress")),
      )
      .toBeCloseTo(6 + index * 0.2, 2);
    await expect(field).toHaveAttribute("data-progress", "4.000");
    await settleParticles(page);
    await expect(copy.locator("h2")).toBeVisible();
    const bounds = await copy.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: innerWidth,
        height: innerHeight,
        font: parseFloat(
          getComputedStyle(element.querySelector("h2")!).fontSize,
        ),
      };
    });
    expect(bounds.font).toBeGreaterThanOrEqual(42);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.width);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    if (bounds.width >= 1100) {
      if (index % 2) expect(bounds.left).toBeGreaterThan(bounds.width / 2);
      else expect(bounds.right).toBeLessThan(bounds.width / 2);
    } else {
      expect(bounds.top).toBeGreaterThanOrEqual(bounds.height * 0.17);
      expect(bounds.bottom).toBeLessThan(bounds.height * 0.52);
      expect((bounds.left + bounds.right) / 2).toBeCloseTo(bounds.width / 2, 0);
      await expect(copy).toHaveCSS("text-align", "center");
    }
    await page.screenshot({
      path: testInfo.outputPath(`solution-${index + 1}.png`),
    });
  }
  expect(errors).toEqual([]);
});
