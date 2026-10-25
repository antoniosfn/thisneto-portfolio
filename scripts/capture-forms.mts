/**
 * Captures the field alone, pinned at given section progress values (`?f=`),
 * for comparison with the reference images. Usage:
 *   node scripts/capture-forms.mts <out-dir> <f>[,<f>...] [base-url]
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = resolve(process.argv[2] ?? "docs/reference/forms");
const stages = (process.argv[3] ?? "8.3,10.45,11.5,13.8").split(",");
const base = process.argv[4] ?? "http://localhost:3100";
const SETTLE_MS = 18000; // the field flies in from far away on load

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();
for (const f of stages) {
  await page.goto(`${base}/?f=${f}`);
  await page.addStyleTag({
    content:
      "main, .site-header, .header-backdrop, .site-footer, .reading-progress, .skip-link, nextjs-portal { opacity: 0 !important; }",
  });
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: `${out}/f${f}.png` });
}
await browser.close();
console.log(`Captures written to ${out}`);
