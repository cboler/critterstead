import { expect, test, type Page } from '@playwright/test';
import { activeCritter } from '../src/app/game/model';
import { developmentState, savedState, walk } from './helpers';

/** Tap Space whenever the gauge drops below the target, until the activity ends. */
async function holdGauge(page: Page, target: number): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const training = (await developmentState(page)).training;
    if (!training) return;
    if ((training.meter ?? 0) < target) await page.keyboard.press('Space');
    else await page.waitForTimeout(40);
  }
  throw new Error('The gauge activity did not finish.');
}

async function sprint(page: Page): Promise<void> {
  for (let beat = 0; beat < 3; beat++) {
    await expect
      .poll(
        async () => {
          const training = (await developmentState(page)).training;
          return (
            !!training &&
            training.elapsed - (training.lastHitAt ?? 0) > 0.35 &&
            training.phase > 0.3 &&
            training.phase < 0.7
          );
        },
        { timeout: 15_000, intervals: [50] },
      )
      .toBe(true);
    await page.getByRole('button', { name: /Sprint!/ }).click();
    await page.waitForTimeout(350);
  }
}

test('trains strength with fading repeat gains, then earns a Colosseum exhibition medal', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();

  await walk(page, 5.2, 5.6);
  const start = activeCritter(await developmentState(page)).stats.strength;
  await page.getByRole('button', { name: /^Boulder lift · 25 Mallow energy/ }).click();
  await expect(page.locator('.training-card')).toContainText('Steady strength');
  await expect(page.getByRole('meter', { name: 'Force gauge' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('boulder-lift.png'), fullPage: true });
  await holdGauge(page, 0.62);
  const lifted = activeCritter(await developmentState(page));
  expect(lifted.stats.strength).toBeGreaterThan(start + 0.5);
  expect(lifted.drills.sessions).toEqual({ lift: 1 });
  await expect(page.getByRole('button', { name: /^Boulder lift/ })).toContainText(
    '55% gains today',
  );

  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  await walk(page, 7, -3.8);
  await page.getByRole('button', { name: /^Walk to the Colosseum · 15 min/ }).click();
  await expect(page.locator('.location-tag')).toContainText('The Colosseum grounds');
  await walk(page, -3, 1.9);
  await page.getByRole('button', { name: /^Enter the exhibition/ }).click();
  await expect(page.locator('.training-card')).toContainText('Sprint for the crowd!');
  await sprint(page);
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
