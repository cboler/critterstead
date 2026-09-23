import { expect, test } from '@playwright/test';

test('opens a responsive, playable homestead without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Critterstead/);
  await expect(page.locator('.brand')).toContainText('Critterstead');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await expect(page.locator('.companion-card')).toContainText('Pip');
  await expect(page.locator('.save-state')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close panel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Field journal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close panel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume game', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume game', exact: true }).click();
  expect(errors).toEqual([]);
});

test('keeps care and day progression across a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Give a little scritch', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Give a little scritch', exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Give a little scritch', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Backquote');
  await expect(page.getByText('Developer field kit', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Advance one day', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Give a little scritch', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Give a little scritch', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('body')).toContainText(/Day\s+2/);
});
