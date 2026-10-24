import { expect, type Page } from "@playwright/test";

export async function settleParticles(page: Page) {
  const field = page.locator(".particle-field");
  await expect(field).toHaveAttribute("data-entered", "true", {
    timeout: 15000,
  });
  let previous = await field.screenshot();
  let stable = 0;
  await expect
    .poll(
      async () => {
        const current = await field.screenshot();
        stable =
          (await changedPixels(page, previous, current)) < 0.00001
            ? stable + 1
            : 0;
        previous = current;
        return stable;
      },
      { intervals: [500], timeout: 15000 },
    )
    .toBeGreaterThanOrEqual(2);
}

/** Compare decoded pixels, tolerating subpixel rounding after spring settling. */
export async function changedPixels(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async ([first, second]) => {
      const decode = async (base64: string) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const [x, y] = await Promise.all([decode(first), decode(second)]);
      let changed = 0;
      for (let i = 0; i < x.length; i += 4) {
        if (
          Math.max(
            Math.abs(x[i] - y[i]),
            Math.abs(x[i + 1] - y[i + 1]),
            Math.abs(x[i + 2] - y[i + 2]),
          ) > 8
        )
          changed++;
      }
      return changed / (x.length / 4);
    },
    [a.toString("base64"), b.toString("base64")],
  );
}
