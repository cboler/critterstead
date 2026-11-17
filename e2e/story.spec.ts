import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/app/game/host';
import { activeCritter, type GameState } from '../src/app/game/model';
import { KEEPSAKES, STORY } from '../src/app/game/story';
import { PACE, savedState, seedSave } from './helpers';

/** A household the morning after the funeral, with the scenes of the rest of the story due. */
function afterGrandpa(queue: string[]): GameState {
  const state = createInitialState();
  const passed = (STORY.lastSummerYear - 1) * 120 + 61;
  state.day = passed + STORY.mourningDays;
  state.totalMinutes = (state.day - 1) * 1440 + state.minute;
  state.critters.forEach((critter) => (critter.drills.day = state.day));
  state.story = { passedDay: passed, queue, seen: [], keepsakes: KEEPSAKES.map((item) => item.id) };
  return state;
}

/** Continues a scene until a beat's text shows, on whichever card is up. */
async function readUntil(page: Page, text: string | RegExp): Promise<void> {
  const cards = page.locator('.tale-card, .tale-letter, .tale-title');
  for (let beat = 0; beat < 40; beat++) {
    if (await cards.filter({ hasText: text }).count()) return;
    await cards.locator('button.primary').click();
  }
  throw new Error(`The scene never reached: ${String(text)}`);
}

test('tells of Grandpa’s passing, the letter and the title, then rolls the credits', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const state = afterGrandpa(['the-passing', 'keepsake-letter', 'grand-champion', 'credits']);
  activeCritter(state).ladder = { rank: 4, points: 0 };
  await seedSave(page, state);
  await page.goto('/');

  // The first morning of autumn: in the cottage, then the glade, with the HUD put away.
  const card = page.locator('.tale-card');
  await expect(card).toContainText('You wake by yourself');
  await expect(page.locator('.location-tag')).toContainText('Inside your cottage');
  await expect(page.locator('.interaction-dock')).toHaveCount(0);
  await readUntil(page, 'They bury him on the third day');
  await expect(page.locator('.location-tag')).toContainText('Clover Glade');
  await page.screenshot({ path: info.outputPath('the-glade.png'), fullPage: true });
  // The keyboard continues a scene too.
  await page.keyboard.press('Enter');
  await expect(card).toContainText('All of Oakhaven walks up the lane');
  await readUntil(page, 'Pip knows them both by heart');
  await page.screenshot({ path: info.outputPath('autumn.png'), fullPage: true });
  await page.locator('.tale-title button.primary').click();

  // The next scene follows by itself: Pip in the chair, and the letter kept for winter.
  await expect(card).toContainText('Pip does something he has never done');
  await readUntil(page, 'I bought the years for Pip instead');
  await page.screenshot({ path: info.outputPath('the-letter.png'), fullPage: true });
  await readUntil(page, 'Shoes on, sleepyhead.');
  await expect(page.locator('.tale-letter')).toContainText('Mallow');
  // Escape leaves a scene; it counts as seen.
  await page.keyboard.press('Escape');

  await expect(card).toContainText('The last leg ends');
  await expect(page.locator('.location-tag')).toContainText('The Colosseum grounds');
  await readUntil(page, 'Pip falls in at your heel');
  await page.screenshot({ path: info.outputPath('the-east-road.png'), fullPage: true });
  await readUntil(page, 'The turnips will want judging soon');
  await card.locator('button.primary').click();

  const credits = page.locator('.credits');
  await expect(credits).toContainText('Mallow · Grand Champion');
  await expect(credits).toContainText('Where the path gives out');
  await page.screenshot({ path: info.outputPath('credits.png'), fullPage: true });
  await credits.getByRole('button', { name: 'Back to Bramblewick' }).click();
  await expect(credits).toHaveCount(0);

  // The stead goes on: the world is back, everything is saved as seen, and stays seen.
  await expect(page.locator('.location-tag')).toContainText('Bramblewick Yard');
  await expect
    .poll(async () => (await savedState(page)).story)
    .toMatchObject({
      queue: [],
      seen: ['the-passing', 'keepsake-letter', 'grand-champion', 'credits'],
    });
  await page.reload();
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await expect(page.locator('.tale-card')).toHaveCount(0);

  // The journal keeps the keepsakes, and lets a scene be read again without changing anything.
  await page.getByRole('button', { name: /Field journal/ }).click();
  const journal = page.getByRole('dialog');
  await journal.getByRole('tab', { name: 'Story', exact: true }).click();
  await expect(journal).toContainText('The letter in the chess book');
  await journal.getByRole('button', { name: 'His chair' }).click();
  await expect(card).toContainText('Pip does something he has never done');
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  expect((await savedState(page)).story.seen).toHaveLength(4);
  expect(errors).toEqual([]);
});
