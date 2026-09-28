import { expect, test } from '@playwright/test';
import { developmentState, savedState, walk } from './helpers';

test('works physical timber and stone, carries and sets down cargo, and keeps a stable viewport', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  const initial = await page.locator('.world-canvas canvas').boundingBox();
  await walk(page, -1, -4);
  for (let swing = 0; swing < 3; swing++) {
    await page.getByRole('button', { name: /Chop timber/ }).click();
    await expect.poll(async () => (await developmentState(page)).work).toBeNull();
  }
  await expect(page.locator('.rancher-card')).toContainText('Timber 2');
  const afterWork = await page.locator('.world-canvas canvas').boundingBox();
  expect(afterWork!.height).toBe(initial!.height);
  expect(afterWork!.width).toBe(initial!.width);
  await page.screenshot({ path: info.outputPath('timber-in-arms.png'), fullPage: true });
  await walk(page, 0, 0);
  await walk(page, 6, 4);
  for (let swing = 0; swing < 3; swing++) {
    await page.getByRole('button', { name: /Crack stone/ }).click();
    await expect.poll(async () => (await developmentState(page)).work).toBeNull();
  }
  await expect(page.locator('.load-status')).toContainText('Heavy');
  await page.screenshot({ path: info.outputPath('heavy-load.png'), fullPage: true });
  await page.locator('.interaction-dock').getByRole('button', { name: 'Set cargo down' }).click();
  await expect(page.locator('.load-status')).toContainText('Light');
  await expect.poll(async () => (await savedState(page)).groundCargo.length).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Pick up cargo' })).toBeVisible();
  await page.getByRole('button', { name: 'Pick up cargo' }).click();
  await expect(page.locator('.load-status')).toContainText('Heavy');
  expect((await developmentState(page)).player.skills['woodcutting']).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});
