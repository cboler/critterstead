import { backpack } from '../src/app/game/model';
import { expect, test, type Page } from '@playwright/test';
import { activeCritter, type GameState } from '../src/app/game/model';
import { createInitialState } from '../src/app/game/host';
import { developmentState, PACE, savedState, SPOTS, walk } from './helpers';

test('opens a responsive, playable homestead without runtime errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Critterstead/);
  await expect(page.locator('.brand')).toContainText('Critterstead');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await expect(page.locator('.companion-card')).toContainText('Mallow');
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
  // The world fills the screen; the dock floats over it without covering the rancher.
  const canvas = await page.locator('.world-canvas canvas').boundingBox();
  const viewport = page.viewportSize()!;
  expect(canvas).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  const dock = (await page.locator('.interaction-dock').boundingBox())!;
  expect(dock.height).toBeLessThan(viewport.height * 0.6);
  await expect
    .poll(
      async () => {
        const rancher = await page.evaluate(() => {
          const root = document.querySelector('app-root')!;
          const game = (
            window as unknown as {
              ng: { getComponent(element: Element): Record<string, unknown> };
            }
          ).ng.getComponent(root) as unknown as {
            world: { screenPoint(point: { x: number; z: number }, height: number): { y: number } };
            state(): GameState;
          };
          return game.world.screenPoint(game.state().player.position, 1.7);
        });
        return rancher.y < dock.y;
      },
      { timeout: 5000 },
    )
    .toBe(true);
  for (const button of await page.locator('.interaction-actions button').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
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
    !['desktop', 'phone-portrait'].includes(testInfo.project.name),
    'The complete keyboard scenario runs at narrow and desktop sizes.',
  );
  test.setTimeout(300_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await page.getByRole('button', { name: /Give a little scritch/ }).click();
  await page.getByRole('button', { name: /Offer feed/ }).click();
  await walk(page, 3, 2);
  await page.getByRole('button', { name: /Practice hoops/ }).click();
  await activity(page, /Hop, Mallow!/);
  expect((await developmentState(page)).flags).toContain('trained');
  await walk(page, ...SPOTS.firstBed);
  await page.getByRole('button', { name: /Plant feed seeds/ }).click();
  await page.getByRole('button', { name: /Water the garden bed/ }).click();
  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Clover Glade');
  await expect(page.locator('.learning')).toContainText('Curious companion');
  let observations = 0;
  for (const [x, z] of [
    [-3, -2],
    [-1, 2.5],
    [1, -4],
  ]) {
    await walk(page, x, z);
    await expect(page.getByRole('button', { name: /^Ask Mallow to gather/ })).toBeDisabled();
    await page.getByRole('button', { name: /^Gather ·/ }).click();
    observations++;
    // Phones start with the details panel collapsed, so match the meter without visibility.
    await expect(page.locator('[role="meter"][aria-label="Sunberry foraging"]')).toHaveAttribute(
      'aria-valuenow',
      String(observations),
    );
    if (observations === 1) {
      await expect(page.locator('.learning')).toContainText('Learning by watching');
      // A new stage is announced where the player is looking, not only in the panel.
      await expect(page.locator('.milestone-card')).toContainText('Learning by watching');
      await page.screenshot({
        path: testInfo.outputPath('learning-by-watching.png'),
        fullPage: true,
      });
    }
  }
  await expect(page.locator('.learning')).toContainText('Harvests on cue');
  await page.reload();
  await expect(page.locator('.learning')).toContainText('Harvests on cue');
  for (const [x, z] of [
    [2, 0],
    [5, -1.5],
  ]) {
    await walk(page, x, z);
    await page.getByRole('button', { name: /^Ask Mallow to gather/ }).click();
  }
  await expect(page.locator('.learning')).toContainText('Independent forager');
  await walk(page, 4, 4.5);
  await expect(page.locator('.recent-note')).toContainText(/On their own, Mallow/);
  await expect(page.locator('.learning-status')).toContainText('No ripe bush nearby');
  await page.screenshot({ path: testInfo.outputPath('independent-forager.png'), fullPage: true });
  await walk(page, -8, 0);
  await page.getByRole('button', { name: /Return to Bramblewick/ }).click();
  await walk(page, -6, 5);
  await page.getByRole('button', { name: /^Sell berries/ }).click();
  await walk(page, ...SPOTS.nook);
  await page.getByRole('button', { name: /Make it cozy/ }).click();
  expect((await developmentState(page)).shedLevel).toBe(1);
  await walk(page, 2, 6);
  await expect(page.getByRole('button', { name: /Run the trial/ })).toBeDisabled();
  await expect(page.locator('.action-reason')).toContainText('rest');
  await walk(page, ...SPOTS.nook);
  const beforeRest = await developmentState(page);
  await page.screenshot({ path: testInfo.outputPath('nook-choice.png'), fullPage: true });
  await page.getByRole('button', { name: /Rest together.*120 min/ }).click();
  await expect(page.locator('.recent-note')).toContainText('Mallow regains 35');
  await expect
    .poll(async () => activeCritter(await savedState(page)).stamina)
    .toBe(activeCritter(beforeRest).stamina + 35);
  await page.reload();
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  const recovered = await developmentState(page);
  expect(recovered.day).toBe(beforeRest.day);
  expect(activeCritter(recovered).stamina).toBe(activeCritter(beforeRest).stamina + 35);
  expect(recovered.totalMinutes - beforeRest.totalMinutes).toBeGreaterThanOrEqual(120);
  expect(recovered.totalMinutes - beforeRest.totalMinutes).toBeLessThan(135);
  expect(backpack(recovered).items).toEqual(backpack(beforeRest).items);
  expect(recovered.player.coins).toBe(beforeRest.player.coins);
  await page.screenshot({ path: testInfo.outputPath('recovered.png'), fullPage: true });

  await walk(page, ...SPOTS.firstBed);
  await page.getByRole('button', { name: /^Harvest · 3 feed/ }).click();
  await walk(page, 2, 6);
  await page.getByRole('button', { name: /Run the trial/ }).click();
  await activity(page, /Cheer!/);
  await expect(page.getByRole('button', { name: /Run the trial/ })).toBeDisabled();
  await walk(page, -4, -2);
  await testInfo.attach('work-routine-before-sleep', {
    body: JSON.stringify(await developmentState(page), null, 2),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: /Turn in for the night/ }).click();
  await expect(page.locator('.season')).toContainText('Day 2');
  await expect.poll(async () => (await savedState(page)).day).toBe(2);
  await page.reload();
  await expect(page.locator('.season')).toContainText('Day 2');
  await expect(page.locator('.learning')).toContainText('Independent forager');
  await page.getByRole('button', { name: /Field journal/ }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await expect(page.locator('.journal-summary')).toContainText('Shed level 1');
  await expect(page.getByText('Competition memories', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('day-two.png'), fullPage: true });
  await testInfo.attach('work-routine-tomorrow', {
    body: JSON.stringify(await developmentState(page), null, 2),
    contentType: 'application/json',
  });
  expect(errors).toEqual([]);
});

test('preserves critter energy for a competition-oriented day by doing the harvesting yourself', async ({
  page,
}, testInfo) => {
  test.skip(!['desktop', 'phone-portrait'].includes(testInfo.project.name));
  test.setTimeout(300_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await page.getByRole('button', { name: /Give a little scritch/ }).click();
  await page.getByRole('button', { name: /Offer feed/ }).click();
  await walk(page, ...SPOTS.firstBed);
  await page.getByRole('button', { name: /Plant feed seeds/ }).click();
  await page.getByRole('button', { name: /Water the garden bed/ }).click();
  await walk(page, 3, 2);
  await expect(page.locator('.interaction-copy')).toContainText('a full tummy');
  for (let practice = 0; practice < 2; practice++) {
    await page.getByRole('button', { name: /Practice hoops.*30 Mallow.*40 min/ }).click();
    await activity(page, /Hop, Mallow!/);
  }
  const prepared = await developmentState(page);
  expect(activeCritter(prepared).stamina).toBe(40);
  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  for (const [x, z] of [
    [-3, -2],
    [-1, 2.5],
    [1, -4],
    [2, 0],
    [5, -1.5],
    [4, 4.5],
  ]) {
    await walk(page, x, z);
    await page.getByRole('button', { name: /^Gather ·/ }).click();
  }
  expect(activeCritter(await developmentState(page)).stamina).toBe(40);
  await walk(page, -8, 0);
  await page.getByRole('button', { name: /Return to Bramblewick/ }).click();
  await walk(page, -6, 5);
  await page.getByRole('button', { name: /^Sell berries/ }).click();
  await walk(page, ...SPOTS.nook);
  await page.getByRole('button', { name: /Make it cozy/ }).click();
  await walk(page, ...SPOTS.firstBed);
  await page.getByRole('button', { name: /^Harvest · 3 feed/ }).click();
  await walk(page, 2, 6);
  await page.getByRole('button', { name: /Run the trial.*35 Mallow/ }).click();
  await activity(page, /Cheer!/);
  await expect(page.locator('.recent-note')).toContainText('5 energy left');
  await walk(page, 3, 2);
  await expect(page.getByRole('button', { name: /Practice hoops/ })).toBeDisabled();
  await expect(page.locator('.action-reason')).toContainText('rest');
  await page.screenshot({ path: testInfo.outputPath('competition-choice.png'), fullPage: true });
  await walk(page, -4, -2);
  await testInfo.attach('competition-routine-before-sleep', {
    body: JSON.stringify(await developmentState(page), null, 2),
    contentType: 'application/json',
  });
  await page.getByRole('button', { name: /Turn in for the night/ }).click();
  await expect.poll(async () => (await savedState(page)).day).toBe(2);
  await page.reload();
  await expect(page.locator('.season')).toContainText('Day 2');
  const tomorrow = await developmentState(page);
  expect(activeCritter(tomorrow).stats).toEqual(activeCritter(prepared).stats);
  expect(activeCritter(tomorrow).stamina).toBe(100);
  expect(activeCritter(tomorrow).competitions).toHaveLength(1);
  expect(activeCritter(tomorrow).learnedBehaviors['sunberry-foraging']).toBe(6);
  expect(backpack(tomorrow).items.find((item) => item.itemId === 'feed')?.quantity).toBe(6);
  await testInfo.attach('competition-routine-tomorrow', {
    body: JSON.stringify(tomorrow, null, 2),
    contentType: 'application/json',
  });
  await page.screenshot({ path: testInfo.outputPath('competition-day-two.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('walks home exhausted, recovers without supplies, and feeds through ordinary gathering', async ({
  page,
}, testInfo) => {
  test.skip(!['desktop', 'phone-portrait'].includes(testInfo.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // A saved bad day is the starting fixture; subsequent progress uses only normal controls.
  const exhausted = createInitialState();
  exhausted.areaId = 'glade';
  exhausted.areaInstanceId = 'local-glade';
  exhausted.player.position = { x: -3, z: -2 };
  exhausted.player.stamina = 0;
  exhausted.player.coins = 0;
  backpack(exhausted).items = [];
  activeCritter(exhausted).position = { x: -3, z: -2 };
  activeCritter(exhausted).stamina = 0;
  activeCritter(exhausted).hunger = 100;
  activeCritter(exhausted).learnedBehaviors['sunberry-foraging'] = 7;
  await page.goto('/icons/critterstead.svg');
  await page.evaluate(async (state) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('critterstead', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('saves');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('saves', 'readwrite');
        tx.objectStore('saves').put(state, 'homestead');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }, exhausted);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Gather ·/ })).toBeDisabled();
  await expect(page.locator('.learning-status')).toContainText('Feed Mallow');
  await walk(page, -8, 0);
  await page.getByRole('button', { name: /Return to Bramblewick/ }).click();
  await walk(page, ...SPOTS.nook);
  await page.getByRole('button', { name: /Rest together/ }).click();
  await expect.poll(async () => activeCritter(await savedState(page)).stamina).toBe(35);
  await page.reload();
  await expect(page.locator('.companion-card .meter-label')).toContainText('35');
  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  await walk(page, -3, -2);
  await page.getByRole('button', { name: /^Gather ·/ }).click();
  // Step away from the bush so the companion care interaction is available.
  await walk(page, -5, -5);
  await page.getByRole('button', { name: /Berry treat/ }).click();
  await page.getByRole('button', { name: /Berry treat/ }).click();
  await expect(page.locator('.recent-note')).toContainText('+3 energy; hunger now');
  await walk(page, -1, 2.5);
  await expect(page.locator('.recent-note')).toContainText('On their own, Mallow');
  await expect(page.locator('.learning-status')).toContainText('keeping 20 energy in reserve');
  await page.screenshot({ path: testInfo.outputPath('independent-reserve.png'), fullPage: true });
  const stopped = await developmentState(page);
  // The nearest opportunity can vary with walking frames; exactly one autonomous harvest is affordable.
  expect(stopped.resources.filter((node) => !node.available)).toHaveLength(2);
  expect(activeCritter(stopped).stamina).toBe(29);
  await expect.poll(async () => activeCritter(await savedState(page)).stamina).toBe(29);
  await page.reload();
  await expect(page.locator('.learning-status')).toContainText('keeping 20 energy in reserve');
  expect(activeCritter(await developmentState(page)).stamina).toBe(29);
  expect(backpack(await developmentState(page)).items).toEqual(backpack(stopped).items);
  await walk(page, -5, -5);
  await page.getByRole('button', { name: /^Take 1 berry/ }).click();
  await page.getByRole('button', { name: /Berry treat/ }).click();
  await walk(page, -8, 0);
  await page.getByRole('button', { name: /Return to Bramblewick/ }).click();
  await walk(page, 3, 2);
  await page.getByRole('button', { name: /Practice hoops/ }).click();
  await activity(page, /Hop, Mallow!/);
  expect(activeCritter(await developmentState(page)).stats.speed).toBeGreaterThan(4);
  expect((await developmentState(page)).player.coins).toBe(0);
  expect(errors).toEqual([]);
});
