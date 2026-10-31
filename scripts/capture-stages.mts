/**
 * Captures every particle stage with the pointer in several positions, for
 * side-by-side reviews. Usage:
 *   node scripts/capture-stages.mts <out-dir> [base-url] [stage,stage,...]
 * Needs a running dev server (default http://localhost:3100) and Chrome.
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";

const out = resolve(process.argv[2] ?? "docs/reference/capture");
const base = process.argv[3] ?? "http://localhost:3100";
const only = process.argv[4]?.split(",").map(Number);
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false },
  mobile: { width: 390, height: 844, mobile: true },
} as const;
// Pointer positions as viewport fractions; "off" leaves the page.
const POINTERS = {
  off: undefined,
  center: [0.5, 0.5],
  left: [0.3, 0.55],
  right: [0.72, 0.5],
} as const;

async function stageValues(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-particle-stage]")].map(
      (element) => Number(element.dataset.particleStage),
    ),
  );
}

/** Scroll until the field reports section progress `f` (within 0.02). */
async function scrollToStage(page: Page, f: number) {
  const max = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  let low = 0,
    high = max;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    await page.evaluate((y) => window.scrollTo(0, y), mid);
    await page.waitForTimeout(220);
    const value = Number(
      await page
        .locator(".particle-field")
        .getAttribute("data-section-progress"),
    );
    if (Math.abs(value - f) < 0.02) break;
    if (value < f) low = mid;
    else high = mid;
  }
}

async function capture(name: keyof typeof VIEWPORTS) {
  const viewport = VIEWPORTS[name];
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    hasTouch: viewport.mobile,
    isMobile: viewport.mobile,
  });
  const page = await context.newPage();
  await page.goto(base);
  await page
    .locator('.particle-field[data-entered="true"]')
    .waitFor({ timeout: 30000 });
  const stages = only ?? (await stageValues(page));
  for (const f of stages) {
    await scrollToStage(page, f);
    for (const [label, at] of Object.entries(POINTERS)) {
      if (viewport.mobile && at) continue;
      if (at)
        await page.mouse.move(viewport.width * at[0], viewport.height * at[1]);
      else
        await page.evaluate(() =>
          document.documentElement.dispatchEvent(
            new PointerEvent("pointerleave"),
          ),
        );
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${out}/${name}-f${f}-${label}.png` });
    }
  }
  await browser.close();
}

mkdirSync(out, { recursive: true });
for (const name of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[])
  await capture(name);
console.log(`Captures written to ${out}`);
