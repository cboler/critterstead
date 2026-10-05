import { expect, test } from '@playwright/test';
import { activeCritter, type GameState } from '../src/app/game/model';
import { developmentState, savedState } from './helpers';

test('walks to Oakhaven with Grandpa and Pip, meets Gemothy, and chooses a first critter', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const card = page.locator('.opening-card');
  await expect(card).toContainText('Today we walk to Oakhaven');
  await expect(page.locator('.location-tag')).toContainText('Bramblewick Yard');
  // Nothing is saved while the walk plays.
  expect(await savedState(page).catch(() => undefined)).toBeUndefined();
  const next = page.getByRole('button', { name: 'Continue' });
  await next.click();
  await next.click();
  await expect(card).toContainText('sunberry hedge');
  await expect(page.locator('.location-tag')).toContainText('Oakhaven');
  for (let beat = 0; beat < 3; beat++) await next.click();
  await expect(card).toContainText('That’s Gemothy');
  await page.screenshot({ path: info.outputPath('gemothy.png'), fullPage: true });
  // The keyboard continues too.
  await page.keyboard.press('Enter');
  await expect(card).toContainText('Folk find their partners');
  await next.click();
  await next.click();
  await expect(card).toContainText('That’s Mallow');
  await next.click();
  await expect(page.locator('.starter-offer')).toContainText('Who will you take home?');
  await expect(page.locator('.starter-offer')).toContainText('Three of them');
  await page.screenshot({ path: info.outputPath('the-choice.png'), fullPage: true });
  await page.getByRole('button', { name: 'Take Mallow home' }).click();
  await expect(page.locator('.farewell-card')).toContainText('Let’s get Mallow home');
  await expect(page.locator('.location-tag')).toContainText('Bramblewick Yard');
  const state: GameState = await developmentState(page);
  expect(state.day).toBe(1);
  expect(state.minute).toBeLessThan(500);
  expect(activeCritter(state).name).toBe('Mallow');
  await expect.poll(async () => (await savedState(page)).version).toBe(13);
  expect(errors).toEqual([]);
});
