import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function download(page: Page, click: () => Promise<void>) {
  const [d] = await Promise.all([page.waitForEvent('download'), click()]);
  return { name: d.suggestedFilename(), path: await d.path() };
}

test('build cutups from the sample game and download the report', async ({ page }) => {
  await page.goto('/app/cutups');
  await page.getByRole('button', { name: 'Try a sample game' }).click();
  await expect(page.getByRole('combobox', { name: 'Breakdown' })).toContainText('Sample game');

  // Offensive scout: field position folders, numbered, in football order.
  const nodes = page.getByTestId('cutup-node');
  await expect(nodes.first()).toContainText('All plays');
  await expect(nodes.nth(1)).toContainText(/^\d\d - /);

  await nodes.nth(1).click();
  await expect(page.getByTestId('cutup-detail').getByRole('heading', { level: 2 })).toContainText(
    '01 - ',
  );
  await expect(page.getByTestId('cutup-detail')).toContainText('Top formations');

  const deck = await download(page, () =>
    page.getByRole('button', { name: 'Download PowerPoint' }).click(),
  );
  expect(deck.name).toMatch(/\.pptx$/);
  expect(readFileSync(deck.path).subarray(0, 2).toString()).toBe('PK');

  const list = await download(page, () =>
    page.getByRole('button', { name: 'Folder list (.csv)' }).click(),
  );
  expect(readFileSync(list.path, 'utf8')).toMatch(/^Folder,Plays,Summary,Play numbers/);
});

test('build a template once and reuse it after a reload', async ({ page }) => {
  await page.goto('/app/cutups');
  await page.getByRole('button', { name: 'Try a sample game' }).click();
  await page
    .getByRole('combobox', { name: 'Cutup template' })
    .selectOption({ label: 'Third down' });
  await page.getByRole('button', { name: 'Save as new' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');

  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('3rd down by hash');
  await page.getByRole('button', { name: 'Remove Play' }).click();
  await page.getByRole('combobox', { name: 'Add a folder level' }).selectOption('hash');
  await page.getByRole('button', { name: 'Save template' }).click();

  await page.reload();
  await page
    .getByRole('combobox', { name: 'Cutup template' })
    .selectOption({ label: '3rd down by hash' });
  await expect(page.getByRole('list', { name: 'Folder order' })).toContainText('Hash');
  // Every play in the tree is a 3rd down.
  await page.getByTestId('cutup-node').first().click();
  const downs = await page
    .getByTestId('cutup-detail')
    .locator('tbody tr td:nth-child(2)')
    .allTextContents();
  expect(downs.length).toBeGreaterThan(0);
  expect(downs.every((d) => d.startsWith('3 &'))).toBe(true);
});

test('import a CSV with unusual column names and fix the matching', async ({ page }) => {
  const csv = [
    'Snap,Unit,Dn,Togo,Spot,Look,Call,Yds,Kind',
    '1,O,1,10,-25,Trips Rt,Mesh,6,Pass',
    '2,O,2,4,-31,Doubles,Inside Zone,5,Run',
    '3,O,1,10,-36,Trips Rt,Stick,0,Pass',
  ].join('\n');
  await page.goto('/app/cutups');
  await page
    .getByTestId('breakdown-file')
    .setInputFiles({ name: 'week3.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(page.getByRole('status')).toContainText('Imported 3 plays');

  // "Look" and "Call" aren't standard names: point the template's columns at them.
  await page
    .getByRole('combobox', { name: 'Column for Offensive formation' })
    .selectOption({ label: 'Look' });
  await page
    .getByRole('combobox', { name: 'Column for Offensive play' })
    .selectOption({ label: 'Call' });
  await page
    .getByRole('combobox', { name: 'Column for Play type (run / pass)' })
    .selectOption({ label: 'Kind' });
  await page
    .getByRole('combobox', { name: 'Cutup template' })
    .selectOption({ label: 'Formation tendencies' });
  await expect(page.getByTestId('cutup-node').nth(1)).toContainText('Trips Rt');
  await expect(page.getByTestId('cutup-node').nth(1)).toContainText('2');
});

test('Excel files get a clear message', async ({ page }) => {
  await page.goto('/app/cutups');
  await page.getByTestId('breakdown-file').setInputFiles({
    name: 'game.xlsx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('PK'),
  });
  await expect(page.getByRole('status')).toContainText('save or export the breakdown as CSV');
});
