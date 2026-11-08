import { expect, test } from "@playwright/test";

test("hero follows the reference language and exposes the core journey", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Menos tarefas Mais tempo para crescer",
    }),
  ).toBeVisible();
  await expect(page.locator(".particle-field")).toBeVisible();
  await expect(page.locator(".particle-field")).toHaveCSS("position", "fixed");
  const navigation = page.locator(".site-header nav a");
  await expect(navigation).toHaveText([
    "Soluções",
    "Como funciona",
    "Na prática",
    "Sobre",
  ]);
  await expect(navigation.nth(0)).toHaveAttribute("href", "#solucoes");
  await expect(navigation.nth(1)).toHaveAttribute("href", "#processo");
  await expect(navigation.nth(2)).toHaveAttribute("href", "#projetos");
  await expect(navigation.nth(3)).toHaveAttribute("href", "#sobre");
  await expect(
    page.getByRole("link", { name: "Falar do projeto", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#manifesto")
      .getByRole("heading", { name: "Resolva o que trava sua equipe" }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", {
      name: "Veja na prática",
    }),
  ).toBeAttached();
  await expect(page.locator("#lia")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Quero conhecer a Lia" }),
  ).toHaveCount(0);
});

test("layout has no horizontal overflow at supported widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Overflow is a layout fact. The particle resize on every viewport blocks
  // the main thread on a software GPU and makes the measurement hang.
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

  for (const width of [
    320, 375, 768, 980, 1099, 1100, 1280, 1440, 1600, 1920,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
    const headerRight = await page
      .locator(".header-cta")
      .evaluate((element) => element.getBoundingClientRect().right);
    expect(headerRight).toBeLessThanOrEqual(dimensions.viewport);
    await page.evaluate(() => document.fonts.ready);
    // Body overflow is hidden, so scrollWidth alone misses clipped text.
    // Measure actual glyphs against each heading's reading column and masks.
    await expect
      .poll(
        async () =>
          page.locator("h1, h2, h3").evaluateAll((headings) => {
            const clipped: string[] = [];
            for (const heading of headings) {
              const box = heading.getBoundingClientRect();
              const walker = document.createTreeWalker(
                heading,
                NodeFilter.SHOW_TEXT,
              );
              while (walker.nextNode()) {
                const node = walker.currentNode;
                if (!node.textContent?.trim()) continue;
                const range = document.createRange();
                range.selectNodeContents(node);
                for (const rect of range.getClientRects()) {
                  if (rect.left < box.left - 2 || rect.right > box.right + 2)
                    clipped.push(`${heading.textContent}: ${node.textContent}`);
                }
              }
            }
            return clipped;
          }),
        { message: `headings fit their columns at ${width}px` },
      )
      .toEqual([]);
  }

  expect(errors).toEqual([]);
});

test("particle field stays active as the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const field = page.locator(".particle-field");
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20_000 });
  await expect(field).toHaveAttribute("data-entered", "true", { timeout: 20_000 });
  const before = Number(await field.getAttribute("data-section-progress"));
  await page.locator("#manifesto").evaluate((element) => element.scrollIntoView());
  await expect
    .poll(async () => Number(await field.getAttribute("data-section-progress")))
    .toBeGreaterThan(before + 0.2);
  await expect(page.locator(".reading-progress")).not.toHaveCSS(
    "transform",
    "matrix(0, 0, 0, 1, 0, 0)",
  );
});

test("solutions are all readable without selecting an option", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.locator("#solucoes");
  await expect(
    section.locator("input, button, [role=tab], [aria-live]"),
  ).toHaveCount(0);
  await expect(section.locator("h2")).toHaveText([
    "Encontre respostas nos seus dados",
    "Tire o repetitivo da rotina",
    "Sua ideia merece sair do papel",
  ]);
  await expect(section.locator(".solution-copy > p:not(.eyebrow)")).toHaveCount(3);
});

test("FAQ answers open with the keyboard", async ({ page }) => {
  await page.goto("/");

  const faq = page.locator("summary").filter({ hasText: "Preciso usar IA?" });
  await faq.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Usamos IA quando ela ajuda", { exact: false }),
  ).toBeVisible();
});

test("primary contact jump preserves keyboard focus", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Falar do projeto", exact: true })
    .click();
  await expect(page.locator("#contato")).toBeFocused({ timeout: 2_000 });
  await expect(
    page.getByRole("link", { name: "Falar no LinkedIn", exact: true }),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/antoniosfn");
});

test("static export keeps essential content without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Menos tarefas",
  );
  await expect(
    page.getByRole("link", { name: "Falar no LinkedIn", exact: true }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Preciso entender de tecnologia?" })
    .click();
  await expect(
    page.getByText("Traga o problema", {
      exact: false,
    }),
  ).toBeVisible();
  await context.close();
});

test("page has no failed local assets and captures visual evidence", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  const failures: string[] = [];
  page.on("response", (response) => {
    if (
      response.status() >= 400 &&
      response
        .url()
        .startsWith(testInfo.project.use.baseURL || "http://127.0.0.1")
    ) {
      failures.push(response.url());
    }
  });

  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".site-loader")).toHaveCount(0, { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: testInfo.outputPath("hero.png") });
  await page.locator("#projetos").evaluate((section) => {
    scrollTo({ top: (section as HTMLElement).offsetTop, behavior: "instant" });
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath("projects.png") });
  await page.locator("#sobre").evaluate((section) => {
    scrollTo({ top: (section as HTMLElement).offsetTop, behavior: "instant" });
  });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: testInfo.outputPath("tree.png") });
  await page.locator("#perguntas").evaluate((section) => {
    scrollTo({ top: (section as HTMLElement).offsetTop, behavior: "instant" });
  });
  await expect
    .poll(
      async () =>
        Number(
          await page.locator(".particle-field").getAttribute("data-section-progress"),
        ),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(8);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: testInfo.outputPath("faq.png") });
  expect(failures).toEqual([]);
});

test("loading book compresses to the centre before the page fades in", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const samples: {
      phase: string;
      opacity: number;
      width: number;
      cx: number;
      cy: number;
    }[] = [];
    (window as unknown as { loadingSamples: typeof samples }).loadingSamples =
      samples;
    let seen = false;
    const record = () => {
      const overlay = document.querySelector<HTMLElement>(".site-loader");
      const canvas = overlay?.querySelector("canvas");
      if (overlay && canvas) {
        seen = true;
        const box = canvas.getBoundingClientRect();
        samples.push({
          phase: overlay.dataset.phase!,
          opacity: Number(getComputedStyle(overlay).opacity),
          width: box.width,
          cx: box.x + box.width / 2,
          cy: box.y + box.height / 2,
        });
      } else if (seen) return;
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  await page.goto("/", { waitUntil: "commit" });
  const loader = page.locator(".site-loader");
  await expect(loader).toBeAttached();
  await expect(page.locator("html")).toHaveClass(/is-loading/);
  await expect(loader).toHaveCount(0, { timeout: 20000 });
  const samples = await page.evaluate(
    () =>
      (
        window as unknown as {
          loadingSamples: {
            phase: string;
            opacity: number;
            width: number;
            cx: number;
            cy: number;
          }[];
        }
      ).loadingSamples,
  );
  const compressed = samples.find((sample) => sample.phase === "revealing")!;
  const viewport = page.viewportSize()!;
  expect(compressed.width).toBeLessThan(viewport.width * 0.025);
  expect(compressed.cx).toBeCloseTo(viewport.width / 2, 0);
  expect(compressed.cy).toBeCloseTo(viewport.height / 2, 0);
  expect(
    samples
      .filter((sample) => sample.phase === "compressing")
      .every((sample) => sample.opacity === 1),
  ).toBe(true);
  expect(samples.some((sample) => sample.phase === "revealing")).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("opened-site.png") });
  await expect(page.locator("html")).not.toHaveClass(/is-loading/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Menos tarefas Mais tempo para crescer",
    }),
  ).toBeVisible();
});

test("text remains transparent over the figures with the heavier local font", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) =>
          /Inter|Barlow/.test(font.family.replaceAll('"', "")) &&
          font.status === "loaded",
      ),
    ),
  ).toBe(true);
  for (const width of [320, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const panels = await page
      .locator(
        ".hero-intro, .section-heading, .chapter-copy, .project-copy, .solution-copy, .profile-copy, .method-step, .faq-list, .contact h2, .contact-actions",
      )
      .evaluateAll((elements) =>
        elements
          .filter((el) => {
            const style = getComputedStyle(el);
            return (
              style.backgroundImage !== "none" ||
              style.backgroundColor !== "rgba(0, 0, 0, 0)"
            );
          })
          .map((el) => el.className),
      );
    expect(panels).toEqual([]);
  }
  await expect(page.locator(".hero-intro > p")).toHaveCSS("font-weight", "400");
  await expect(page.locator(".hero-intro > p")).toHaveCSS("color", "rgb(68, 68, 68)");
  await expect(page.locator("h1")).toHaveCSS("font-weight", "700");
});
