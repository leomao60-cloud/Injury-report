import { expect, test } from '@playwright/test';

const CATEGORIES = [
  'Personnel (O & D)',
  'Scout (O & D)',
  'Pass Game',
  'Run Game',
  'Special Teams',
  '12-Man',
  'Flag',
];

test('every category shows formations', async ({ page }) => {
  await page.goto('/app/formations');
  for (const name of CATEGORIES) {
    await page.getByRole('tab', { name }).click();
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    expect(await page.getByTestId('template-card').count()).toBeGreaterThanOrEqual(4);
  }
});

test('open a special teams unit in the editor', async ({ page }) => {
  await page.goto('/app/formations');
  await page.getByRole('tab', { name: 'Special Teams' }).click();
  await page.getByRole('button', { name: 'Open Spread Punt in the editor' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId('play-name')).toHaveValue('Spread Punt');
  await expect(page.locator('[data-testid=field-editor] [data-player-id=p]')).toBeVisible(); // punter 14 yards deep
  await expect(page.getByRole('combobox', { name: 'Formation' })).toHaveValue('custom');
});

test('a 12-man play uses the wide field, and flag the narrow one', async ({ page }) => {
  await page.goto('/app/formations');
  await page.getByRole('tab', { name: '12-Man' }).click();
  await page.getByRole('button', { name: 'Open 12-man Trips Flood in the editor' }).click();
  await expect(page.getByTestId('level')).toHaveValue('cfl');
  await expect(page.locator('[data-testid=field-editor] [data-side=offense]')).toHaveCount(12);
  const wide = await page.getByTestId('field-editor').getAttribute('viewBox');
  expect(Number(wide!.split(' ')[2])).toBeGreaterThan(65);

  await page.getByTestId('level').selectOption('flag');
  await expect(page.locator('[data-testid=field-editor] [data-side=offense]')).toHaveCount(5);
  const narrow = await page.getByTestId('field-editor').getAttribute('viewBox');
  expect(Number(narrow!.split(' ')[2])).toBeLessThan(35);
  await expect(page.getByRole('button', { name: 'Left hash' })).toHaveCount(0);
});

test('add a template to the library', async ({ page }) => {
  await page.goto('/app/formations');
  await page.getByRole('tab', { name: 'Pass Game' }).click();
  await page.getByRole('button', { name: 'Add to library' }).first().click();
  await expect(page.getByRole('status')).toContainText('Added');
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.getByTestId('play-card')).toHaveCount(4);
});

test('the formation list follows the game', async ({ page }) => {
  await page.goto('/app');
  const formation = page.getByRole('combobox', { name: 'Formation' });
  await formation.selectOption('wishbone');
  await expect(page.locator('[data-player-id=f] text')).toHaveText('L');
  await page.getByTestId('level').selectOption('flag');
  await expect(formation.locator('option')).toHaveCount(5);
  await expect(formation).toHaveValue('flag-2x1');
});
