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
    "Na prática",
    "Como funciona",
  ]);
  await expect(navigation.nth(0)).toHaveAttribute("href", "#solucoes");
  await expect(navigation.nth(1)).toHaveAttribute("href", "#projetos");
  await expect(navigation.nth(2)).toHaveAttribute("href", "#processo");
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
  await expect(page.locator(".particle-field")).toBeVisible();

  const before = await page.locator(".particle-field").screenshot();
  await page.locator("#manifesto").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const after = await page.locator(".particle-field").screenshot();

  expect(before.equals(after)).toBe(false);
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
  await expect(section.locator(".solution p")).toHaveCount(3);
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
  await page.locator("#projetos").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath("projects.png") });
  await page.locator("#sobre").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: testInfo.outputPath("tree.png") });
  await page.locator("#perguntas .section-heading").evaluate((element) => {
    const box = element.getBoundingClientRect();
    const shift = new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
    scrollTo({
      top: scrollY + box.top - shift + (innerWidth <= 1099
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
      { timeout: 10000 },
    )
    .toBeCloseTo(8, 1);
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
  await expect
    .poll(() => loader.getAttribute("data-phase"), {
      intervals: [30],
      timeout: 20000,
    })
    .toBe("compressing");
  await expect(page.locator(".site-loader-count")).toHaveText("100");
  // The veil stays black while the book shrinks, rather than scattering out.
  await expect(loader).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("loading-book.png") });
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
  expect(
    samples.some(
      (sample) =>
        sample.phase === "revealing" &&
        sample.opacity > 0.1 &&
        sample.opacity < 0.9,
    ),
  ).toBe(true);
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
          font.family.replaceAll('"', "") === "Manrope" &&
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
  await expect(page.locator(".hero-intro > p")).toHaveCSS("font-weight", "600");
  await expect(page.locator(".hero-intro > p")).toHaveCSS(
    "color",
    "rgb(242, 242, 242)",
  );
  await expect(page.locator("h1")).toHaveCSS("font-weight", "800");
});
