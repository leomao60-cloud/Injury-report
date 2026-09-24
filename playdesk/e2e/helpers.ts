import type { Page } from '@playwright/test';

/** Screen position (px) of a point given in yards (x from left sideline, y past the LOS). */
export async function yardsToScreen(page: Page, x: number, y: number) {
  return page.locator('[data-testid=field-editor]').evaluate(
    (svg, [x, y]) => {
      const ctm = (svg as SVGSVGElement).getScreenCTM()!;
      const p = new DOMPoint(x, -y).matrixTransform(ctm);
      return { x: p.x, y: p.y };
    },
    [x, y] as const,
  );
}

/** Center of a player marker on screen. */
export async function playerCenter(page: Page, id: string) {
  const box = await page
    .locator(
      `[data-testid=field-editor] [data-player-id="${id}"] circle, [data-testid=field-editor] [data-player-id="${id}"] rect`,
    )
    .last()
    .boundingBox();
  if (!box) throw new Error(`player ${id} not visible`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A player's position in yards, read from the drawing. */
export async function playerYards(page: Page, id: string) {
  return page.locator(`[data-testid=field-editor] [data-player-id="${id}"]`).evaluate((g) => {
    const shape = g.querySelector('circle:last-of-type, rect:last-of-type') as SVGGraphicsElement;
    const b = shape.getBBox();
    return {
      x: Math.round((b.x + b.width / 2) * 100) / 100,
      y: Math.round(-(b.y + b.height / 2) * 100) / 100,
    };
  });
}

export async function clickYards(page: Page, x: number, y: number) {
  const p = await yardsToScreen(page, x, y);
  await page.mouse.click(p.x, p.y);
}

export async function openEditor(page: Page) {
  await page.goto('/app');
  await page.locator('[data-testid=field-editor]').waitFor();
}
