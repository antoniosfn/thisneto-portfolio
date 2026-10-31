import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { decodeForms } from "../src/landing/particles/forms-file";
import { COUNT, FORM, isBook } from "../src/landing/particles/forms/catalog";
import { pose } from "../src/landing/particles/timeline";
import {
  changedPixels,
  settleParticles,
  settleQuality,
} from "./particle-helpers";

test("Saturn keeps the rings and globe assigned to the next two forms", ({}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "The baked atlas is shared by layouts",
  );
  const file = readFileSync(
    new URL("../public/particles/forms.bin", import.meta.url),
  );
  const forms = decodeForms(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  const saturn = forms[FORM.saturn];
  expect(saturn.name).toBe("saturn");
  expect(saturn.points.length).toBe(COUNT * 3);
  expect(saturn.edges!.length).toBeGreaterThan(10000);
  let ringMin = Infinity,
    ringMax = 0,
    globeMax = 0;
  for (let i = 0; i < COUNT; i++) {
    const radius = Math.hypot(...saturn.points.subarray(i * 3, i * 3 + 3));
    if (isBook(i)) {
      ringMin = Math.min(ringMin, radius);
      ringMax = Math.max(ringMax, radius);
    } else globeMax = Math.max(globeMax, radius);
  }
  expect(ringMin).toBeGreaterThan(0.55);
  expect(ringMax).toBeLessThan(1.02);
  expect(globeMax).toBeLessThan(0.45);
  expect(
    saturn.ranks.every(
      (rank) => Number.isFinite(rank) && rank >= 0 && rank <= 1,
    ),
  ).toBe(true);
  expect(saturn.edges!.every((index) => index >= 0 && index < COUNT)).toBe(
    true,
  );
  expect(pose(7, "desktop").progress).toBe(FORM.saturn);
  expect(pose(7.15, "desktop").progress).toBe(FORM.saturn);
  expect(pose(8, "desktop").progress).toBe(FORM.bookAtom);
});

test("Saturn separates into the atom and book and reforms on reverse scroll", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const request = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request(() => callback(0));
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-entered", "true", {
    timeout: 15000,
  });
  const jump = async (stage: number, form: number) => {
    await page.evaluate((index) => {
      const section = document.querySelector<HTMLElement>(
        `[data-particle-stage="${index}"]`,
      )!;
      const align =
        Number(section.dataset.particleAlign) || (innerWidth <= 1099 ? 0.18 : 0);
      const content =
        (align
          ? section.firstElementChild
          : section.querySelector(".section-split, .section-heading")) ??
        section;
      const box = content.getBoundingClientRect();
      const shift = new DOMMatrixReadOnly(getComputedStyle(content).transform)
        .m42;
      window.scrollTo({
        top:
          box.top -
          shift +
          scrollY +
          (align
            ? -innerHeight * align
            : Math.min(box.height, innerHeight) / 2 - innerHeight / 2),
        behavior: "instant",
      });
    }, stage);
    await expect
      .poll(async () => Number(await field.getAttribute("data-progress")), {
        timeout: 12000,
      })
      .toBeCloseTo(form, 2);
    await settleParticles(page);
  };
  await jump(7, FORM.saturn);
  await settleQuality(page);
  await page.screenshot({ path: testInfo.outputPath("saturn.png") });
  const saturn = await field.screenshot();
  const ratio = await field.getAttribute("data-pixel-ratio");
  await jump(8, FORM.bookAtom);
  await page.screenshot({ path: testInfo.outputPath("atom-and-book.png") });
  const separated = await field.screenshot();
  expect(await changedPixels(page, saturn, separated)).toBeGreaterThan(0.01);
  await jump(7, FORM.saturn);
  const returned = await field.screenshot();
  if (ratio === (await field.getAttribute("data-pixel-ratio")))
    expect(await changedPixels(page, saturn, returned)).toBeLessThan(0.003);
  expect(errors).toEqual([]);
});
