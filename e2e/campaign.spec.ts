import { expect, test, type Page } from '@playwright/test';
import { activeCritter, type Point } from '../src/app/game/model';
import { cues, developmentState, PACE, savedState, SPOTS, walk, takeStarterHome } from './helpers';

interface WorldWindow {
  ng: {
    getComponent(element: Element): {
      world: { screenPoint(point: Point, height: number): { x: number; y: number } };
    };
  };
}

/** Turn in at the cottage and wake to the next morning's title card. */
async function sleep(page: Page, day: number): Promise<void> {
  await walk(page, -4, -2);
  await page.getByRole('button', { name: /Turn in for the night/ }).click();
  await expect(page.locator('.morning-card')).toContainText(`Day ${day}`);
  await expect(page.locator('.day-bar')).toContainText(`Day ${day}`);
}

async function rancherOnScreen(page: Page): Promise<{ x: number; y: number }> {
  const position = (await developmentState(page)).player.position;
  return page.evaluate(
    (point) =>
      (window as unknown as WorldWindow).ng
        .getComponent(document.querySelector('app-root')!)
        .world.screenPoint(point, 1),
    position,
  );
}

test('plays three days in a row with results where you act and drills that reset', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'The multi-day walkthrough runs once, on desktop.');
  test.setTimeout(300_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  await expect(page.locator('.world-canvas canvas')).toBeVisible();

  // Day 1. A scritch's result appears just above the actions, floats over Mallow, and
  // lights up the bond in the details panel.
  await page.getByRole('button', { name: /Give a little scritch/ }).click();
  const note = page.locator('.recent-note');
  await expect(note).toContainText('bond grows');
  await expect(note).toHaveClass(/fresh/);
  await expect
    .poll(async () => {
      const noteBox = (await note.boundingBox())!;
      const dockBox = (await page.locator('.interaction-dock').boundingBox())!;
      return noteBox.y + noteBox.height <= dockBox.y + 1;
    })
    .toBe(true);
  await expect(page.locator('.world-float').filter({ hasText: '♥' })).toHaveCount(1);
  await expect(page.locator('.companion-card .care-row .changed')).toContainText('Bond');

  // The journal opens on quests; the first step of the journey is now done.
  await page.getByRole('button', { name: /Field journal/ }).click();
  const journal = page.getByRole('dialog');
  await expect(journal.getByRole('tab', { name: 'Quests' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(journal.locator('.quest-list.journey li.done')).toContainText('Say hello to Mallow');
  await expect(journal.locator('.quest-list').first()).not.toContainText('today’s scritch');
  await journal.getByRole('tab', { name: 'History' }).click();
  await expect(journal.getByRole('tabpanel', { name: 'History' })).toContainText('bond grows');
  await journal.getByRole('button', { name: 'Close panel' }).click();

  // Storage is one row per item: hand Mallow a feed to hold, and the counts follow.
  const feed = page.locator('.cargo-row').filter({ hasText: 'Feed' }).first();
  await expect(feed.locator('.cargo-count')).toHaveText(['4', '0']);
  await page.getByRole('button', { name: 'Store 1 feed', exact: true }).click();
  await expect(feed.locator('.cargo-count')).toHaveText(['3', '1']);
  await expect(page.getByRole('button', { name: 'Take 1 feed', exact: true })).toBeEnabled();

  // Learning has its own tab, with what each lesson earns.
  await page.getByRole('tab', { name: 'Learning' }).click();
  await expect(page.locator('.learning-card')).toContainText('Sunberry foraging');
  await expect(page.locator('.learning-card .lesson-effect').first()).toContainText(
    'raise the yield',
  );
  await page.getByRole('tab', { name: 'Mallow', exact: true }).click();
  await walk(page, ...SPOTS.firstBed);
  await page.getByRole('button', { name: /Plant feed seeds/ }).click();
  await page.getByRole('button', { name: /Water the garden bed/ }).click();

  // A drill's result takes its card's place; taps where its button was start nothing.
  await walk(page, 3, 2);
  await page.getByRole('button', { name: /^Practice hoops/ }).click();
  const button = (await page.getByRole('button', { name: /Hop, Mallow!/ }).boundingBox())!;
  await cues(page, /Hop, Mallow!/);
  const result = page.locator('.result-card');
  await expect(result).toContainText('PRACTICE HOOPS');
  await expect(result.locator('.result-gains')).toContainText('speed');
  for (let tap = 0; tap < 4; tap++)
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
  const drilled = activeCritter(await developmentState(page));
  expect(drilled.drills.sessions).toEqual({ hoops: 1 });
  await expect(result).toHaveCount(0, { timeout: 10_000 * PACE });
  await expect(page.getByRole('button', { name: /^Practice hoops/ })).toContainText(
    '55% gains today',
  );
  await sleep(page, 2);

  // Day 2. The drill is fresh again and the feed planted yesterday is ready.
  await walk(page, 3, 2);
  await expect(page.getByRole('button', { name: /^Practice hoops/ })).not.toContainText(
    'gains today',
  );
  await walk(page, ...SPOTS.firstBed);
  await page.getByRole('button', { name: /^Harvest · 3 feed/ }).click();
  await expect(page.locator('.world-float').filter({ hasText: 'feed' }).first()).toBeVisible();
  await sleep(page, 3);

  // Day 3. Holding the pointer on the world walks toward it; letting go stops.
  const from = (await developmentState(page)).player.position;
  const rancher = await rancherOnScreen(page);
  await page.mouse.move(rancher.x, rancher.y - 160);
  await page.mouse.down();
  await expect
    .poll(async () => {
      const now = (await developmentState(page)).player.position;
      return Math.hypot(now.x - from.x, now.z - from.z);
    })
    .toBeGreaterThan(1.5);
  await page.mouse.up();
  const stopped = (await developmentState(page)).player.position;
  await page.waitForTimeout(700);
  const after = (await developmentState(page)).player.position;
  expect(Math.hypot(after.x - stopped.x, after.z - stopped.z)).toBeLessThan(0.5);

  // All three mornings are in the journal, and the third day survives a reload.
  await expect.poll(async () => (await savedState(page)).day).toBe(3);
  await page.reload();
  await expect(page.locator('.day-bar')).toContainText('Day 3');
  const entries = (await developmentState(page)).journal.join('\n');
  expect(entries).toContain('Day 2 ·');
  expect(entries).toContain('Day 3 ·');
  expect(errors).toEqual([]);
});
