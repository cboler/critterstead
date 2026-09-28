import { type Page } from '@playwright/test';
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
  // Slow rendering can need more steering corrections; retain the same arrival tolerance.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const current = await position(page);
    const dx = x - current.x;
    const dz = z - current.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.8) return;
    const direction = [...directions].sort(
      (a, b) => b.x * dx + b.z * dz - (a.x * dx + a.z * dz),
    )[0];
    for (const key of direction.keys) await page.keyboard.down(key);
    // Ease near a destination so frame timing cannot make us overshoot it.
    await page.waitForTimeout(Math.min(650, (distance / 4) * (distance < 3 ? 400 : 1000)));
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
