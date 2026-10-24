import { expect, test } from "@playwright/test";

test("hero follows the reference language and exposes the core journey", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Conecte o que sabe. Construa o que falta.",
    }),
  ).toBeVisible();
  await expect(page.locator(".particle-field")).toBeVisible();
  await expect(page.locator(".particle-field")).toHaveCSS("position", "fixed");
  await expect(
    page.getByRole("link", { name: "Vamos conversar", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("#manifesto")
      .getByRole("heading", { name: "Antes de construir, entender." }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", {
      name: "Conhecimento que encontra uma forma útil.",
    }),
  ).toBeAttached();
});

test("layout has no horizontal overflow at supported widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  for (const width of [320, 375, 768, 980, 1280, 1440, 1920]) {
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

test("challenge selection updates the suggested application", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");

  await page.getByRole("radio", { name: /Rotinas repetitivas/ }).check();
  await expect(
    page.getByRole("heading", {
      name: "O tempo da equipe merece um trabalho melhor.",
    }),
  ).toBeVisible();
  await expect(page.locator(".approach strong")).toHaveText(
    "Python + APIs + execução determinística",
  );

  await page
    .getByRole("radio", { name: /Uma ideia para tirar do papel/ })
    .check();
  await expect(
    page.getByRole("radio", { name: /Uma ideia para tirar do papel/ }),
  ).toBeChecked();
  await expect(page.locator(".approach strong")).toHaveText(
    "React + serviços + banco de dados",
  );
  expect(errors).toEqual([]);
});

test("FAQ and project details work with the keyboard", async ({ page }) => {
  await page.goto("/");

  const faq = page
    .locator("summary")
    .filter({ hasText: "Todo projeto precisa de inteligência artificial?" });
  await faq.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("A escolha depende do problema.", { exact: false }),
  ).toBeVisible();

  const project = page.locator(".project details").first();
  const summary = project.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    project.getByText("Projeto profissional · Código privado"),
  ).toBeVisible();
});

test("primary contact jump preserves keyboard focus", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Vamos conversar", exact: true })
    .click();
  await expect(page.locator("#contato")).toBeFocused({ timeout: 2_000 });
  await expect(
    page.getByRole("link", { name: "Conversar no LinkedIn", exact: true }),
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
    "Conecte",
  );
  await expect(
    page.getByRole("link", { name: "Conversar no LinkedIn", exact: true }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Preciso saber qual tecnologia usar?" })
    .click();
  await expect(
    page.getByText("Você pode começar pelo problema de negócio.", {
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
  await page.screenshot({ path: testInfo.outputPath("hero.png") });
  await page.locator("#projetos").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath("projects.png") });
  expect(failures).toEqual([]);
});
