/**
 * Captures the closing-scene preview (vite dev server on :5173) at several
 * formation values, desktop and phone. Usage:
 *   node scripts/capture-finale.mts <out-dir> [base-url]
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = resolve(process.argv[2] ?? "docs/reference/finale/captures");
const base = process.argv[3] ?? "http://localhost:5173";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, scale: 1 },
  { name: "mobile", width: 390, height: 844, scale: 2 },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
for (const viewport of VIEWPORTS) {
  const page = await (
    await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.scale,
    })
  ).newPage();
  await page.goto(`${base}/finale.html`);
  await page.addStyleTag({ content: ".controls { display: none !important; }" });
  // Formation runs for 7 s from load: catch it mid-way, then complete.
  for (const [label, wait] of [
    ["forming", 3200],
    ["formed", 7000],
  ] as const) {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}/${viewport.name}-${label}.png` });
  }
}
await browser.close();
console.log(`Captures written to ${out}`);
