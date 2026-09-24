import { expect, test } from '@playwright/test';
import { clickYards, openEditor, playerCenter, playerYards, yardsToScreen } from './helpers';

const lines = (page: import('@playwright/test').Page) =>
  page.locator('[data-testid=field-editor] .pd-line[data-line-id]');

async function drawRoute(
  page: import('@playwright/test').Page,
  id: string,
  breaks: [number, number][],
) {
  await page.getByTestId('tool-route').click();
  const c = await playerCenter(page, id);
  await page.mouse.click(c.x, c.y);
  const p = await playerYards(page, id);
  for (const [dx, y] of breaks) await clickYards(page, p.x + dx, y);
  await page.keyboard.press('Enter');
  return p;
}

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test('drag a break point of a selected route; undo puts it back', async ({ page }) => {
  const z = await drawRoute(page, 'z', [
    [0, 8],
    [-4, 12],
  ]);
  await page.getByTestId('tool-move').click();
  const onLine = await yardsToScreen(page, z.x, 5);
  await page.mouse.click(onLine.x, onLine.y);
  const handles = page.locator('[data-handle-index]');
  await expect(handles).toHaveCount(2);

  const before = await lines(page).first().locator('path').last().getAttribute('d');
  const from = await yardsToScreen(page, z.x, 8);
  const to = await yardsToScreen(page, z.x + 3, 10);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2);
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
  const after = await lines(page).first().locator('path').last().getAttribute('d');
  expect(after).not.toBe(before);
  expect((await playerYards(page, 'z')).x).toBeCloseTo(z.x, 1); // the player did not move

  await page.keyboard.press('Control+z');
  expect(await lines(page).first().locator('path').last().getAttribute('d')).toBe(before);
});

test('make a route curved', async ({ page }) => {
  const f = await drawRoute(page, 'f', [
    [4, -3],
    [8, 4],
  ]);
  await page.getByTestId('tool-move').click();
  const onLine = await yardsToScreen(page, f.x + 2, (f.y - 3) / 2); // middle of the first segment
  await page.mouse.click(onLine.x, onLine.y);
  await page.getByTestId('line-curved').check();
  const d = await lines(page).first().locator('path').last().getAttribute('d');
  expect(d!.split('L').length).toBeGreaterThan(10);
});

test('add and delete players', async ({ page }) => {
  await page.getByTestId('add-offense').click();
  await expect(page.locator('[data-testid=field-editor] [data-side=offense]')).toHaveCount(12);
  await page.getByRole('button', { name: 'Delete player' }).click();
  await expect(page.locator('[data-testid=field-editor] [data-side=offense]')).toHaveCount(11);
  await page.getByTestId('add-defense').click();
  await expect(page.locator('[data-testid=field-editor] [data-side=defense]')).toHaveCount(1);
});

test('choose a defensive front', async ({ page }) => {
  await page.getByTestId('show-defense').check();
  await page.getByRole('combobox', { name: 'Defense' }).selectOption('34-cover3');
  await expect(page.locator('[data-player-id=nt]')).toHaveCount(1);
  await expect(page.locator('[data-testid=field-editor] [data-side=defense]')).toHaveCount(11);
});

test('quick start can be dismissed and stays dismissed', async ({ page }) => {
  await expect(page.getByTestId('quick-start')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByTestId('quick-start')).toHaveCount(0);
  await page.reload();
  await page.locator('[data-testid=field-editor]').waitFor();
  await expect(page.getByTestId('quick-start')).toHaveCount(0);
});

test('Sheets explains that the open play must be saved, and saves it', async ({ page }) => {
  await page.getByTestId('play-name').fill('Stick');
  await page.getByRole('link', { name: 'Sheets' }).click();
  await expect(page.getByTestId('unsaved-notice')).toContainText('Stick');
  await page.getByRole('button', { name: 'Save it to the library' }).click();
  await expect(page.getByTestId('unsaved-notice')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /Stick/ })).toBeVisible();
});

test('on a phone, the selected player is edited right under the field', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  const c = await playerCenter(page, 'x');
  await page.mouse.click(c.x, c.y);
  const field = (await page.getByTestId('field-editor').boundingBox())!;
  const label = (await page.getByTestId('player-label').boundingBox())!;
  expect(label.y - (field.y + field.height)).toBeLessThan(300);
});
