import { expect, Page, test } from '@playwright/test';
import { createInitialState } from '../src/app/game/host';
import { activeCritter, type GameState } from '../src/app/game/model';
import { developmentState, takeStarterHome } from './helpers';

async function readSave(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('critterstead', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const request = database
          .transaction('saves', 'readonly')
          .objectStore('saves')
          .get('homestead');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
}

async function seedSave(page: Page, value: unknown): Promise<void> {
  // A same-origin static document lets us set a damaged-record fixture before the app starts.
  await page.goto('/icons/critterstead.svg');
  await page.evaluate(async (save) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('critterstead', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('saves');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('saves', 'readwrite');
        transaction.objectStore('saves').put(save, 'homestead');
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }, value);
}

test('a second tab cannot overwrite the active homestead, and can resume after its owner closes', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await takeStarterHome(page);
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  const care = page.getByRole('button', { name: /Give a little scritch/ });
  await care.click();
  await expect(care).toBeDisabled();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect.poll(async () => JSON.stringify(await readSave(page))).toContain('petted-today');
  const saved = await readSave(page);

  const second = await context.newPage();
  await second.goto('/');
  await expect(second.getByRole('alert')).toContainText('open in another tab');
  await expect(second.locator('.world-canvas canvas')).toHaveCount(0);
  await expect(second.getByRole('button', { name: 'Open save tools', exact: true })).toHaveCount(0);
  await second.getByRole('button', { name: 'Pause game', exact: true }).click();
  expect(await readSave(second)).toEqual(saved);

  await page.close();
  await expect
    .poll(() =>
      second.evaluate(async () =>
        (await navigator.locks.query()).held?.some(
          (lock) => lock.name === 'critterstead-active-game',
        ),
      ),
    )
    .toBe(false);
  await second.reload();
  await expect(second.locator('.world-canvas canvas')).toBeVisible();
  await expect(second.getByRole('alert')).toHaveCount(0);
  await expect(second.getByRole('button', { name: /Give a little scritch/ })).toBeDisabled();
  await second.close();
});

const retired = { ...createInitialState(), version: 13 };
const badSelection = createInitialState();
badSelection.activeCritterId = 'missing-companion';
const damaged = createInitialState();
activeCritter(damaged).stamina = -1;
const damagedLearning = createInitialState();
Object.assign(activeCritter(damagedLearning).learnedBehaviors, { 'unknown-job': 7 });

for (const fixture of [
  {
    name: 'newer',
    value: { version: 999, precious: 'preserve-this-homestead' },
    message: 'Unsupported save version 999',
  },
  { name: 'damaged', value: damaged, message: 'saved homestead is damaged' },
  { name: 'retired', value: retired, message: 'earlier build of Critterstead' },
  {
    name: 'unknown learned behavior',
    value: damagedLearning,
    message: 'saved homestead is damaged',
  },
  {
    name: 'invalid companion reference',
    value: badSelection,
    message: 'saved homestead is damaged',
  },
]) {
  test(`keeps a ${fixture.name} save intact until the player deliberately resets it`, async ({
    page,
  }) => {
    await seedSave(page, fixture.value);
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(fixture.message);
    await expect(page.locator('.save-state')).toContainText('Save needs attention');

    // User interactions and an attempted save must not replace the rejected record.
    await page.getByRole('button', { name: 'Open save tools', exact: true }).click();
    await page.getByRole('button', { name: 'Save now', exact: true }).click();
    expect(await readSave(page)).toEqual(fixture.value);
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('alert')).toContainText(fixture.message);
    expect(await readSave(page)).toEqual(fixture.value);

    await page.getByRole('button', { name: 'Open save tools', exact: true }).click();
    await page.getByRole('button', { name: 'Reset saved game', exact: true }).click();
    expect(await readSave(page)).toEqual(fixture.value);
    await page.getByRole('button', { name: 'Confirm: erase this homestead', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    // A reset opens the starter offer; nothing is written until a critter is chosen.
    await expect.poll(() => readSave(page)).toBeUndefined();
    await takeStarterHome(page);
    await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(14);
    await page.reload();
    await expect(page.locator('.world-canvas canvas')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('starts a new homestead from How to play, without developer keys', async ({ page }) => {
  await page.goto('/');
  await takeStarterHome(page);
  await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(14);
  const before = (await readSave(page)) as GameState;

  // A phone has no backtick key: the reset lives behind the ? button.
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new homestead', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my homestead', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Confirm: erase this homestead', exact: true }),
  ).toHaveCount(0);
  expect(((await readSave(page)) as GameState).seed).toBe(before.seed);

  await page.getByRole('button', { name: 'Start a new homestead', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm: erase this homestead', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => readSave(page)).toBeUndefined();
  await takeStarterHome(page);
  await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(14);
});
