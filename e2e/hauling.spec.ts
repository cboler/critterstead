import { expect, test } from '@playwright/test';
import { createInitialState } from '../src/app/game/host';
import { addItem } from '../src/app/game/logistics';
import { activeCritter } from '../src/app/game/model';
import { developmentState, savedState, seedSave, walk } from './helpers';

test('teaches the whole hauling route, cues it, then watches independent deliveries across reload', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000);
  // Focused fixture supplies the mill, but grants no learning or completed route.
  // M5's separate fresh-start journey verifies gathering and delivering the inputs.
  const state = createInitialState();
  addItem(
    state.containers.find((item) => item.kind === 'mill-input')!,
    'timber',
    4,
  );
  addItem(
    state.containers.find((item) => item.kind === 'mill-output')!,
    'lumber',
    2,
  );
  await seedSave(page, state);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  for (let lesson = 1; lesson <= 2; lesson++) {
    await walk(page, 6.5, 1);
    await expect
      .poll(async () => {
        const current = await developmentState(page);
        const companion = activeCritter(current);
        return Math.hypot(companion.position.x - 6.5, companion.position.z - 1);
      })
      .toBeLessThan(4);
    await page.getByRole('button', { name: /^Take 1 lumber/ }).click();
    await walk(page, -1, 4);
    await page.getByRole('button', { name: /^Store 1 lumber/ }).click();
    await expect
      .poll(
        async () => activeCritter(await developmentState(page)).learnedBehaviors['lumber-hauling'],
      )
      .toBe(lesson);
  }
  await expect(page.locator('.hauling-status')).toContainText('Hauls on cue');
  await page.screenshot({ path: info.outputPath('route-learned.png'), fullPage: true });
  await page.getByRole('button', { name: /^Ask Mallow to haul a board/ }).click();
  await expect
    .poll(async () => activeCritter(await savedState(page)).hauling.phase)
    .toBe('deliver');
  await page.reload();
  await expect
    .poll(
      async () => activeCritter(await developmentState(page)).learnedBehaviors['lumber-hauling'],
    )
    .toBe(4);
  await page.getByRole('button', { name: /^Ask Mallow to haul a board/ }).click();
  await expect(page.locator('.hauling-status')).toContainText('Independent hauler', {
    timeout: 15000,
  });
  // The rancher stays here; output continues to leave the mill and reach the chest.
  await expect
    .poll(
      async () =>
        (await developmentState(page)).containers
          .find((item) => item.kind === 'chest')!
          .items.find((item) => item.itemId === 'lumber')?.quantity,
      { timeout: 45000 },
    )
    .toBeGreaterThanOrEqual(6);
  await page.screenshot({ path: info.outputPath('independent-deliveries.png'), fullPage: true });
  await page.getByRole('button', { name: /^Follow me/ }).click();
  await expect.poll(async () => activeCritter(await savedState(page)).hauling.enabled).toBe(false);
  await page.reload();
  await expect(page.locator('.hauling-status')).toContainText('Following you');
  expect(errors).toEqual([]);
});

test('an independent worker visibly waits for feed, eats locally, and rests before resuming', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop');
  test.setTimeout(60000);
  const state = createInitialState();
  const critter = activeCritter(state);
  critter.learnedBehaviors['lumber-hauling'] = 6;
  critter.hauling.enabled = true;
  critter.hunger = 85;
  critter.stamina = 1;
  state.player.position = { x: 6.5, z: -2 };
  await seedSave(page, state);
  await page.goto('/');
  await expect(page.locator('.hauling-status')).toContainText('trough is empty');
  await page.getByRole('button', { name: /^Store 1 feed/ }).click();
  await expect(page.locator('.hauling-status')).toContainText('Taking a break');
  await expect
    .poll(async () => activeCritter(await developmentState(page)).stamina)
    .toBeGreaterThan(11);
  await page.screenshot({ path: info.outputPath('worker-resting.png'), fullPage: true });
  expect(
    (await developmentState(page)).containers.find((item) => item.kind === 'trough')!.items,
  ).toEqual([]);
});
