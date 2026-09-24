import { expect, test } from '@playwright/test';
import { openEditor } from './helpers';

test('saved plays and the open play survive a refresh', async ({ page }) => {
  await openEditor(page);
  await page.getByTestId('play-name').fill('Four Verts');
  await page.getByTestId('save-play').click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved in Offense');
  await page.keyboard.press('f');
  await expect(page.getByTestId('save-status')).toHaveText('Unsaved changes');

  await page.reload();
  await expect(page.getByTestId('play-name')).toHaveValue('Four Verts');
  await expect(page.getByTestId('save-status')).toHaveText('Unsaved changes');

  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.getByTestId('play-card')).toHaveCount(4); // 3 examples + ours
  await page.getByLabel('Search plays').fill('verts');
  await expect(page.getByTestId('play-card')).toHaveCount(1);
});

test('delete asks for confirmation', async ({ page }) => {
  await page.goto('/app/library');
  await expect(page.getByTestId('play-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Delete Doubles Rt Smash' }).click();
  await page.getByRole('button', { name: 'Keep' }).click();
  await expect(page.getByTestId('play-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Delete Doubles Rt Smash' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByTestId('play-card')).toHaveCount(2);
});

test('sheets number plays in order', async ({ page }) => {
  await page.goto('/app/sheets');
  await page.getByRole('button', { name: 'Add all' }).click();
  await page.getByRole('button', { name: '8 per page' }).click();
  await expect(page.getByTestId('sheet-cell')).toHaveCount(3);
  await page.getByRole('spinbutton', { name: 'Start at' }).fill('20');
  await expect(page.getByTestId('sheet-cell').first()).toContainText('20');
  await page.getByRole('button', { name: 'Wristband' }).click();
  await expect(page.getByTestId('wristband-panel')).toHaveCount(3);
});
