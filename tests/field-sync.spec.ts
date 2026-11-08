import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { advanceOpening } from "../src/landing/particles/opening";
import { FORM, MOTION } from "../src/landing/particles/forms/catalog";
import { decodeForms } from "../src/landing/particles/forms-file";
import { pose } from "../src/landing/particles/timeline";

test("opening flag follows wall time instead of the simulation cap", () => {
  test.skip(test.info().project.name === "mobile", "Pure function, one project");
  // The old bug: a 1s GPU frame was capped at 0.1s, so twelve hitches were
  // required. One capped hitch must now cover most of the 1.2s opening.
  const hitch = advanceOpening(0, 2);
  expect(hitch.entered).toBe(false);
  expect(hitch.show).toBeCloseTo(1 / 1.2, 5);
  expect(advanceOpening(hitch.show, 0.3).entered).toBe(true);
  let show = 0;
  for (let i = 0; i < 11; i++) show = advanceOpening(show, 0.1).show;
  expect(show).toBeLessThan(1);
  expect(advanceOpening(show, 0.1).entered).toBe(true);
});

test("nucleus is fixed in the atlas and electrons carry the clock", () => {
  test.skip(test.info().project.name === "mobile", "The atlas is shared");
  const file = readFileSync(
    new URL("../public/particles/forms.bin", import.meta.url),
  );
  const forms = decodeForms(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  const types = (name: number) => {
    const motion = forms[name].motion;
    expect(motion, forms[name].name).toBeTruthy();
    const found = new Set<number>();
    for (let i = 0; i < motion!.length; i += 4) found.add(motion![i]);
    return found;
  };
  const atom = types(FORM.bookAtom);
  expect(atom.has(MOTION.NUCLEUS)).toBe(true);
  expect(atom.has(MOTION.ELECTRON)).toBe(true);
  expect(types(FORM.saturn).has(MOTION.SPIN)).toBe(true);
  const shader = readFileSync(
    new URL("../src/landing/particles/shaders/motion.ts", import.meta.url),
    "utf8",
  );
  expect(shader).toMatch(
    /if\(type<M_NUCLEUS\+\.5\) return atomPlace\(p\);/,
  );
  expect(shader).toMatch(
    /if\(type<M_ELECTRON\+\.5\) return atomPlace\(axisAngle\(m\.yzw,u_clock\*\.85\)\*p\);/,
  );
  const renderer = readFileSync(
    new URL("../src/landing/particles/renderer.ts", import.meta.url),
    "utf8",
  );
  expect(renderer).toMatch(/setClearColor\(0x000000,\s*1\)/);
});

for (const stage of [1, 2, 7, 9]) {
  test(`pinned f=${stage} matches the pose`, async ({ page }, info) => {
    const layout = info.project.name === "mobile" ? "mobile" : "desktop";
    const field = page.locator(".particle-field");
    await page.goto(`/?f=${stage}`);
    await expect(page.locator(".site-loader")).toHaveCount(0, {
      timeout: 20_000,
    });
    await expect(field).toHaveAttribute("data-entered", "true", {
      timeout: 20_000,
    });
    const expected = pose(stage, layout);
    await expect
      .poll(async () =>
        Number(await field.getAttribute("data-section-progress")),
      )
      .toBeCloseTo(stage, 1);
    await expect
      .poll(async () => Number(await field.getAttribute("data-progress")))
      .toBeCloseTo(expected.progress, 1);
    await expect
      .poll(async () => Number(await field.getAttribute("data-explode")))
      .toBeCloseTo(expected.explode, 1);
  });
}

test("hover gain follows whether the figure is whole", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Touch has no hover.");
  const field = page.locator(".particle-field");
  await page.goto("/?f=1");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20_000 });
  await expect(field).toHaveAttribute("data-entered", "true", { timeout: 20_000 });
  await page.mouse.move(180, 180);
  await page.mouse.move(420, 260, { steps: 6 });
  await expect
    .poll(async () => Number(await field.getAttribute("data-hover-gain")))
    .toBeGreaterThan(0.5);
  await page.goto("/?f=2");
  await expect
    .poll(async () => Number(await field.getAttribute("data-explode")))
    .toBeGreaterThan(0.9);
  await page.mouse.move(180, 180);
  await page.mouse.move(640, 300, { steps: 6 });
  await expect
    .poll(async () => Number(await field.getAttribute("data-hover-gain")))
    .toBeLessThan(0.2);
});
