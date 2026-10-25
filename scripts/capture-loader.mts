/**
 * Captures the loading screen on a throttled connection: mid-way, at the end
 * and after it lifts, desktop and phone. Usage:
 *   node scripts/capture-loader.mts <out-dir> [base-url]
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = resolve(process.argv[2] ?? "docs/reference/loader");
const base = process.argv[3] ?? "http://localhost:3100";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, scale: 1 },
  { name: "mobile", width: 390, height: 844, scale: 2 },
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.scale,
  });
  const page = await context.newPage();
  // ~6 Mbit/s: slow enough to see the mark assemble.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 40,
    downloadThroughput: 750_000,
    uploadThroughput: 750_000,
  });
  await page.goto(base, { waitUntil: "commit" });
  const counts: string[] = [];
  for (const [label, wait] of [
    ["early", 1500],
    ["mid", 2000],
    ["late", 2500],
  ] as const) {
    await page.waitForTimeout(wait);
    counts.push(`${label}:${await page.locator(".site-loader-count").textContent().catch(() => "gone")}`);
    await page.screenshot({ path: `${out}/${viewport.name}-${label}.png` });
  }
  await page.locator(".site-loader").waitFor({ state: "detached", timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${viewport.name}-after.png` });
  console.log(viewport.name, counts.join(" "));
  await context.close();
}
await browser.close();
console.log(`Captures written to ${out}`);
