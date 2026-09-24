import { expect, test } from '@playwright/test';

for (const path of ['/', '/app', '/app/library', '/app/sheets']) {
  test(`${path} has no sideways scroll at 400px`, async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('every button has an accessible name', async ({ page }) => {
  for (const path of ['/app', '/app/library', '/app/sheets']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button, a, input, select')]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .filter((el) => {
          const e = el as HTMLElement;
          const label =
            e.getAttribute('aria-label') ||
            e.textContent?.trim() ||
            e.getAttribute('title') ||
            (e as HTMLInputElement).labels?.[0]?.textContent?.trim() ||
            e.getAttribute('placeholder');
          return !label;
        })
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    expect(unnamed, path).toEqual([]);
  }
});

test('dark mode applies dark colors', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/app');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(12, 17, 22)');
});
