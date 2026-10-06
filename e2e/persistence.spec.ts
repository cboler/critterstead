import { backpack } from '../src/app/game/model';
import { expect, Page, test } from '@playwright/test';
import { createInitialState } from '../src/app/game/host';
import { activeCritter, type GameState } from '../src/app/game/model';
import { legacyV1 } from '../src/app/game/fixtures/legacy-v1';
import { legacyV2 } from '../src/app/game/fixtures/legacy-v2';
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

const damagedLegacy = structuredClone(legacyV1);
damagedLegacy.critter.stamina = -1;
const badSelection = createInitialState();
badSelection.activeCritterId = 'missing-companion';
const damaged = createInitialState();
activeCritter(damaged).stamina = -1;
const damagedV2 = structuredClone(legacyV2);
damagedV2.critters[1].berryKnowledge = -1;
const damagedLearning = createInitialState();
Object.assign(activeCritter(damagedLearning).learnedBehaviors, { 'unknown-job': 7 });

for (const fixture of [
  {
    name: 'newer',
    value: { version: 999, precious: 'preserve-this-homestead' },
    message: 'Unsupported save version 999',
  },
  { name: 'damaged', value: damaged, message: 'saved homestead is damaged' },
  { name: 'damaged v1', value: damagedLegacy, message: 'saved homestead is damaged' },
  { name: 'damaged v2 learning', value: damagedV2, message: 'saved homestead is damaged' },
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
    await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(13);
    await page.reload();
    await expect(page.locator('.world-canvas canvas')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('migrates a populated v1 save, preserves Pip, and resumes paid training after reload', async ({
  page,
}) => {
  await seedSave(page, legacyV1);
  await page.goto('/');
  await expect(page.locator('.companion-card')).toContainText('Pip');
  await expect(page.locator('.companion-card')).not.toContainText('Mallow');
  await expect(page.getByRole('button', { name: /Hop, Pip!/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect.poll(async () => ((await readSave(page)) as GameState).version).toBe(13);
  const migrated = (await readSave(page)) as GameState;
  expect(migrated.activeCritterId).toBe('critter-pip');
  // Grandpa's Pip joins beside the legacy companion of the same name.
  expect(migrated.critters).toHaveLength(2);
  expect(migrated.critters[1]).toMatchObject({ name: 'Pip', ownerId: 'grandpa' });
  expect(activeCritter(migrated)).toMatchObject({
    id: 'critter-pip',
    name: 'Pip',
    ownerId: legacyV1.player.id,
    ageDays: legacyV1.critter.ageDays,
    lastPettedDay: legacyV1.day,
    stats: legacyV1.critter.stats,
    skills: legacyV1.critter.skills,
    stamina: legacyV1.critter.stamina,
    health: legacyV1.critter.health,
    learnedBehaviors: { 'sunberry-foraging': legacyV1.critter.berryKnowledge },
    history: legacyV1.critter.history,
    competitions: legacyV1.critter.competitions,
    genetics: legacyV1.critter.genetics,
    pedigree: legacyV1.critter.pedigree,
    visualTraits: legacyV1.critter.visualTraits,
  });
  expect(migrated.seed).toBe(legacyV1.seed);
  expect(migrated.player.coins).toBe(legacyV1.player.coins);
  expect(backpack(migrated).items).toEqual(legacyV1.inventory);
  // The clock runs briefly before the pause, so moist bed 1 may grow past its migrated 102.
  expect(migrated.plots[0]).toMatchObject({
    tilled: true,
    crop: { speciesId: 'feed', plantedAt: legacyV1.crop.plantedAt },
  });
  expect(migrated.plots[0].crop!.growthMinutes).toBeGreaterThanOrEqual(102);
  expect(migrated.shedLevel).toBe(1);
  expect(migrated.training).toMatchObject({
    critterId: 'critter-pip',
    hits: [0.9],
    lastHitAt: 0.65,
  });
  await page.reload();
  await expect(page.locator('.training-footer')).toContainText('1 / 3 beats');
  await page.getByRole('button', { name: /Hop, Pip!/ }).click();
  await expect(page.locator('.training-footer')).toContainText('2 / 3 beats');
  // Beats need 0.3 s of game time between them; slow frames stretch that in wall time.
  await expect
    .poll(async () => {
      const training = (await developmentState(page)).training;
      return !!training && training.elapsed - (training.lastHitAt ?? 0) > 0.35;
    })
    .toBe(true);
  await page.getByRole('button', { name: /Hop, Pip!/ }).click();
  await expect(page.locator('.training-card')).toHaveCount(0);
  await expect
    .poll(async () => activeCritter((await readSave(page)) as GameState).skills.racing)
    .toBe(7);
  const finished = (await readSave(page)) as GameState;
  expect(activeCritter(finished).stamina).toBe(legacyV1.critter.stamina);
  expect(finished.player.stamina).toBe(legacyV1.player.stamina);
  await page.reload();
  await expect(page.locator('.training-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Meet Pip');
  await expect(page.getByRole('dialog')).not.toContainText('Mallow');
});

test('migrates v2 learning without replayed rewards and explains why an independent companion waits', async ({
  page,
}, testInfo) => {
  const old = structuredClone(legacyV2);
  old.training = null;
  old.areaId = 'glade';
  old.areaInstanceId = 'local-glade';
  old.player.position = { x: -3, z: -2 };
  const selected = old.critters[1];
  selected.position = { x: -3, z: -2 };
  selected.berryKnowledge = 7;
  selected.hunger = 81;
  old.resources[0].available = true;
  await seedSave(page, old);
  await page.goto('/');
  await expect(page.locator('.learning')).toContainText('Independent forager');
  await expect(page.locator('.learning-status')).toContainText('Feed Mallow');
  await expect(page.getByRole('button', { name: /^Ask Mallow to gather/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await expect.poll(async () => ((await readSave(page)) as GameState).version).toBe(13);
  const migrated = (await readSave(page)) as GameState;
  expect(activeCritter(migrated).learnedBehaviors).toEqual({ 'sunberry-foraging': 7 });
  expect(migrated.critters[0].learnedBehaviors).toEqual({ 'sunberry-foraging': 20 });
  expect(migrated.critters[0].ownerId).toBe('grandpa');
  expect(migrated.critters[0].history).toEqual(old.critters[0].history);
  expect(backpack(migrated).items).toEqual(old.inventory);
  expect(migrated.journal).toEqual(old.journal);
  expect(migrated.seed).toBe(old.seed);
  expect(activeCritter(migrated).stamina).toBe(selected.stamina);
  await page.reload();
  await expect(page.locator('.learning-status')).toContainText('Feed Mallow');
  await page.screenshot({ path: testInfo.outputPath('learning-needs-feed.png'), fullPage: true });
  expect(backpack((await readSave(page)) as GameState).items).toEqual(old.inventory);
});

test('starts a new homestead from How to play, without developer keys', async ({ page }) => {
  await page.goto('/');
  await takeStarterHome(page);
  await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(13);
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
  await expect.poll(async () => ((await readSave(page)) as { version: number }).version).toBe(13);
});
