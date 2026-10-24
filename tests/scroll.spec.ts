import { expect, test } from "@playwright/test";
import { changedPixels, settleParticles } from "./particle-helpers";

test("full explosion disables hover in the rendered field", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  test.skip(testInfo.project.name === "mobile", "Touch has no hover.");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-entered", "true", {
    timeout: 15000,
  });
  // Camera and backdrop parallax still follow the pointer, as on Dala, so the
  // check reads the shader's hover multiplier abs(u_explode − 1) directly.
  await page.mouse.move(800, 400);
  await page.mouse.move(1000, 450, { steps: 6 });
  await expect(field).toHaveAttribute("data-hover-gain", "1.000");
  await page.evaluate(() => {
    const line = document.querySelector<HTMLElement>(
      "[data-particle-stage='2']",
    )!;
    const box = line.getBoundingClientRect();
    // Same layout position the app measures, without the reveal offset.
    const shift = new DOMMatrixReadOnly(getComputedStyle(line).transform).m42;
    window.scrollTo({
      top:
        box.top -
        shift +
        scrollY +
        Math.min(box.height, innerHeight) / 2 -
        innerHeight / 2 +
        1,
      behavior: "instant",
    });
  });
  await expect
    .poll(async () => Number(await field.getAttribute("data-explode")), {
      timeout: 10000,
    })
    .toBeGreaterThan(0.999);
  await page.mouse.move(400, 300);
  await page.mouse.move(1000, 600, { steps: 12 });
  await expect(field).toHaveAttribute("data-hover-gain", "0.000");
});

test("spring retains inertia after scroll stops and then settles", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const request = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request(() => callback(0));
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content:
      "html { scroll-behavior:auto!important } main,.site-header, .header-backdrop,.site-footer,.reading-progress,nextjs-portal { opacity:0!important }",
  });
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>(
      "#manifesto .section-split",
    )!;
    const box = section.getBoundingClientRect();
    // Same layout position the app measures, without the reveal offset.
    const shift = new DOMMatrixReadOnly(getComputedStyle(section).transform)
      .m42;
    window.scrollTo({
      top:
        box.top -
        shift +
        scrollY +
        Math.min(box.height, innerHeight) / 2 -
        innerHeight / 2 +
        1,
      behavior: "instant",
    });
  });
  const field = page.locator(".particle-field");
  await expect
    .poll(async () => Number(await field.getAttribute("data-section-progress")))
    .toBeGreaterThan(0.99);
  const early = await field.screenshot();
  await page.waitForTimeout(2200);
  const settled = await field.screenshot();
  expect(await changedPixels(page, early, settled)).toBeGreaterThan(0.0005);
  // Then the spring comes to rest: consecutive frames stop changing.
  await settleParticles(page);
});

test("pointer deforms a visible 3D field and releases it back to its pose", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  test.skip(
    testInfo.project.name === "mobile",
    "Touch scroll does not enable hover forces.",
  );
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request(() => callback(0));
  });
  await page.goto("/");
  await page.addStyleTag({
    content:
      "main, .site-header, .header-backdrop, .site-footer, .reading-progress, .skip-link,  nextjs-portal { opacity: 0 !important; }",
  });
  const field = page.locator(".particle-field");
  await settleParticles(page);
  const before = await field.screenshot();
  await field.evaluate((element) => {
    (element as HTMLElement).style.visibility = "hidden";
  });
  const blank = await page.screenshot();
  await field.evaluate((element) => {
    (element as HTMLElement).style.visibility = "visible";
  });
  expect(
    before.equals(blank),
    "The field must contain rendered particles, not an empty canvas.",
  ).toBe(false);
  const viewport = page.viewportSize()!;
  await page.mouse.move(viewport.width * 0.73, viewport.height * 0.47);
  await page.waitForTimeout(700);
  const hover = await field.screenshot();
  expect(
    hover.equals(before),
    "Hover must affect particles with their ambient clock frozen.",
  ).toBe(false);
  await page.evaluate(() =>
    document.documentElement.dispatchEvent(new PointerEvent("pointerleave")),
  );
  await page.waitForTimeout(2200);
  expect(
    await changedPixels(page, await field.screenshot(), before),
    "The original pose must return after pointer leave.",
  ).toBeLessThan(0.002);
  await testInfo.attach("pointer-response", {
    body: hover,
    contentType: "image/png",
  });
});

test("pointer speed drives the hover radius term", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  test.skip(testInfo.project.name === "mobile", "Touch has no hover.");
  await page.goto("/");
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-entered", "true", {
    timeout: 15000,
  });
  const viewport = page.viewportSize()!;
  const target = { x: viewport.width * 0.73, y: viewport.height * 0.47 };
  // data-pointer-speed mirrors the shader term abs(max(Δx, Δy)) of the radius
  // 1.25 + abs(max(Δx, Δy)). Dala sets an impulse of 50 × the NDC step per
  // event, so speed is the step per frame: 2 px/frame peaks near 0.125 and
  // 90 px/frame near 0.77 (scripts/verify-particle-math.py). Both move right,
  // the direction in which the measured formula grows.
  const peakSpeed = async (step: number, steps: number) => {
    await page.evaluate(() =>
      document.documentElement.dispatchEvent(new PointerEvent("pointerleave")),
    );
    await page.waitForTimeout(600);
    const startX = target.x - step * steps;
    await page.mouse.move(startX, target.y);
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>(".particle-field")!;
      const state = window as unknown as {
        peak: number;
        watch?: MutationObserver;
      };
      state.watch?.disconnect();
      state.peak = 0;
      state.watch = new MutationObserver(() => {
        state.peak = Math.max(state.peak, Number(canvas.dataset.pointerSpeed));
      });
      state.watch.observe(canvas, { attributeFilter: ["data-pointer-speed"] });
    });
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(startX + step * i, target.y);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(400);
    return page.evaluate(() => (window as unknown as { peak: number }).peak);
  };
  expect(await peakSpeed(2, 80)).toBeLessThan(0.25);
  expect(await peakSpeed(90, 4)).toBeGreaterThan(0.5);
});

test("content and contact remain usable without WebGL2", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof getContext>
    ) {
      if (args[0] === "webgl2") return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("link", { name: "Vamos conversar", exact: true })
    .click();
  await expect(page.locator("#contato")).toBeFocused({ timeout: 2000 });
  await expect(
    page.getByRole("link", { name: "Conversar no LinkedIn", exact: true }),
  ).toBeVisible();
});

test("scroll morphs the particle geometry and retraces the same poses", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  // Freeze only the renderer's clock, so ambient motion cannot pass this test.
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request(() => callback(0));
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
    html { scroll-behavior: auto !important; }
    main, .site-header, .header-backdrop, .site-footer, .reading-progress, .skip-link,  nextjs-portal { opacity: 0 !important; }
  `,
  });
  const canvas = page.locator(".particle-field");
  const capture = async (id: string) => {
    await page.evaluate((sectionId) => {
      const parent = document.getElementById(sectionId)!;
      const section =
        parent.querySelector<HTMLElement>(".section-split, .section-heading") ??
        parent;
      const box = section.getBoundingClientRect();
      // Same layout position the app measures, without the reveal offset.
      const shift = new DOMMatrixReadOnly(getComputedStyle(section).transform)
        .m42;
      window.scrollTo({
        top:
          box.top -
          shift +
          scrollY +
          Math.min(box.height, innerHeight) / 2 -
          innerHeight / 2 +
          1,
        behavior: "instant",
      });
    }, id);
    // Far, near-camera triangles keep a visible spring tail; wait for stillness.
    await page.waitForTimeout(1200);
    await settleParticles(page);
    return canvas.screenshot();
  };
  const journey = await capture("trajetoria");
  const projects = await capture("projetos");
  const process = await capture("processo");
  expect(
    journey.equals(projects),
    "journey and projects must have different geometry",
  ).toBe(false);
  expect(
    await changedPixels(page, projects, process),
    "the stable dispersed field leaves reading sections quiet",
  ).toBeLessThan(0.002);
  expect(
    await changedPixels(page, await capture("projetos"), projects),
    "reverse scroll must restore the same pose",
  ).toBeLessThan(0.002);
  await testInfo.attach("particle-projects", {
    body: projects,
    contentType: "image/png",
  });
});

test("layout changes keep scroll progress aligned with the actual page", async ({
  page,
}) => {
  await page.goto("/");
  await page.addStyleTag({
    content: "html { scroll-behavior: auto !important; }",
  });
  await page.locator(".faq-list summary").first().click();
  for (const edge of ["bottom", "top"] as const) {
    await page.evaluate(
      (position) =>
        window.scrollTo({
          top:
            position === "bottom" ? document.documentElement.scrollHeight : 0,
          behavior: "instant",
        }),
      edge,
    );
    await expect
      .poll(() =>
        page
          .locator(".reading-progress")
          .evaluate(
            (element) =>
              new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
          ),
      )
      .toBeCloseTo(edge === "bottom" ? 1 : 0, 2);
  }
});
