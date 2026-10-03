import { expect, type Page } from '@playwright/test';
import { type GameState } from '../src/app/game/model';
interface DebugGameWindow extends Window {
  ng?: {
    getComponent(element: Element): {
      state(): GameState;
    };
  };
}

export async function developmentState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const root = document.querySelector('app-root');
    const game = root && (window as DebugGameWindow).ng?.getComponent(root);
    if (!game) throw new Error('Angular development diagnostics are unavailable.');
    return game.state();
  });
}

/** Three cues on an activity's button (hoops, the Clover Cup, the sprint), each on the beat. */
export async function cues(page: Page, name: RegExp): Promise<void> {
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
    await page.waitForTimeout(350);
  }
}

/**
 * Taps Space on every frame the gauge sits below the target, until the activity ends.
 * Tapping from inside the page keeps pace with the frame rate, however slow rendering is.
 */
export async function holdGauge(page: Page, target: number): Promise<void> {
  const finished = await page.evaluate(
    (goal) =>
      new Promise<boolean>((resolve) => {
        const game = (window as DebugGameWindow).ng!.getComponent(
          document.querySelector('app-root')!,
        );
        const deadline = performance.now() + 60_000;
        const frame = (): void => {
          const training = game.state().training;
          if (!training) return resolve(true);
          if (performance.now() > deadline) return resolve(false);
          if ((training.meter ?? 0) < goal)
            for (const type of ['keydown', 'keyup'])
              window.dispatchEvent(new KeyboardEvent(type, { key: ' ', code: 'Space' }));
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    target,
  );
  if (!finished) throw new Error('The gauge activity did not finish.');
}

// A rendered action result can precede the asynchronous IndexedDB commit.
export async function savedState(page: Page): Promise<GameState> {
  return page.evaluate(
    () =>
      new Promise<GameState>((resolve, reject) => {
        const open = indexedDB.open('critterstead', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const request = database.transaction('saves').objectStore('saves').get('homestead');
          request.onsuccess = () => {
            database.close();
            resolve(request.result as GameState);
          };
          request.onerror = () => {
            database.close();
            reject(request.error);
          };
        };
      }),
  );
}

export async function position(page: Page): Promise<{ x: number; z: number }> {
  return (await developmentState(page)).player.position;
}

/** Browser tests on CI render in software on shared runners; long journeys get more time. */
export const PACE = process.env['CI'] ? 2 : 1;

/**
 * Stops where every point within the walk's arrival tolerance is nearest to the intended
 * station, so where frame timing happens to stop the rancher never selects a neighbour.
 */
export const SPOTS = {
  nook: [2.5, -2.9],
  millInput: [4.9, 0.9],
  millOutput: [6.6, 1.2],
  firstBed: [-5.6, 1.4],
  secondBed: [-2.9, 1.3],
  lift: [5.2, 7.4],
} as const;

export async function walk(page: Page, x: number, z: number): Promise<void> {
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
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const current = await position(page);
    const dx = x - current.x;
    const dz = z - current.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.8) return;
    const direction = [...directions].sort(
      (a, b) => b.x * dx + b.z * dz - (a.x * dx + a.z * dz),
    )[0];
    // Hold each stride until the rancher has actually covered it, so slow frames still make
    // progress; strides shrink near the destination so a late release cannot overshoot.
    const stride = distance < 3 ? distance / 2 : Math.min(2.5, distance - 1.5);
    for (const key of direction.keys) await page.keyboard.down(key);
    const started = Date.now();
    let moved = 0;
    while (moved < stride && Date.now() - started < 3000) {
      const now = await position(page);
      moved = Math.hypot(now.x - current.x, now.z - current.z);
    }
    for (const key of direction.keys) await page.keyboard.up(key);
  }
  throw new Error(`Could not walk to ${x}, ${z}; observed ${JSON.stringify(await position(page))}`);
}

export async function seedSave(page: Page, value: unknown): Promise<void> {
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

/** A fresh game opens on the walk to Oakhaven; skip to the choice and take Mallow home. */
export async function takeStarterHome(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Skip the walk' }).click();
  await page.getByRole('radio', { name: /^Mallow,/ }).click();
  await page.getByRole('button', { name: 'Take Mallow home' }).click();
  await expect(page.locator('.starter-offer')).toHaveCount(0);
}

/** Marks Pip's two morning picks as made, so lesson counts in a test are the player's alone. */
export async function pipAlreadyForaged(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const game = (window as unknown as DebugHostWindow).ng!.getComponent(
      document.querySelector('app-root')!,
    );
    game.host.state.flags.push('pip-1:done', 'pip-2:done');
    // Saved at once, so a reload later in the test keeps it.
    await game.save();
  });
}
interface DebugHostWindow {
  ng?: {
    getComponent(element: Element): { host: { state: GameState }; save(): Promise<void> };
  };
}
