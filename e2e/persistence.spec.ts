import { expect, Page, test } from '@playwright/test';
import { createInitialState } from '../src/app/game/host';

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

const damaged = createInitialState();
damaged.critter.stamina = -1;

for (const fixture of [
  {
    name: 'newer',
    value: { version: 999, precious: 'preserve-this-homestead' },
    message: 'Unsupported save version 999',
  },
  { name: 'damaged', value: damaged, message: 'saved homestead is damaged' },
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
    await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(1);
    await page.reload();
    await expect(page.locator('.world-canvas canvas')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}
