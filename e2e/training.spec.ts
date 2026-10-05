import { expect, test } from '@playwright/test';
import { activeCritter, type GameState } from '../src/app/game/model';
import { runCourse } from '../src/app/game/drills';
import {
  crossBeam,
  danceSteps,
  doubleJump,
  cues,
  developmentState,
  holdGauge,
  PACE,
  runHurdles,
  savedState,
  sitChess,
  SPOTS,
  tossLogs,
  walk,
  takeStarterHome,
} from './helpers';

test('trains strength with fading repeat gains, then earns a Colosseum exhibition medal', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(240_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
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

  await walk(page, -7.4, 1.2);
  await page.getByRole('button', { name: /^Walk to Oakhaven · 20 min/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Oakhaven');
  await walk(page, -7.4, 1);
  await page.getByRole('button', { name: /^Walk to the Colosseum · 10 min/ }).click();
  await expect(page.locator('.location-tag')).toContainText('The Colosseum grounds');
  // Into the entrance gap: anywhere the walk stops there is within reach of the booth.
  await walk(page, -2.6, 1.3);
  await page.getByRole('button', { name: /^Enter the exhibition/ }).click();
  await expect(page.locator('.training-card')).toContainText('Sprint for the crowd!');
  await cues(page, /Sprint!/);
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

test('throws logs in the glade by tapping twice or holding and letting go', async ({
  page,
}, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Clover Glade');
  await walk(page, ...SPOTS.toss);
  const start = activeCritter(await developmentState(page)).stats.strength;
  await page.getByRole('button', { name: /^Log toss · 25 Mallow energy/ }).click();
  await expect(page.locator('.training-card')).toContainText('Charge, and let go at the peak');
  await expect(page.getByRole('meter', { name: 'Throw power' })).toBeVisible();
  await expect
    .poll(async () => (await developmentState(page)).training?.elapsed ?? 0)
    .toBeGreaterThan(0.1);

  // Tap, tap: the first tap starts the charge and the second throws.
  const throwButton = page.getByRole('button', { name: /Throw, Mallow!/ });
  await throwButton.click();
  await expect.poll(async () => (await developmentState(page)).training?.stage).toBe(1);
  await expect
    .poll(async () => (await developmentState(page)).training?.meter ?? 0, { intervals: [20] })
    .toBeGreaterThan(0.5);
  await page.screenshot({ path: info.outputPath('log-toss-charging.png'), fullPage: true });
  await throwButton.click();
  await expect.poll(async () => (await developmentState(page)).training?.hits.length).toBe(1);

  // Hold Space to charge, let go to throw.
  await page.keyboard.down('Space');
  await expect.poll(async () => (await developmentState(page)).training?.stage).toBe(1);
  await expect
    .poll(async () => (await developmentState(page)).training?.meter ?? 0, { intervals: [20] })
    .toBeGreaterThan(0.6);
  await page.keyboard.up('Space');
  await expect.poll(async () => (await developmentState(page)).training?.hits.length).toBe(2);

  await tossLogs(page, 0.8);
  await expect(page.locator('.result-card')).toContainText(/Best throw [\d.]+ m/);
  await page.screenshot({ path: info.outputPath('log-toss-result.png'), fullPage: true });
  const after = await savedState(page);
  expect(activeCritter(after).stats.strength).toBeGreaterThan(start + 0.4);
  expect(activeCritter(after).drills.sessions).toEqual({ toss: 1 });
  expect(after.flags).toContain('tossed');
  expect(activeCritter(after).practised).toEqual({ toss: 1 });

  // Played together once, the toss can now be run as a routine: Mallow throws alone.
  const routine = page.getByRole('button', { name: /^Run it as a routine · 35 Mallow energy/ });
  await expect(routine).toBeEnabled();
  await routine.click();
  await expect(page.locator('.training-card')).toContainText('Mallow runs it alone');
  await expect(page.getByRole('progressbar', { name: 'Routine' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('log-toss-routine.png'), fullPage: true });
  await expect(page.locator('.result-card')).toContainText('ran it alone and gains');
  const routined = await savedState(page);
  expect(activeCritter(routined).drills.sessions).toEqual({ toss: 2 });
  expect(activeCritter(routined).practised).toEqual({ toss: 1 });
  expect(errors).toEqual([]);
});

test('crosses the balance beam and runs the hurdles in the glade', async ({ page }, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  await walk(page, 8, 0);
  await page.getByRole('button', { name: /Explore Clover Glade/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Clover Glade');

  await walk(page, ...SPOTS.beam);
  const start = activeCritter(await developmentState(page)).stats;
  await page.getByRole('button', { name: /^Balance beam · 25 Mallow energy/ }).click();
  await expect(page.getByRole('meter', { name: 'Balance' })).toBeVisible();
  // Holding the lean button and D both move the critter right.
  const lean = async () => (await developmentState(page)).training?.meter ?? 0;
  const before = await lean();
  const right = page.getByRole('button', { name: 'Lean right' });
  const box = (await right.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(lean).toBeGreaterThan(before + 0.05);
  await page.mouse.up();
  await page.keyboard.down('a');
  const leaned = await lean();
  await expect.poll(lean).toBeLessThan(leaned - 0.05);
  await page.keyboard.up('a');
  await page.screenshot({ path: info.outputPath('balance-beam.png'), fullPage: true });
  await crossBeam(page);
  await expect(page.locator('.result-card')).toContainText(/gains [\d.]+ endurance/);
  const crossed = await savedState(page);
  expect(activeCritter(crossed).stats.endurance).toBeGreaterThan(start.endurance + 0.3);
  expect(crossed.flags).toContain('balanced');

  await walk(page, ...SPOTS.run);
  await page.getByRole('button', { name: /^Hurdle run · 30 Mallow energy/ }).click();
  await expect(
    page.getByRole('img', { name: /^Hurdle run: 0 of \d+ hurdles cleared/ }),
  ).toBeVisible();
  // The jump button jumps on the press, and a second press jumps again in the air.
  const jump = page.getByRole('button', { name: /Jump!/ });
  const jumpBox = (await jump.boundingBox())!;
  await page.mouse.move(jumpBox.x + jumpBox.width / 2, jumpBox.y + jumpBox.height / 2);
  await expect
    .poll(async () => (await developmentState(page)).training?.elapsed ?? 0)
    .toBeGreaterThan(0.1);
  await page.mouse.down();
  await expect
    .poll(async () => (await developmentState(page)).training?.lastHitAt ?? 0)
    .toBeGreaterThan(0);
  await page.mouse.up();
  // Slow frames can land a jump before the next press arrives, so Space jumps twice in-page.
  expect(await doubleJump(page)).toEqual([1, 2]);
  await page.screenshot({ path: info.outputPath('hurdle-run.png'), fullPage: true });
  const course = runCourse((await developmentState(page)).training!.seed!);
  await runHurdles(page, course);
  await expect(page.locator('.result-card')).toContainText(/Cleared \d+ of \d+ hurdles/);
  const ran = await savedState(page);
  expect(ran.flags).toContain('ran');
  expect(activeCritter(ran).drills.sessions).toEqual({ beam: 1, run: 1 });
  // Frame timing in the page can cost a hurdle; most should still clear.
  const result = await page.locator('.result-card').innerText();
  const cleared = Number(/Cleared (\d+) of/.exec(result)![1]);
  expect(cleared).toBeGreaterThanOrEqual(course.length - 2);
  await page.screenshot({ path: info.outputPath('hurdle-run-result.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('steps to the gramophone and cheers a chess puzzle in the cottage', async ({ page }, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  await walk(page, -4.2, -2);
  await page.getByRole('button', { name: /^Step inside/ }).click();
  await expect(page.locator('.location-tag')).toContainText('Inside your cottage');

  await walk(page, ...SPOTS.rhythm);
  const start = activeCritter(await developmentState(page)).stats.intelligence;
  await page.getByRole('button', { name: /^Rhythm steps · 20 Mallow energy/ }).click();
  await expect(page.getByRole('img', { name: /^Rhythm steps: 0 of 16 notes/ })).toBeVisible();
  // A tap on a lane button with no note near is a stray step: it costs a little composure.
  // The drill ignores taps in its first 0.08 s, so wait for it to get going.
  await expect
    .poll(async () => (await developmentState(page)).training?.elapsed ?? 0)
    .toBeGreaterThan(0.2);
  await page.getByRole('button', { name: 'Step in the left lane' }).click();
  await expect.poll(async () => (await developmentState(page)).training?.reserve).toBeLessThan(1);
  await expect
    .poll(async () => (await developmentState(page)).training?.elapsed ?? 0, { timeout: 15_000 })
    .toBeGreaterThan(1.4);
  await page.screenshot({ path: info.outputPath('rhythm-steps.png'), fullPage: true });
  await danceSteps(page);
  await expect(page.locator('.result-card')).toContainText(/perfect and \d+ good steps of 16/);
  const danced = await savedState(page);
  expect(activeCritter(danced).stats.intelligence).toBeGreaterThan(start + 0.4);
  expect(danced.flags).toContain('danced');

  await walk(page, ...SPOTS.chess);
  await page.getByRole('button', { name: /^Chess puzzles · 15 Mallow energy/ }).click();
  await expect(page.locator('.training-card')).toContainText('Mallow is thinking…');
  await expect(page.locator('.chess-moment')).toHaveClass(/idea|moth/, { timeout: 15_000 });
  await page.screenshot({ path: info.outputPath('chess-puzzles.png'), fullPage: true });
  await sitChess(page);
  await expect(page.locator('.result-card')).toContainText(/ideas cheered, \d+ of \d+ moths/);
  const sat = await savedState(page);
  expect(activeCritter(sat).drills.sessions).toEqual({ rhythm: 1, chess: 1 });
  expect(sat.flags).toContain('puzzled');
  await page.screenshot({ path: info.outputPath('chess-result.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('runs the Hedgerow Dash on its day for an entry fee and a medal', async ({ page }, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  // Spring 4 at the Colosseum booth with coins to spare; the walk there is covered above.
  await page.evaluate(() => {
    const game = (
      window as unknown as {
        ng: { getComponent(element: Element): { host: { state: GameState } } };
      }
    ).ng.getComponent(document.querySelector('app-root')!);
    const state = game.host.state;
    state.day = 4;
    state.totalMinutes = 3 * 1440 + state.minute;
    state.areaId = 'colosseum';
    state.areaInstanceId = 'local-colosseum';
    state.player.coins = 30;
    state.player.position = { x: -2.6, z: 1.3 };
  });
  await expect(page.locator('.interaction-dock')).toContainText('Today: the Hedgerow Dash');
  await page.getByRole('button', { name: /^Enter the Hedgerow Dash · 6 coins/ }).click();
  await expect(page.locator('.training-card')).toContainText('HEDGEROW DASH · 1 OF 2 · HURDLE RUN');
  await page.screenshot({ path: info.outputPath('hedgerow-dash.png'), fullPage: true });
  const course = runCourse((await developmentState(page)).training!.seed!);
  await runHurdles(page, course);
  await expect(page.locator('.training-card')).toContainText('Sprint the last stretch!');
  await cues(page, /Sprint!/);
  await expect(page.locator('.result-card')).toContainText('HEDGEROW DASH');
  await expect(page.locator('.result-card')).toContainText('The crowd roars!');
  const after = await savedState(page);
  const showing = activeCritter(after).competitions.at(-1)!;
  expect(showing).toMatchObject({ day: 4, event: 'hedgerow' });
  await page.screenshot({ path: info.outputPath('hedgerow-result.png'), fullPage: true });
  await expect(page.getByRole('button', { name: /^Enter the Hedgerow Dash/ })).toBeDisabled();
  await page.getByRole('button', { name: /Field journal/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Hedgerow Dash · ');
  expect(errors).toEqual([]);
});

test('runs a ranked Fledgling Cup against the rivals for a placing', async ({ page }, info) => {
  test.skip(!['desktop', 'phone-portrait'].includes(info.project.name));
  test.setTimeout(180_000 * PACE);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await takeStarterHome(page);
  // Spring 3, a cup day, at the booth with coins to spare.
  await page.evaluate(() => {
    const game = (
      window as unknown as {
        ng: { getComponent(element: Element): { host: { state: GameState } } };
      }
    ).ng.getComponent(document.querySelector('app-root')!);
    const state = game.host.state;
    state.day = 3;
    state.totalMinutes = 2 * 1440 + state.minute;
    state.areaId = 'colosseum';
    state.areaInstanceId = 'local-colosseum';
    state.player.coins = 30;
    state.player.position = { x: -2.6, z: 1.3 };
  });
  await expect(page.locator('.interaction-dock')).toContainText('Today: the Fledgling Cup');
  await page.getByRole('button', { name: /^Enter the Fledgling Cup · 5 coins/ }).click();
  await expect(page.locator('.training-card')).toContainText('FLEDGLING CUP · 1 OF 2 · HURDLE RUN');
  const course = runCourse((await developmentState(page)).training!.seed!);
  await runHurdles(page, course);
  await expect(page.locator('.training-card')).toContainText('2 OF 2 · BOULDER LIFT');
  await holdGauge(page, 0.62);
  await expect(page.locator('.result-card')).toContainText('FLEDGLING CUP');
  await expect(page.locator('.result-card')).toContainText(/places \d+(st|nd|rd|th) of 7/);
  await page.screenshot({ path: info.outputPath('fledgling-cup.png'), fullPage: true });
  const entry = activeCritter(await savedState(page)).competitions.at(-1)!;
  expect(entry).toMatchObject({ day: 3, event: 'cup', field: 7, rank: 0 });
  await page.getByRole('button', { name: /Field journal/ }).click();
  await expect(page.getByRole('dialog')).toContainText(/Fledgling Cup · \d+(st|nd|rd|th) of 7/);
  expect(errors).toEqual([]);
});
