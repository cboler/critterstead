import { expect, test, type Page } from '@playwright/test';

// A standard-mapping gamepad fixture exercises the same browser polling path as a physical pad.
async function button(page: Page, index: number): Promise<void> {
  await page.evaluate((value) => {
    (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad.buttons[
      value
    ].pressed = true;
  }, index);
  await page.waitForTimeout(200);
  await page.evaluate((value) => {
    (window as unknown as { testPad: { buttons: { pressed: boolean }[] } }).testPad.buttons[
      value
    ].pressed = false;
  }, index);
  await page.waitForTimeout(100);
}

test('standard controller moves, chooses actions, and navigates menus', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Controller navigation is checked at desktop size.',
  );
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
    const axes = [0, 0, 0, 0];
    const pad = {
      id: 'Test standard controller',
      index: 0,
      connected: true,
      mapping: 'standard',
      buttons,
      axes,
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    (window as unknown as { testPad: { buttons: typeof buttons; axes: number[] } }).testPad = {
      buttons,
      axes,
    };
  });
  await page.goto('/');
  await expect(page.locator('.world-canvas canvas')).toBeVisible();
  await expect(page.locator('.movement-hint')).toContainText('Controller connected');
  await button(page, 0); // A: first nearby action
  await expect(page.getByRole('button', { name: /Give a little scritch/ })).toBeDisabled();
  await button(page, 15); // D-pad right: choose feed
  await expect(page.getByRole('button', { name: /Offer feed/ })).toHaveClass(/pad-selected/);
  await button(page, 0);
  await expect(page.locator('.inventory-items')).toContainText('3');

  await button(page, 3); // Y: journal
  await expect(page.getByRole('dialog')).toBeVisible();
  await button(page, 1); // B: back
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await button(page, 2); // X: help
  await expect(page.getByRole('dialog')).toContainText('left stick to move');
  await button(page, 13); // D-pad down: focus primary help action
  await expect(page.getByRole('button', { name: /Let’s meet Pip/ })).toHaveClass(/pad-selected/);
  await button(page, 0); // A: activate focused help action
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await button(page, 9); // Menu: pause
  await expect(page.getByRole('button', { name: 'Resume game' })).toBeVisible();
  await button(page, 9);
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeVisible();

  await page.keyboard.press('Backquote');
  const before = await page.locator('dl dd').nth(1).innerText();
  await button(page, 1);
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 1;
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    (window as unknown as { testPad: { axes: number[] } }).testPad.axes[0] = 0;
  });
  await page.keyboard.press('Backquote');
  const after = await page.locator('dl dd').nth(1).innerText();
  expect(after).not.toBe(before);
});
