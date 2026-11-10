import { expect, test } from "@playwright/test";
import {
  changedPixels,
  settleParticles,
  settleQuality,
} from "./particle-helpers";

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
  // The hero is still a cloud, so the hover term is off until a figure is whole.
  await expect(field).toHaveAttribute("data-hover-gain", "0.000");
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

test("spring retains inertia after scroll stops and then settles @visual", async ({
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

test("pointer deforms a visible 3D field and releases it back to its pose @visual", async ({
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

test("hover belongs to the figure: off the form nothing moves", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  test.skip(testInfo.project.name === "mobile", "Touch has no hover.");
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request(() => callback(0));
  });
  await page.goto("/");
  await page.addStyleTag({
    content:
      "main, .site-header, .header-backdrop, .site-footer, .reading-progress, .skip-link, nextjs-portal { opacity: 0 !important; }",
  });
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-entered", "true", { timeout: 20_000 });
  await page.locator("#trajetoria").evaluate((section) => {
    scrollTo({ top: (section as HTMLElement).offsetTop, behavior: "instant" });
  });
  await expect
    .poll(async () => Number(await field.getAttribute("data-explode")), {
      timeout: 20_000,
    })
    .toBeLessThan(0.15);
  const viewport = page.viewportSize()!;
  // Empty space left of the copy: the pointer ray meets no particle.
  await page.mouse.move(viewport.width * 0.05, viewport.height * 0.12);
  await page.mouse.move(viewport.width * 0.06, viewport.height * 0.14, {
    steps: 4,
  });
  await expect(field).toHaveAttribute("data-hover-gain", "1.000");
  await page.waitForTimeout(800);
  await expect(
    field,
    "a pointer over empty space must not touch the figure",
  ).toHaveAttribute("data-hover-hit", "0.000");
  // The Lorenz sits to the right of the copy. The old fixed "knot" point
  // (0.73, 0.47) misses that placement, so the ray is scanned across the
  // right half. The corner above must still miss. The depth read-back is a
  // few times a second and each Playwright round trip on CI waits out a
  // whole software-GL frame, so the scan runs in the page and stops at the
  // first cell that meets the surface. The centre cell is first.
  const hit = await field.evaluate(async (canvas) => {
    const aim = (x: number, y: number) => {
      document.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: x * innerWidth,
          clientY: y * innerHeight,
          pointerType: "mouse",
          isPrimary: true,
        }),
      );
    };
    const nextFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    const points: [number, number][] = [];
    for (const y of [0.5, 0.35, 0.65])
      for (const x of [0.76, 0.62, 0.9]) points.push([x, y]);
    for (const [x, y] of points) {
      aim(x, y);
      // 200ms between reads, then one frame to publish. A slow frame still
      // gets a second look after the deadline.
      const deadline = performance.now() + 800;
      do {
        await nextFrame();
        if (Number((canvas as HTMLElement).dataset.hoverHit) >= 1) return true;
      } while (performance.now() < deadline);
      await nextFrame();
      if (Number((canvas as HTMLElement).dataset.hoverHit) >= 1) return true;
    }
    return false;
  });
  expect(hit, "a pointer over the Lorenz must meet its surface").toBe(true);
});

test("background is true black: no faint haze from bloom or vignette @visual", async ({
  page,
}) => {
  test.setTimeout(60000);
  // Freeze only the renderer's clock, so ambient motion cannot pass this test.
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => request(() => callback(0));
  });
  await page.goto("/");
  await page.addStyleTag({
    content:
      "main, .site-header, .header-backdrop, .site-footer, .reading-progress, .skip-link, nextjs-portal { opacity: 0 !important; }",
  });
  await settleParticles(page);
  const shot = await page.locator(".particle-field").screenshot();
  const haze = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.width, image.height).data;
    let black = 0,
      faint = 0;
    for (let i = 0; i < data.length; i += 4) {
      const peak = Math.max(data[i], data[i + 1], data[i + 2]);
      if (peak === 0) black++;
      else if (peak <= 2) faint++;
    }
    return {
      black: black / (data.length / 4),
      faint: faint / (data.length / 4),
    };
  }, shot.toString("base64"));
  // A uniform lift would turn the black share into a faint one; what remains
  // faint is only the last step of each halo's falloff.
  expect(haze.black, "most of the screen is pixels-off black").toBeGreaterThan(
    0.6,
  );
  expect(haze.faint, "no near-black haze around the forms").toBeLessThan(0.03);
});

test("pointer speed drives the hover radius term @visual", async ({
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
    .getByRole("link", { name: "Falar do projeto", exact: true })
    .click();
  await expect(page.locator("#contato")).toBeFocused({ timeout: 2000 });
  await expect(
    page.getByRole("link", { name: "Falar no LinkedIn", exact: true }),
  ).toBeVisible();
});

test("scroll morphs the particle geometry and retraces the same poses @visual", async ({
  page,
}, testInfo) => {
  test.setTimeout(300000);
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
  // `id` is a section id or a selector (the first project: book and atom).
  const capture = async (id: string) => {
    await page.evaluate((sectionId) => {
      const parent =
        document.getElementById(sectionId) ??
        document.querySelector<HTMLElement>(sectionId)!;
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
  await settleQuality(page);
  const journey = await capture("trajetoria");
  const projects = await capture("#projetos .project");
  const projectsRatio = await canvas.getAttribute("data-pixel-ratio");
  const process = await capture("sobre");
  expect(
    journey.equals(projects),
    "journey and projects must have different geometry",
  ).toBe(false);
  expect(
    await changedPixels(page, projects, process),
    "book and atom give way to the tree",
  ).toBeGreaterThan(0.01);
  // Adaptive quality may step the pixel ratio down mid-test on a loaded GPU;
  // compare two returns rendered at the same ratio, each read with its shot.
  const ratio = () => canvas.getAttribute("data-pixel-ratio");
  let reference = projects,
    referenceRatio = projectsRatio;
  for (let attempt = 0; attempt < 3; attempt++) {
    const back = await capture("#projetos .project");
    const backRatio = await ratio();
    if (backRatio === referenceRatio) {
      expect(
        await changedPixels(page, back, reference),
        "reverse scroll must restore the same pose",
      ).toBeLessThan(0.002);
      break;
    }
    reference = back;
    referenceRatio = backRatio;
    await capture("sobre");
  }
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
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20_000 });
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
      .poll(
        () =>
          page
            .locator(".reading-progress")
            .evaluate(
              (element) =>
                new DOMMatrixReadOnly(getComputedStyle(element).transform).a,
            ),
        // Lenis closes 7.5% of the remaining distance per frame. A slow GPU
        // needs more wall time to reach the same scroll fraction.
        { timeout: 20_000 },
      )
      .toBeCloseTo(edge === "bottom" ? 1 : 0, 2);
  }
});
