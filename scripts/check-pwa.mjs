import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';

// Exercise the real production service worker, including repository subpath builds.
const root = resolve('dist/browser');
const index = await readFile(resolve(root, 'index.html'), 'utf8');
const base = index.match(/<base href="([^"]+)"/)?.[1] ?? '/';
const types = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const path = resolve(root, pathname.slice(base.length) || 'index.html');
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const data = await readFile(path);
    response
      .writeHead(200, {
        'Content-Type': types[extname(path)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      .end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({
    channel:
      process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${base}`);
  await page.locator('.world-canvas canvas').waitFor({ state: 'visible' });
  const care = page.getByRole('button', { name: /Give a little scritch/ });
  await care.click();
  await expect(care).toBeDisabled();
  // Reload only after the async write commits; canvas visibility is not save completion.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise((resolve, reject) => {
          const request = indexedDB.open('critterstead', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          return await new Promise((resolve, reject) => {
            const request = database.transaction('saves').objectStore('saves').get('homestead');
            request.onsuccess = () => {
              const saved = request.result;
              const companion = saved?.critters?.find(
                (critter) => critter.id === saved.activeCritterId,
              );
              resolve(Boolean(companion && companion.lastPettedDay === saved.day));
            };
            request.onerror = () => reject(request.error);
          });
        } finally {
          database.close();
        }
      }),
    )
    .toBe(true);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 60000,
  });
  await context.setOffline(true);
  await page.reload();
  await page.locator('.world-canvas canvas').waitFor({ state: 'visible' });
  await expect(care, 'Care survives an offline reload').toBeDisabled();
  if ((await page.locator('.save-state').innerText()).includes('Could not'))
    throw new Error('Offline save failed.');
  if (errors.length) throw new Error(errors.join('\n'));
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/pwa-offline.png', fullPage: true });
  console.log(
    `Production PWA passed: base ${base}, service worker controlling, offline reload renders the world, and companion care persists.`,
  );
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
