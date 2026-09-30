import { expect, test } from '@playwright/test';
import { developmentState, PACE, savedState, SPOTS, walk } from './helpers';

test('tills and sows a seasonal bed, reads the cottage calendar, and keeps it all after reload', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await expect(page.locator('.season')).toContainText('Spring 1 · Year 1');

  await walk(page, -6, 5);
  await page.getByRole('button', { name: /^Buy turnip seeds · 2 coins/ }).click();
  await expect(page.getByRole('button', { name: /^Buy sunberry seeds/ })).toContainText(
    'summer & autumn',
  );
  await walk(page, ...SPOTS.secondBed);
  await expect(page.locator('.interaction-copy')).toContainText('Garden bed 2 · overgrown');
  await page.getByRole('button', { name: /^Till the soil/ }).click();
  await expect(page.getByRole('button', { name: /^Plant garden sunberries/ })).toBeDisabled();
  await page.getByRole('button', { name: /^Plant crisp turnips/ }).click();
  await page.getByRole('button', { name: /^Water the garden bed/ }).click();
  await expect(page.locator('.interaction-copy')).toContainText('Crisp turnips are growing');
  await page.screenshot({ path: info.outputPath('garden-beds.png'), fullPage: true });

  await walk(page, -4.2, -2);
  await page.getByRole('button', { name: /^Step inside/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Inside your cottage');
  await walk(page, 0.2, -2.4);
  await page.getByRole('button', { name: 'Read the calendar' }).click();
  const calendar = page.getByRole('dialog');
  await expect(calendar).toContainText('The household calendar');
  await expect(calendar).toContainText('Spring 1, Year 1');
  await expect(calendar.locator('[aria-current="date"]')).toHaveText('1');
  await expect(calendar.locator('.calendar-season li')).toHaveCount(120);
  await expect(calendar).toContainText('Crisp turnips ready · bed 2');
  await page.screenshot({ path: info.outputPath('calendar.png'), fullPage: true });
  await calendar.getByRole('button', { name: 'Back to the cottage' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.location-tag')).toContainText('Inside your cottage');
  const inside = await developmentState(page);
  expect(inside.companionIndoors).toBe(true);
  expect(inside.flags).toContain('checked-calendar');
  await walk(page, 1.6, 3.8);
  await page.getByRole('button', { name: /^Back out to the yard/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Bramblewick Yard');
  await expect
    .poll(async () => {
      const saved = await savedState(page);
      return [saved.areaId, saved.plots[1].tilled, saved.plots[1].crop?.speciesId];
    })
    .toEqual(['homestead', true, 'turnip']);
  const outside = await developmentState(page);
  expect(outside.totalMinutes).toBeGreaterThan(inside.totalMinutes);
  expect(errors).toEqual([]);
});
