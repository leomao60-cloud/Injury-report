import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openEditor } from './helpers';

async function download(page: Page, click: () => Promise<void>) {
  const [d] = await Promise.all([page.waitForEvent('download'), click()]);
  return { name: d.suggestedFilename(), path: await d.path() };
}

test('save a play to a file and open it again', async ({ page }) => {
  await openEditor(page);
  await page.getByTestId('play-name').fill('Mesh Rail');
  await page.getByRole('button', { name: 'Flip play' }).click();
  const file = await download(page, () => page.getByTestId('save-play-file').click());
  expect(file.name).toBe('Mesh-Rail.playdesk');
  const saved = JSON.parse(readFileSync(file.path, 'utf8'));
  expect(saved).toMatchObject({ app: 'playdesk', kind: 'play', play: { name: 'Mesh Rail' } });

  await page.getByTestId('play-name').fill('Something else');
  await page.getByTestId('open-play-file').setInputFiles(file.path);
  await expect(page.getByTestId('play-name')).toHaveValue('Mesh Rail');
});

test('import a .playdesk file into the library', async ({ page }) => {
  await openEditor(page);
  await page.getByTestId('play-name').fill('Y Cross');
  const file = await download(page, () => page.getByTestId('save-play-file').click());
  await page.goto('/app/library');
  await expect(page.getByTestId('play-card')).toHaveCount(3);
  await page.getByTestId('import-file').setInputFiles({
    name: 'Y-Cross.playdesk',
    mimeType: 'application/json',
    buffer: readFileSync(file.path),
  });
  await expect(page.getByTestId('play-card')).toHaveCount(4);
  await expect(page.getByRole('status')).toContainText('Imported 1 play');
});

test('download Visio and PowerPoint files', async ({ page }) => {
  await openEditor(page);
  const vsdx = await download(page, () => page.getByTestId('export-visio').click());
  expect(vsdx.name).toMatch(/\.vsdx$/);
  expect(readFileSync(vsdx.path).subarray(0, 2).toString()).toBe('PK'); // a zip package

  await page.goto('/app/library');
  await page.getByTestId('play-card').first().waitFor();
  const deck = await download(page, () =>
    page.getByRole('button', { name: 'PowerPoint (.pptx)' }).click(),
  );
  expect(deck.name).toMatch(/\.pptx$/);
  const visio = await download(page, () =>
    page.getByRole('button', { name: 'Visio (.vsdx)' }).click(),
  );
  expect(visio.name).toMatch(/\.vsdx$/);
});

test('team branding shows on sheets', async ({ page }) => {
  await page.goto('/app/team');
  await page.getByTestId('team-name').fill('Central Eagles');
  await expect(page.getByLabel('Preview')).toContainText('Central Eagles');
  // A tiny valid PNG logo.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  await page
    .getByTestId('logo-file')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: 'Team logo' })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('team-name')).toHaveValue('Central Eagles');
  await page.getByRole('link', { name: 'Sheets' }).click();
  await page.getByRole('button', { name: 'Add all' }).click();
  await expect(page.locator('.print-root')).toContainText('Central Eagles');
  const pdf = await download(page, () =>
    page.getByRole('button', { name: 'Download PDF' }).click(),
  );
  expect(readFileSync(pdf.path).subarray(0, 4).toString()).toBe('%PDF');
});

test('inside PowerPoint, plays are inserted as slides', async ({ page }) => {
  // Stand-in for Office.js: records what the add-in asks PowerPoint to insert.
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__inserted = [];
    w.Office = {
      onReady: async () => ({ host: 'PowerPoint' }),
      context: { requirements: { isSetSupported: () => true } },
    };
    w.PowerPoint = {
      run: async (fn: (ctx: unknown) => Promise<void>) =>
        fn({
          presentation: {
            insertSlidesFromBase64: (b64: string) => (w.__inserted as string[]).push(b64),
          },
          sync: async () => {},
        }),
    };
  });
  await page.goto('/addin');
  await page.getByTestId('insert-powerpoint').click();
  await expect(page.getByRole('status').filter({ hasText: 'Inserted' })).toBeVisible();
  const inserted = await page.evaluate(
    () => (window as unknown as { __inserted: string[] }).__inserted,
  );
  expect(inserted).toHaveLength(1);
  expect(Buffer.from(inserted[0]!, 'base64').subarray(0, 2).toString()).toBe('PK');

  // Still connected after moving around the app.
  await page.getByRole('link', { name: 'Library' }).click();
  await page.getByRole('button', { name: 'Insert all into PowerPoint' }).click();
  await expect(page.getByRole('status')).toContainText('Inserted 3 slides');
});

test('outside PowerPoint there is no insert button', async ({ page }) => {
  await openEditor(page);
  await expect(page.getByTestId('insert-powerpoint')).toHaveCount(0);
});
