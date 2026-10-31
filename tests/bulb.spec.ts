import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { decodeForms } from "../src/landing/particles/forms-file";
import { COUNT, FORM } from "../src/landing/particles/forms/catalog";
import { settleParticles } from "./particle-helpers";

test("the FAQ atlas contains a complete static bulb with a screw base and filament", ({}, info) => {
  test.skip(
    info.project.name === "mobile",
    "The atlas is shared between layouts",
  );
  const file = readFileSync(
    new URL("../public/particles/forms.bin", import.meta.url),
  );
  const forms = decodeForms(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  const bulb = forms[FORM.bulb];
  expect(bulb.name).toBe("bulb");
  expect(bulb.motion).toBeNull();
  expect(bulb.points.length).toBe(COUNT * 3);
  let base = 0,
    filament = 0,
    top = -Infinity,
    bottom = Infinity;
  for (let i = 0; i < COUNT; i++) {
    const x = bulb.points[i * 3],
      y = bulb.points[i * 3 + 1];
    top = Math.max(top, y);
    bottom = Math.min(bottom, y);
    if (y < -0.48) base++;
    if (Math.abs(x) < 0.23 && y > 0.1 && y < 0.24) filament++;
  }
  expect(base).toBeGreaterThan(COUNT * 0.16);
  expect(filament).toBeGreaterThan(COUNT * 0.12);
  expect(top).toBeGreaterThan(0.7);
  expect(top).toBeLessThan(0.75);
  expect(bottom).toBeGreaterThan(-0.85);
  expect(bottom).toBeLessThan(-0.8);
  expect(bulb.edges!.length).toBeGreaterThan(12000);
});

test("the light bulb replaces the orbital symbol in the FAQ", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>(
      "#perguntas .section-heading",
    )!;
    const box = heading.getBoundingClientRect();
    const shift = new DOMMatrixReadOnly(getComputedStyle(heading).transform)
      .m42;
    window.scrollTo({
      top:
        box.top -
        shift +
        scrollY +
        (innerWidth <= 1099
          ? -innerHeight * 0.18
          : Math.min(box.height, innerHeight) / 2 - innerHeight / 2),
      behavior: "instant",
    });
  });
  await expect
    .poll(
      async () =>
        Number(
          await page.locator(".particle-field").getAttribute("data-progress"),
        ),
      { timeout: 15000 },
    )
    .toBeCloseTo(FORM.bulb, 2);
  await settleParticles(page);
  await page.screenshot({ path: info.outputPath("faq-bulb.png") });
  expect(errors).toEqual([]);
});
