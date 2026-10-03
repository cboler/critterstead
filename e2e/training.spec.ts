import { expect, test } from '@playwright/test';
import { activeCritter } from '../src/app/game/model';
import {
  cues,
  developmentState,
  holdGauge,
  PACE,
  savedState,
  SPOTS,
  walk,
  takeStarterHome,
} from './helpers';

test('trains strength with fading repeat gains, then earns a Colosseum exhibition medal', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(240_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  await expect(page.locator('.world-canvas canvas')).toBeVisible();

  await walk(page, ...SPOTS.lift);
  const start = activeCritter(await developmentState(page)).stats.strength;
  await page.getByRole('button', { name: /^Boulder lift · 25 Mallow energy/ }).click();
  await expect(page.locator('.training-card')).toContainText('Steady strength');
  await expect(page.getByRole('meter', { name: 'Force gauge' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('boulder-lift.png'), fullPage: true });
  // One real key press proves the keyboard path; the helper then keeps the gauge up. The
  // drill ignores taps in its first 0.08 s, which slow frames can stretch past the press.
  await expect
    .poll(async () => (await developmentState(page)).training?.elapsed ?? 0)
    .toBeGreaterThan(0.1);
  await page.keyboard.press('Space');
  await expect
    .poll(async () => (await developmentState(page)).training?.lastHitAt ?? 0)
    .toBeGreaterThan(0);
  await holdGauge(page, 0.62);
  const lifted = activeCritter(await developmentState(page));
  expect(lifted.stats.strength).toBeGreaterThan(start + 0.5);
  expect(lifted.drills.sessions).toEqual({ lift: 1 });
  await expect(page.getByRole('button', { name: /^Boulder lift/ })).toContainText(
    '55% gains today',
  );

  await walk(page, -7.4, 1.2);
  await page.getByRole('button', { name: /^Walk to Oakhaven · 20 min/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Oakhaven');
  await walk(page, -7.4, 1);
  await page.getByRole('button', { name: /^Walk to the Colosseum · 10 min/ }).click();
  await expect(page.locator('.location-tag')).toContainText('The Colosseum grounds');
  await walk(page, -3, 1.9);
  await page.getByRole('button', { name: /^Enter the exhibition/ }).click();
  await expect(page.locator('.training-card')).toContainText('Sprint for the crowd!');
  await cues(page, /Sprint!/);
  await expect(page.locator('.training-card')).toContainText('Pull, Mallow, pull!');
  await holdGauge(page, 0.62);
  await expect(page.locator('.recent-note')).toContainText('The crowd roars!');
  await page.screenshot({ path: info.outputPath('exhibition-medal.png'), fullPage: true });
  await expect
    .poll(async () => activeCritter(await savedState(page)).competitions.at(-1)?.event)
    .toBe('exhibition');
  await page.reload();
  await expect(page.locator('.location-tag')).toContainText('The Colosseum grounds');
  await expect(page.getByRole('button', { name: /^Enter the exhibition/ })).toBeDisabled();
  await page.getByRole('button', { name: /Field journal/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Colosseum exhibition ·');
  expect(errors).toEqual([]);
});
