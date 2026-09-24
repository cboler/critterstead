import { expect, test, type Page } from '@playwright/test';
import type { GameState } from '../src/app/game/model';

test('opens a responsive, playable homestead without runtime errors', async ({
  page,
}, testInfo) => {
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
  await page.getByRole('button', { name: /Field journal/ }).click();
  await expect(page.getByRole('button', { name: 'Close panel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume game', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume game', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('homestead.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('keeps the desktop world, goals, and satchel in one viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop layout is checked at desktop sizes.');
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.world-canvas canvas')).toBeVisible();
    const dimensions = await page.evaluate(() => {
      const rail = document.querySelector('.side-rail')!;
      return {
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        railHeight: rail.clientHeight,
        railContentHeight: rail.scrollHeight,
      };
    });
    expect(
      dimensions.documentWidth,
      `${viewport.width}×${viewport.height} width`,
    ).toBeLessThanOrEqual(viewport.width);
    expect(
      dimensions.documentHeight,
      `${viewport.width}×${viewport.height} height`,
    ).toBeLessThanOrEqual(viewport.height);
    expect(
      dimensions.railContentHeight,
      `${viewport.width}×${viewport.height} side rail`,
    ).toBeLessThanOrEqual(dimensions.railHeight);
    await expect(page.locator('.recent-note')).toBeInViewport();
    await expect(page.locator('.satchel-bar')).toBeInViewport();
  }
});

test('keeps care and day progression across a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await page.getByRole('button', { name: /Give a little scritch/ }).click();
  await expect(page.getByRole('button', { name: /Give a little scritch/ })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: /Give a little scritch/ })).toBeDisabled();
  await page.keyboard.press('Backquote');
  await expect(page.getByText('Developer field kit', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Advance one day', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(page.getByRole('button', { name: /Give a little scritch/ })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('button', { name: /Give a little scritch/ })).toBeEnabled();
  await expect(page.locator('body')).toContainText(/Day\s+2/);
});

// Read precise development state without changing it; walking still uses real key input.
interface DebugGameWindow extends Window {
  ng?: {
    getComponent(element: Element): {
      state(): GameState;
    };
  };
}

async function developmentState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const root = document.querySelector('app-root');
    const game = root && (window as DebugGameWindow).ng?.getComponent(root);
    if (!game) throw new Error('Angular development diagnostics are unavailable.');
    return game.state();
  });
}

async function position(page: Page): Promise<{ x: number; z: number }> {
  return (await developmentState(page)).player.position;
}

async function walk(page: Page, x: number, z: number): Promise<void> {
  const directions = [
    { keys: ['w'], x: -0.6, z: -0.8 },
    { keys: ['s'], x: 0.6, z: 0.8 },
    { keys: ['a'], x: -0.8, z: 0.6 },
    { keys: ['d'], x: 0.8, z: -0.6 },
    { keys: ['w', 'a'], x: -1.4 / Math.SQRT2, z: -0.2 / Math.SQRT2 },
    { keys: ['w', 'd'], x: 0.2 / Math.SQRT2, z: -1.4 / Math.SQRT2 },
    { keys: ['s', 'a'], x: -0.2 / Math.SQRT2, z: 1.4 / Math.SQRT2 },
    { keys: ['s', 'd'], x: 1.4 / Math.SQRT2, z: 0.2 / Math.SQRT2 },
  ];
  for (let attempt = 0; attempt < 24; attempt++) {
    const current = await position(page);
    const dx = x - current.x;
    const dz = z - current.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.8) return;
    const direction = [...directions].sort(
      (a, b) => b.x * dx + b.z * dz - (a.x * dx + a.z * dz),
    )[0];
    for (const key of direction.keys) await page.keyboard.down(key);
    // Ease near a destination so frame timing cannot make us overshoot it.
    await page.waitForTimeout(Math.min(650, (distance / 4) * (distance < 3 ? 400 : 1000)));
    for (const key of direction.keys) await page.keyboard.up(key);
  }
  throw new Error(`Could not walk to ${x}, ${z}; observed ${JSON.stringify(await position(page))}`);
}

async function activity(page: Page, name: RegExp): Promise<void> {
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
    await page.getByRole('button', { name }).click();
    if (beat < 2)
      await expect(page.locator('.training-footer')).toContainText(`${beat + 1} / 3 beats`);
    await page.waitForTimeout(350);
  }
  await expect(page.locator('.training-card')).toHaveCount(0);
}

test('plays a complete day and keeps the improved homestead after reload', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'The complete keyboard scenario runs at desktop size.',
  );
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await page.getByRole('button', { name: /Give a little scritch/ }).click();
  await page.getByRole('button', { name: /Offer feed/ }).click();
  await walk(page, 3, 2);
  await page.getByRole('button', { name: /Practice hoops/ }).click();
  await activity(page, /Hop, Pip!/);
  await expect(page.locator('.intentions li').nth(1)).toHaveClass(/done/);
  await walk(page, -5, 2);
  await page.getByRole('button', { name: /Plant feed seeds/ }).click();
  await page.getByRole('button', { name: /Water the garden/ }).click();
  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Clover Glade');
  for (const [x, z] of [
    [-3, -2],
    [-1, 2.5],
    [1, -4],
  ]) {
    await walk(page, x, z);
    await page.getByRole('button', { name: /^Gather ·/ }).click();
  }
  await expect(page.locator('.learning')).toContainText('Harvests on cue');
  for (const [x, z] of [
    [2, 0],
    [5, -1.5],
  ]) {
    await walk(page, x, z);
    await page.getByRole('button', { name: /^Ask Pip to gather/ }).click();
  }
  await expect(page.locator('.learning')).toContainText('Independent forager');
  await walk(page, 4, 4.5);
  await expect(page.locator('.recent-note')).toContainText(/All on her own, Pip/);
  await page.screenshot({ path: testInfo.outputPath('independent-forager.png'), fullPage: true });
  await walk(page, -8, 0);
  await page.getByRole('button', { name: /Return to Bramblewick/ }).click();
  await walk(page, -6, 5);
  await page.getByRole('button', { name: /^Sell berries/ }).click();
  await walk(page, 4, -2);
  await page.getByRole('button', { name: /Make it cozy/ }).click();
  await expect(page.locator('.intentions li').nth(3)).toHaveClass(/done/);
  await walk(page, -5, 2);
  await page.getByRole('button', { name: /^Harvest · 3 feed/ }).click();
  await walk(page, 2, 6);
  await page.getByRole('button', { name: /Run the trial/ }).click();
  await activity(page, /Cheer!/);
  await expect(page.getByRole('button', { name: /Run the trial/ })).toBeDisabled();
  await walk(page, -4, -2);
  await page.getByRole('button', { name: /Turn in for the night/ }).click();
  await expect(page.locator('.season')).toContainText('Day 2');
  await page.reload();
  await expect(page.locator('.season')).toContainText('Day 2');
  await expect(page.locator('.learning')).toContainText('Independent forager');
  await page.getByRole('button', { name: /Field journal/ }).click();
  await expect(page.locator('.journal-summary')).toContainText('Shed level 1');
  await expect(page.getByText('Clover Cup memories', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('day-two.png'), fullPage: true });
  expect(errors).toEqual([]);
});
