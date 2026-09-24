import { expect, test } from '@playwright/test';
import { clickYards, openEditor, playerCenter, playerYards, yardsToScreen } from './helpers';

const lines = (page: import('@playwright/test').Page) =>
  page.locator('[data-testid=field-editor] .pd-line[data-line-id]');

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('draw a route with clicks and finish it by clicking the last point again', async ({
  page,
}) => {
  await page.getByTestId('tool-route').click();
  const z = await playerYards(page, 'z');
  await page.mouse.click(...(Object.values(await playerCenter(page, 'z')) as [number, number]));
  await expect(page.getByTestId('hint')).toContainText('Click the field to add each break');

  await clickYards(page, z.x, 10);
  const hover = await yardsToScreen(page, z.x - 3, 13);
  await page.mouse.move(hover.x, hover.y);
  await expect(page.getByTestId('preview-segment')).toBeVisible();
  await clickYards(page, z.x - 5, 15);
  await clickYards(page, z.x - 5, 15);

  await expect(lines(page)).toHaveCount(1);
  await expect(lines(page).first()).toHaveAttribute('data-line-type', 'route');
  await expect(page.getByTestId('finish-line')).toHaveCount(0);
});

test('draw a block with keyboard shortcuts and finish with Enter', async ({ page }) => {
  await page.keyboard.press('b');
  await expect(page.getByTestId('tool-block')).toHaveAttribute('aria-pressed', 'true');
  const c = await playerCenter(page, 'c');
  await page.mouse.click(c.x, c.y);
  const pos = await playerYards(page, 'c');
  await clickYards(page, pos.x + 1, 2);
  await clickYards(page, pos.x + 2, 3);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await expect(lines(page)).toHaveCount(1);
  await expect(lines(page).first()).toHaveAttribute('data-line-type', 'block');
});

test('Finish line button works (for touch screens)', async ({ page }) => {
  await page.getByTestId('tool-motion').click();
  const z = await playerCenter(page, 'z');
  await page.mouse.click(z.x, z.y);
  const pos = await playerYards(page, 'z');
  await clickYards(page, pos.x - 8, pos.y - 1);
  await page.getByTestId('finish-line').click();
  await expect(lines(page).first()).toHaveAttribute('data-line-type', 'motion');
});

test('drag a player; his route moves with him; undo and redo', async ({ page }) => {
  // Draw a route for Z first.
  await page.keyboard.press('r');
  await page.mouse.click(...(Object.values(await playerCenter(page, 'z')) as [number, number]));
  const start = await playerYards(page, 'z');
  await clickYards(page, start.x, 10);
  await page.keyboard.press('Enter');
  const routeBefore = await lines(page).first().locator('path').last().getAttribute('d');

  // Drag Z 4 yards left.
  await page.keyboard.press('v');
  const from = await playerCenter(page, 'z');
  const svgBox = (await page.getByTestId('field-editor').boundingBox())!;
  const pxPerYard = svgBox.width / (160 / 3 + 2);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x - (i * 4 * pxPerYard) / 8, from.y);
  await page.mouse.up();

  const after = await playerYards(page, 'z');
  expect(after.x).toBeCloseTo(start.x - 4, 0);
  await expect(page.getByTestId('readout')).toContainText('yd right of ball');
  const routeAfter = await lines(page).first().locator('path').last().getAttribute('d');
  expect(routeAfter).not.toBe(routeBefore);

  // The whole drag is one undo step.
  await page.keyboard.press('Control+z');
  expect((await playerYards(page, 'z')).x).toBeCloseTo(start.x, 1);
  await expect(lines(page)).toHaveCount(1);
  await page.keyboard.press('Control+Shift+z');
  expect((await playerYards(page, 'z')).x).toBeCloseTo(after.x, 1);

  // Buttons work too.
  await page.getByRole('button', { name: 'Undo' }).click();
  expect((await playerYards(page, 'z')).x).toBeCloseTo(start.x, 1);
  await page.getByRole('button', { name: 'Redo' }).click();
  expect((await playerYards(page, 'z')).x).toBeCloseTo(after.x, 1);
});

test('flip the play, flip back, and undo a flip', async ({ page }) => {
  const x = await playerYards(page, 'x');
  const ball = await playerYards(page, 'c');
  await page.keyboard.press('f');
  const flipped = await playerYards(page, 'x');
  expect(flipped.x).toBeCloseTo(2 * ball.x - x.x, 1);
  await page.getByRole('button', { name: 'Flip play' }).click();
  expect((await playerYards(page, 'x')).x).toBeCloseTo(x.x, 1);
  await page.keyboard.press('Control+z');
  expect((await playerYards(page, 'x')).x).toBeCloseTo(flipped.x, 1);
});

test('erase a line and select players to edit them', async ({ page }) => {
  await page.keyboard.press('r');
  await page.mouse.click(...(Object.values(await playerCenter(page, 'x')) as [number, number]));
  const x = await playerYards(page, 'x');
  await clickYards(page, x.x, 8);
  await page.keyboard.press('Enter');
  await expect(lines(page)).toHaveCount(1);

  await page.keyboard.press('v');
  await page.mouse.click(...(Object.values(await playerCenter(page, 'x')) as [number, number]));
  await page.getByTestId('player-label').fill('WR');
  await expect(page.locator('[data-player-id="x"] text')).toHaveText('WR');

  await page.getByTestId('tool-erase').click();
  await page.mouse.click(...(Object.values(await playerCenter(page, 'x')) as [number, number]));
  await expect(lines(page)).toHaveCount(0);
});

test('formation, ball spot, defense and level', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Formation' }).selectOption('trips-rt');
  await page.getByRole('button', { name: 'Left hash' }).click();
  await page.getByRole('button', { name: 'NFL' }).click();
  await page.getByTestId('show-defense').check();
  await expect(page.locator('[data-side=defense]')).toHaveCount(11);
  for (const id of ['x', 'y', 'z', 'h']) {
    const p = await playerYards(page, id);
    expect(p.x).toBeGreaterThanOrEqual(1);
    expect(p.x).toBeLessThanOrEqual(160 / 3 - 1);
  }
  await page.getByRole('button', { name: 'High school' }).click();
  const x = await playerYards(page, 'x');
  expect(x.x).toBeGreaterThanOrEqual(1);
});
