import { expect, test } from "@playwright/test";
import {
  formatLoaderPercent,
  nextDownloadProgress,
} from "../src/landing/loading";

const PERCENT = /^(?:[1-9]|[1-9]\d|100)%$/;

test("loader percent is an integer from 1% to 100% and never steps back", () => {
  expect(formatLoaderPercent(0)).toBe("1%");
  expect(formatLoaderPercent(0.14)).toBe("14%");
  expect(formatLoaderPercent(0.144)).toBe("14%");
  expect(formatLoaderPercent(0.995)).toBe("100%");
  expect(formatLoaderPercent(1)).toBe("100%");
  expect(formatLoaderPercent(Number.NaN)).toBe("1%");
  // The old label was padStart(3, "0"): 14% was painted as 014.
  // One 256 KiB buffer of the 1,625,571-byte forms file is that 14%.
  const formsBytes = 1_625_571;
  const firstBuffer = 256 * 1024;
  const stuck = nextDownloadProgress(0, firstBuffer / formsBytes);
  expect(formatLoaderPercent(stuck)).toBe("14%");
  expect(String(Math.round(stuck * 100)).padStart(3, "0")).toBe("014");
  expect(nextDownloadProgress(stuck, firstBuffer / formsBytes / 2)).toBe(stuck);
  expect(nextDownloadProgress(stuck, Number.NaN)).toBe(stuck);
  expect(nextDownloadProgress(stuck, 1)).toBeCloseTo(0.85, 5);
});

test("the book loader names itself and leaves even if forms.bin never arrives", async ({
  page,
}) => {
  test.setTimeout(30_000);
  await page.route("**/particles/forms.bin", () => {
    // Never respond. WebKit can do this after the first buffer; the veil
    // still has to lift and the page has to be usable.
  });
  await page.goto("/", { waitUntil: "commit" });
  const loader = page.locator(".site-loader");
  await expect(loader).toBeVisible();
  await expect(loader).toHaveAttribute("role", "progressbar");
  await expect(loader).toHaveAttribute("aria-valuemin", "1");
  await expect(loader).toHaveAttribute("aria-valuemax", "100");
  await expect(page.locator("#loader-status")).toHaveText("Carregando experiência…");
  await expect(loader.locator(".site-loader-count")).toHaveText(PERCENT);
  await expect(loader.locator(".site-loader-stall")).toBeVisible({ timeout: 8_000 });
  await expect(loader).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator("html")).not.toHaveClass(/is-loading/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Menos tarefas Mais tempo para crescer" }),
  ).toBeVisible();
});

test("reduced motion keeps the loader label and still reveals the page", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "commit" });
  const loader = page.locator(".site-loader");
  await page.waitForFunction(() => {
    const el = document.querySelector(".site-loader");
    if (!el || el.getAttribute("data-motion") !== "reduced") return false;
    const status = document.querySelector("#loader-status")?.textContent;
    const count = el.querySelector(".site-loader-count")?.textContent ?? "";
    return (
      status === "Carregando experiência…" &&
      /^(?:[1-9]|[1-9]\d|100)%$/.test(count)
    );
  });
  await expect(loader).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator("html")).not.toHaveClass(/is-loading/);
});
