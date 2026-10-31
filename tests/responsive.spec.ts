import { expect, test } from "@playwright/test";
import { pose } from "../src/landing/particles/timeline";

test("tablet figures follow the same stacked layout as phones", () => {
  for (const stage of [0, 1, 3, 6, 8, 11, 12, 13])
    expect(pose(stage, "tablet")).toEqual(pose(stage, "mobile"));
  expect(pose(1, "tablet").offset[1]).toBeLessThan(0);
});

test("tablet and mobile centre the reading columns and keep touch targets usable", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Viewport matrix is covered once");
  test.setTimeout(120000);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page
          .locator("main h1, main h2, main h3, main p")
          .evaluateAll((elements) =>
            elements
              .filter((el) => getComputedStyle(el).textAlign !== "center")
              .map((el) => el.textContent),
          ),
      )
      .toEqual([]);
    const columns = await page
      .locator(
        ".hero-copy, .hero-intro, .section-heading, .chapter-copy, .project-copy, .solution-copy, .profile-copy, .profile-portrait, .faq-list",
      )
      .evaluateAll((elements) =>
        elements.map((el) => {
          const box = el.getBoundingClientRect();
          return {
            name: el.className,
            centre: (box.left + box.right) / 2,
            width: box.width,
          };
        }),
      );
    for (const column of columns) {
      expect(column.centre, `${column.name} centred at ${width}`).toBeCloseTo(
        width / 2,
        0,
      );
      expect(column.width).toBeLessThanOrEqual(width - 32);
    }
    const targets = await page
      .locator(
        ".header-cta, .profile-links a, .contact-actions a, .faq-list summary",
      )
      .evaluateAll((elements) =>
        elements.map((el) => el.getBoundingClientRect().height),
      );
    targets.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(1600);
    await page.screenshot({ path: info.outputPath(`hero-${width}.png`) });
    const copy = page.locator(".solution-copy").nth(1);
    await copy.evaluate((el) =>
      scrollTo({
        top: scrollY + el.getBoundingClientRect().top - innerHeight * 0.18,
        behavior: "instant",
      }),
    );
    await expect
      .poll(() =>
        page.locator(".particle-field").getAttribute("data-section-progress"),
      )
      .toBe("6.200");
    await page.waitForTimeout(1600);
    await page.screenshot({ path: info.outputPath(`solution-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".solution-copy").first()).toHaveCSS(
    "text-align",
    "start",
  );
});

test("the primary hero action fits common phone and tablet screens", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Viewport matrix is covered once");
  await page.goto("/");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(
        async () => {
          const box = await page.locator(".hero-action .button").boundingBox();
          return !!box && box.y >= 0 && box.y + box.height <= viewport.height;
        },
        {
          message: `Hero action visible at ${viewport.width}×${viewport.height}`,
        },
      )
      .toBe(true);
  }
});
