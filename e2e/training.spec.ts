import { expect, test, type Page } from '@playwright/test';
import { activeCritter, type GameState } from '../src/app/game/model';
import { developmentState, PACE, savedState, SPOTS, walk } from './helpers';

interface GameWindow {
  ng: { getComponent(element: Element): { state(): GameState } };
}

/**
 * Taps Space on every frame the gauge sits below the target, until the activity ends.
 * Tapping from inside the page keeps pace with the frame rate, however slow rendering is.
 */
async function holdGauge(page: Page, target: number): Promise<void> {
  const finished = await page.evaluate(
    (goal) =>
      new Promise<boolean>((resolve) => {
        const game = (window as unknown as GameWindow).ng.getComponent(
          document.querySelector('app-root')!,
        );
        const deadline = performance.now() + 60_000;
        const frame = (): void => {
          const training = game.state().training;
          if (!training) return resolve(true);
          if (performance.now() > deadline) return resolve(false);
          if ((training.meter ?? 0) < goal)
            for (const type of ['keydown', 'keyup'])
              window.dispatchEvent(new KeyboardEvent(type, { key: ' ', code: 'Space' }));
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    target,
  );
  if (!finished) throw new Error('The gauge activity did not finish.');
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
  test.setTimeout(240_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
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
