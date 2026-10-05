import { expect, test, type Page } from '@playwright/test';
import { type GameState } from '../src/app/game/model';
import { developmentState } from './helpers';

// A standard-mapping gamepad fixture exercises the same browser polling path as a physical pad.
async function button(page: Page, index: number): Promise<void> {
  // Hold each edge across rendered frames so a slow software GPU cannot miss it.
  for (const pressed of [true, false]) {
    await page.evaluate(
      async ({ index, pressed }) => {
        (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad.buttons[
          index
        ].pressed = pressed;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      },
      { index, pressed },
    );
  }
}

test('standard controller moves, chooses actions, and navigates menus', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Controller navigation is checked at desktop size.',
  );
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const axes = [0, 0, 0, 0];
    const pad = {
      id: 'Test standard controller',
      index: 0,
      connected: true,
      mapping: 'standard',
      buttons,
      axes,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    (window as unknown as { testPad: { buttons: typeof buttons; axes: number[] } }).testPad = {
      buttons,
      axes,
    };
  });
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await button(page, 9); // Start: skip the walk to the choice
  await button(page, 0); // A: take the focused starter, Mallow, home
  await expect(page.locator('.starter-offer')).toHaveCount(0);
  await expect(page.locator('.movement-hint')).toContainText('Controller connected');
  await button(page, 0); // A: first nearby action
  await expect(page.getByRole('button', { name: /Give a little scritch/ })).toBeDisabled();
  await button(page, 15); // D-pad right: choose feed
  await expect(page.getByRole('button', { name: /Offer feed/ })).toHaveClass(/pad-selected/);
  await button(page, 0);
  await expect(page.locator('.inventory-items')).toContainText('3');

  await button(page, 3); // Y: journal
  await expect(page.getByRole('dialog')).toBeVisible();
  await button(page, 1); // B: back
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await button(page, 2); // X: help
  await expect(page.getByRole('dialog')).toContainText('left stick to move');
  await button(page, 13); // D-pad down: focus primary help action
  await expect(page.getByRole('button', { name: /Let’s meet Mallow/ })).toHaveClass(/pad-selected/);
  await button(page, 0); // A: activate focused help action
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await button(page, 9); // Menu: pause
  await expect(page.getByRole('button', { name: 'Resume game' })).toBeVisible();
  await button(page, 9);
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeVisible();

  await page.keyboard.press('Backquote');
  const before = await page.locator('dl dd').nth(1).innerText();
  await button(page, 1);
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 1;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 0;
  });
  await page.keyboard.press('Backquote');
  const after = await page.locator('dl dd').nth(1).innerText();
  expect(after).not.toBe(before);
});

test('controller leans on the balance beam and double jumps on the hurdle run', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Controller drills are checked at desktop size.');
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const axes = [0, 0, 0, 0];
    const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', buttons, axes };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    (window as unknown as { testPad: typeof pad }).testPad = pad;
  });
  await page.goto('/');
  await button(page, 9);
  await button(page, 0);
  await expect(page.locator('.starter-offer')).toHaveCount(0);
  // Straight to a station in the glade; walking there is covered elsewhere.
  const goTo = (x: number, z: number) =>
    page.evaluate(
      ({ x, z }) => {
        const game = (
          window as unknown as {
            ng: { getComponent(element: Element): { host: { state: GameState } } };
          }
        ).ng.getComponent(document.querySelector('app-root')!);
        const state = game.host.state;
        state.training = null;
        state.areaId = 'glade';
        state.player.position = { x, z };
      },
      { x, z },
    );
  const training = () => developmentState(page).then((state) => state.training);
  const hold = (index: number, pressed: boolean) =>
    page.evaluate(
      ({ index, pressed }) => {
        (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad.buttons[
          index
        ].pressed = pressed;
      },
      { index, pressed },
    );

  await goTo(2.7, 2.9);
  await expect(page.locator('.interaction-dock')).toContainText('Balance beam');
  await button(page, 0); // A: the first action, the beam itself
  await expect(page.getByRole('meter', { name: 'Balance' })).toBeVisible();
  const start = (await training())!.meter!;
  await hold(15, true); // D-pad right leans right while held.
  await expect.poll(async () => (await training())?.meter ?? 0).toBeGreaterThan(start + 0.1);
  await hold(15, false);
  const leaned = (await training())!.meter!;
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = -1;
  });
  await expect.poll(async () => (await training())?.meter ?? 1).toBeLessThan(leaned - 0.1);
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 0;
  });

  await goTo(-4.6, 2.7);
  await expect(page.locator('.interaction-dock')).toContainText('Hurdle run');
  await button(page, 0);
  await expect(page.getByRole('img', { name: /^Hurdle run:/ })).toBeVisible();
  await expect.poll(async () => (await training())?.elapsed ?? 0).toBeGreaterThan(0.1);
  // A, then A again in the air, pressed within a few frames so a slow frame cannot land the
  // first jump in between.
  const jumps = await page.evaluate(async () => {
    const game = (
      window as unknown as {
        ng: { getComponent(element: Element): { host: { state: GameState } } };
      }
    ).ng.getComponent(document.querySelector('app-root')!);
    const pad = (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const training = () => game.host.state.training!;
    const press = async () => {
      // Two frames each way, so the polling frame sees both edges whatever the order.
      pad.buttons[0].pressed = true;
      await frame();
      await frame();
      pad.buttons[0].pressed = false;
      await frame();
      await frame();
      return training().stage ?? 0;
    };
    while (training().stage !== 0 || training().elapsed - (training().lastHitAt ?? 0) < 0.1)
      await frame();
    const first = await press();
    const pressed = training().elapsed;
    while (training().elapsed - pressed < 0.1) await frame();
    return [first, await press()];
  });
  expect(jumps).toEqual([1, 2]);
});

test('controller steps rhythm lanes and cheers and shoos at the chessboard', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Controller drills are checked at desktop size.');
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const axes = [0, 0, 0, 0];
    const pad = { id: 'Test pad', index: 0, connected: true, mapping: 'standard', buttons, axes };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    (window as unknown as { testPad: typeof pad }).testPad = pad;
  });
  await page.goto('/');
  await button(page, 9);
  await button(page, 0);
  await expect(page.locator('.starter-offer')).toHaveCount(0);
  // Straight into the cottage with Mallow; walking there is covered elsewhere.
  const goTo = (x: number, z: number) =>
    page.evaluate(
      ({ x, z }) => {
        const game = (
          window as unknown as {
            ng: { getComponent(element: Element): { host: { state: GameState } } };
          }
        ).ng.getComponent(document.querySelector('app-root')!);
        const state = game.host.state;
        state.training = null;
        state.areaId = 'cottage';
        state.areaInstanceId = 'local-cottage';
        state.companionIndoors = true;
        state.player.position = { x, z };
      },
      { x, z },
    );
  const training = () => developmentState(page).then((state) => state.training);

  await goTo(-1.2, 1.2);
  await expect(page.locator('.interaction-dock')).toContainText('Rhythm steps');
  await button(page, 0); // A: the first action, the drill itself
  await expect(page.getByRole('img', { name: /^Rhythm steps:/ })).toBeVisible();
  await expect.poll(async () => (await training())?.elapsed ?? 0).toBeGreaterThan(0.2);
  // D-pad left steps in the left lane; with no note near, it is a stray step.
  await button(page, 14);
  await expect.poll(async () => (await training())?.lastHitAt ?? 0).toBeGreaterThan(0);
  expect((await training())!.reserve).toBeLessThan(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await goTo(2.6, 1.4);
  await expect(page.locator('.interaction-dock')).toContainText('Chess puzzles');
  await button(page, 0);
  await expect(page.locator('.chess-moment')).toBeVisible();
  // Before the first idea (1.5 s in), B shoos at nothing and A cheers at nothing: each costs
  // focus. Pressed from inside the page, so a slow runner still presses before the idea.
  const focus = await page.evaluate(async () => {
    const game = (
      window as unknown as {
        ng: { getComponent(element: Element): { host: { state: GameState } } };
      }
    ).ng.getComponent(document.querySelector('app-root')!);
    const pad = (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const training = () => game.host.state.training!;
    const press = async (index: number) => {
      while (training().elapsed - (training().lastHitAt ?? 0) < 0.1) await frame();
      pad.buttons[index].pressed = true;
      await frame();
      await frame();
      pad.buttons[index].pressed = false;
      await frame();
      await frame();
      return training().reserve;
    };
    return [await press(1), await press(0), training().elapsed];
  });
  expect(focus[2]).toBeLessThan(1.5);
  expect(focus[0]).toBeCloseTo(0.9);
  expect(focus[1]).toBeCloseTo(0.75);
});
