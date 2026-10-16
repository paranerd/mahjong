import { test, expect } from '@playwright/test';
import { activeTiles, createGame, matches, positions, removalPlan, removePair, type Game } from '../src/game';

test('matches, undo, save, settings and layout switching', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('.tile')).toHaveCount(144);
  await page.waitForTimeout(1100);
  const game: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const [a, b] = matches(game)[0];
  await page.locator(`[data-id="${a.id}"]`).click();
  await expect(page.locator(`[data-id="${a.id}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#arena').click({ position: { x: 2, y: 2 } });
  await expect(page.locator('.selected')).toHaveCount(0);
  await expect(page.locator(`[data-id="${a.id}"]`)).toHaveAttribute('aria-pressed', 'false');
  await page.locator(`[data-id="${a.id}"]`).click();
  await page.locator('.table').click({ position: { x: 2, y: 2 } });
  await expect(page.locator('.selected')).toHaveCount(0);
  await expect(page.locator('#remaining')).toHaveText('72');
  await page.locator(`[data-id="${a.id}"]`).click();
  await page.locator(`[data-id="${b.id}"]`).click();
  await expect(page.locator('#remaining')).toHaveText('71');
  await expect(page.locator('.tile')).toHaveCount(142);
  await page.reload();
  await expect(page.locator('#remaining')).toHaveText('71');
  await page.locator('#undo').click();
  await expect(page.locator('.tile')).toHaveCount(144);
  await page.locator('#hint').click();
  await expect(page.locator('.hinted')).toHaveCount(2);
  await page.locator('#menu').click();
  await page.locator('[data-theme="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('#settings .close-dialog').click();
  await page.locator('#open-new-game').click();
  await page.locator('[data-layout="lotus"]').click();
  await page.locator('#new-game').click();
  await expect(page.locator('.tile')).toHaveCount(144);
  await expect(page.locator('#layout-name')).toHaveText('Lotus');
  expect(errors).toEqual([]);
});

for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [568, 320], [320, 568], [768, 1024]]) {
  test(`fits ${width}×${height} without scrolling or cropped tiles`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await page.waitForTimeout(1100);
    const result = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll<HTMLElement>('.tile')];
      return {
        overflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
        cropped: buttons.filter(el => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight; }).length,
        minWidth: Math.min(...buttons.map(el => el.getBoundingClientRect().width)),
      };
    });
    expect(result.overflow).toBe(false);
    expect(result.cropped).toBe(0);
    expect(result.minWidth).toBeGreaterThan(20);
    if (width > height) {
      const tools = await page.locator('.tools').boundingBox();
      const actions = await page.locator('.corner-actions').boundingBox();
      expect(tools!.height).toBeGreaterThan(tools!.width);
      expect(Math.abs(tools!.y + tools!.height / 2 - height / 2)).toBeLessThan(1);
      expect(tools!.x + tools!.width).toBeLessThanOrEqual(width - 12);
      expect(tools!.y).toBeGreaterThan(actions!.y + actions!.height + 5);
      expect(await page.locator('.tile').evaluateAll((tiles, left) => tiles.every(t => t.getBoundingClientRect().right <= left - 12), tools!.x)).toBe(true);
    }
    await expect(page.locator('#toast')).toHaveCSS('opacity', '1');
    const toast = await page.locator('#toast').boundingBox();
    const info = await page.locator('.round-info').boundingBox();
    const actions = await page.locator('.corner-actions').boundingBox();
    expect(toast!.x).toBeGreaterThan(info!.x + info!.width + 5);
    expect(toast!.x + toast!.width).toBeLessThan(actions!.x - 5);
    expect(Math.abs(toast!.x + toast!.width / 2 - (info!.x + info!.width + actions!.x) / 2)).toBeLessThan(2);
    expect(toast!.y).toBeLessThan(info!.y + 12);

    if (width === 1440 || width === 390 || width === 844) await page.screenshot({ path: `test-results/${test.info().project.name}-${width}x${height}.png` });

  });
}

test('is playable after going offline and reloading', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not expose Service Worker support.');
  await page.goto('./');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.tile')).toHaveCount(144);
  await page.waitForTimeout(1100);
  const game: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const [a,b] = matches(game)[0];
  await page.locator(`[data-id="${a.id}"]`).click();
  await page.locator(`[data-id="${b.id}"]`).click();
  await expect(page.locator('#remaining')).toHaveText('71');
  await expect.poll(async () => activeTiles(await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!))).length).toBe(142);
});

test('reset in the toolbar restores the original deal', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1100);
  const initial: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const pair = matches(initial)[0];
  await page.locator(`[data-id="${pair[0].id}"]`).click();
  await page.locator(`[data-id="${pair[1].id}"]`).click();
  await expect(page.locator('#reset')).toBeEnabled();
  await page.locator('#reset').click();
  await expect(page.locator('#confirm-action')).toBeVisible();
  await expect(page.locator('#cancel-action')).toBeFocused();
  await expect(page.locator('#remaining')).toHaveText('71');
  await page.locator('#cancel-action').click();
  await expect(page.locator('#remaining')).toHaveText('71');
  await page.locator('#reset').click();
  await page.locator('#accept-action').click();
  const reset: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  expect(reset.removed).toEqual([]);
  expect(reset.tiles.map(t => t.face)).toEqual(initial.initialFaces);
  await expect(page.locator('#reset')).toBeDisabled();
  await expect(page.locator('#remaining')).toHaveText('72');
});


test('shows victory after removing the last pair', async ({ page }) => {
  const seeded = (initial: number) => { let seed = initial; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
  const game = createGame('lotus', seeded(29));
  const plan = removalPlan(positions('lotus'), seeded(29))!;
  for (const [a,b] of plan.slice(0, -1)) expect(removePair(game, a, b)).toBe(true);
  await page.addInitScript(g => localStorage.setItem('mahjong.game.v1', JSON.stringify(g)), game);
  await page.goto('./');
  await expect(page.locator('.tile')).toHaveCount(2);
  await page.waitForTimeout(1100);
  const [a,b] = plan.at(-1)!;
  await page.locator(`[data-id="${a}"]`).click();
  await page.locator(`[data-id="${b}"]`).click();
  await expect(page.locator('#victory')).toBeVisible();
  await expect(page.locator('#remaining')).toHaveText('0');
  await page.locator('#play-again').click();
  await expect(page.locator('#new-game-dialog')).toBeVisible();
});


test('uniform tiles by default; highlighting is optional and persists', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.dimmed')).toHaveCount(0);
  await expect(page.locator('#zoom, #restart, #offline-note, #replace-note')).toHaveCount(0);
  const filters = await page.locator('.tile').evaluateAll(tiles => [...new Set(tiles.map(t => getComputedStyle(t).filter))]);
  expect(filters).toEqual(['none']);
  await page.locator('#menu').click();
  await expect(page.locator('#highlight-free')).not.toBeChecked();
  await page.locator('#highlight-free').check();
  await expect(page.locator('.dimmed').first()).toBeAttached();
  await page.reload();
  await expect(page.locator('.dimmed').first()).toBeAttached();
  await page.locator('#menu').click();
  await expect(page.locator('#highlight-free')).toBeChecked();
  await page.locator('#highlight-free').uncheck();
  await page.locator('#settings .close-dialog').click();
  await expect(page.locator('.dimmed')).toHaveCount(0);
});

test('trackpad zoom stays inside the board and Escape restores the view', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1100);
  const before = await page.locator('.tile').first().boundingBox();
  const arena = await page.locator('#arena').boundingBox();
  await page.mouse.move(arena!.x + arena!.width / 2, arena!.y + arena!.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -65);
  await page.keyboard.up('Control');
  await expect(page.locator('#arena')).toHaveClass(/zoomed/);
  const after = await page.locator('.tile').first().boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width * 1.5);
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#arena')).not.toHaveClass(/zoomed/);
});

test('two finger pinch and pan do not select tiles or zoom the page', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native multi-touch injection requires Chromium CDP.');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto(process.env.MAHJONG_BASE_URL ?? 'http://127.0.0.1:4173/');
  await page.waitForTimeout(1100);
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 350, id: 1 }, { x: 240, y: 350, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 110, y: 350, id: 1 }, { x: 280, y: 350, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#arena')).toHaveClass(/zoomed/);
  await expect(page.locator('.selected')).toHaveCount(0);
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
  const before = await page.locator('#board').getAttribute('style');
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 400, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y: 445, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.locator('#board').getAttribute('style')).not.toBe(before);
  await expect(page.locator('.selected')).toHaveCount(0);
  await expect(page.locator('#remaining')).toHaveText('72');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  for (let tap = 0; tap < 2; tap++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 425, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
  await context.close();
});

test('matching tiles collide at the center and finish cleanly', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1100);
  const game: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const [a,b] = matches(game)[0];
  await page.locator(`[data-id="${a.id}"]`).click();
  await page.locator(`[data-id="${b.id}"]`).click();
  await expect(page.locator('.match-tile')).toHaveCount(2);
  await page.evaluate(() => document.querySelector('.match-effect')!.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = 468; }));
  const center = await page.locator('.match-tile').evaluateAll(tiles => {
    const rects = tiles.map(t => t.getBoundingClientRect());
    return { x: rects.reduce((sum, r) => sum + r.x + r.width / 2, 0) / 2, y: rects.reduce((sum, r) => sum + r.y + r.height / 2, 0) / 2, gap: rects[1].left - rects[0].right, screenX: innerWidth / 2, screenY: innerHeight / 2 };
  });
  expect(Math.abs(center.x - center.screenX)).toBeLessThan(1);
  expect(Math.abs(center.y - center.screenY)).toBeLessThan(1);
  expect(Math.abs(center.gap)).toBeLessThan(5);
  await expect(page.locator('.match-shard')).toHaveCount(24);
  const atImpact = await page.locator('.match-shard').evaluateAll(shards => shards.map(shard => {
    const style = getComputedStyle(shard), matrix = new DOMMatrix(style.transform);
    return Math.abs(parseFloat((shard as HTMLElement).style.left) + parseFloat(style.transformOrigin) + matrix.m41 - innerWidth / 2);
  }));
  await page.evaluate(() => document.querySelector('.match-effect')!.getAnimations({ subtree: true }).forEach(a => { a.currentTime = 570; }));
  const fragments = await page.locator('.match-shard').evaluateAll(shards => shards.map(shard => {
    const style = getComputedStyle(shard), matrix = new DOMMatrix(style.transform);
    return { distance: Math.abs(parseFloat((shard as HTMLElement).style.left) + parseFloat(style.transformOrigin) + matrix.m41 - innerWidth / 2), opacity: Number(style.opacity) };
  }));
  expect(fragments.every((f, i) => f.distance > atImpact[i] && f.opacity > 0)).toBe(true);
  expect(await page.locator('.match-tile').evaluateAll(tiles => tiles.every(t => getComputedStyle(t).opacity === '0'))).toBe(true);
  await page.screenshot({ path: `test-results/${test.info().project.name}-shatter.png` });
  await page.evaluate(() => document.querySelector('.match-effect')!.getAnimations({ subtree: true }).forEach(a => { a.currentTime = 690; }));
  const later = await page.locator('.match-shard').evaluateAll(shards => shards.map(shard => {
    const style = getComputedStyle(shard), matrix = new DOMMatrix(style.transform);
    return Math.abs(parseFloat((shard as HTMLElement).style.left) + parseFloat(style.transformOrigin) + matrix.m41 - innerWidth / 2);
  }));
  expect(later.every((distance, i) => distance > fragments[i].distance)).toBe(true);
  await page.evaluate(() => document.getAnimations().forEach(a => a.play()));
  await expect(page.locator('.match-effect')).toHaveCount(0);
  await expect(page.locator('#reset')).toBeEnabled();
});

test('reduced motion skips the collision flight and keeps game state correct', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const game: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const [a,b] = matches(game)[0];
  await page.locator(`[data-id="${a.id}"]`).click();
  await page.locator(`[data-id="${b.id}"]`).click();
  await expect(page.locator('.match-effect')).toHaveCount(0);
  await expect(page.locator('#remaining')).toHaveText('71');
  await expect(page.locator('#undo')).toBeEnabled();
});


for (const [width, height] of [[768, 1024], [1024, 768], [834, 1194], [1194, 834]]) {
  test(`tablet ${width}×${height} keeps the title below the safe area`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await page.evaluate(() => document.documentElement.style.setProperty('--safe-top', '24px'));
    await page.waitForTimeout(1100);
    const title = await page.locator('#layout-name').boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(64);
    const info = await page.locator('.round-info').boundingBox();
    const arena = await page.locator('#arena').boundingBox();
    expect(arena!.y).toBeGreaterThan(info!.y + info!.height + 12);
    expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(false);
    if (width === 768 || width === 1024) await page.screenshot({ path: `test-results/${test.info().project.name}-ipad-${width}.png` });
  });
}

for (const layout of ['turtle', 'bridge', 'lotus']) {
  test(`${layout}: all three difficulties keep their tile counts after reloading`, async ({ page }) => {
    await page.goto('./');
    for (const [difficulty, count] of [['easy', 48], ['medium', 96], ['hard', 144]] as const) {
      await page.locator('#open-new-game').click();
      await page.locator(`[data-layout="${layout}"]`).click();
      await page.locator(`[data-difficulty="${difficulty}"]`).click();
      await expect(page.locator(`[data-difficulty="${difficulty}"] small`)).toHaveText(`${count} Steine`);
      if (layout === 'turtle' && difficulty === 'medium') await page.screenshot({ path: `test-results/${test.info().project.name}-difficulty-settings.png` });
      await page.locator('#new-game').click();
      await expect(page.locator('.tile')).toHaveCount(count);
      await expect(page.locator('#remaining')).toHaveText(String(count / 2));
      await page.reload();
      await expect(page.locator('.tile')).toHaveCount(count);
      const g: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
      expect(g.difficulty).toBe(difficulty);
      expect(matches(g).length).toBeGreaterThan(0);
    }
  });
}

test('shuffle requires confirmation and preserves removed tiles', async ({ page }) => {
  await page.goto('./');
  await page.waitForTimeout(1100);
  const g: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const [a,b] = matches(g)[0];
  await page.locator(`[data-id="${a.id}"]`).click();
  await page.locator(`[data-id="${b.id}"]`).click();
  await expect(page.locator('#shuffle')).toBeEnabled();
  const before: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  await page.locator('#shuffle').click();
  await expect(page.locator('#confirm-action')).toBeVisible();
  await expect(page.locator('#confirm-title')).toHaveText('Neu mischen?');
  await page.screenshot({ path: `test-results/${test.info().project.name}-shuffle-confirmation.png` });
  await expect(page.locator('#cancel-action')).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!))).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm-action')).not.toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!))).toEqual(before);
  await page.keyboard.press('m');
  await expect(page.locator('#confirm-action')).toBeVisible();
  await page.locator('#accept-action').click();
  await expect(page.locator('#shuffle')).toBeEnabled();
  const after: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  expect(after.removed).toEqual(before.removed);
  expect(after.history).toEqual([]);
  expect(after.initialFaces).toEqual(before.initialFaces);
  expect(activeTiles(after).map(t => t.face).sort()).toEqual(activeTiles(before).map(t => t.face).sort());
  expect(matches(after).length).toBeGreaterThan(0);
  await expect(page.locator('#remaining')).toHaveText('71');
  await page.locator('#reset').click();
  await page.locator('#accept-action').click();
  await expect(page.locator('#remaining')).toHaveText('72');
  const reset: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  expect(reset.tiles.map(t => t.face)).toEqual(before.initialFaces);
});

test('new game options and confirmations fit a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  const tools = await page.locator('.tools').boundingBox();
  expect(tools!.x).toBeGreaterThanOrEqual(10);
  expect(tools!.x + tools!.width).toBeLessThanOrEqual(310);
  await page.locator('#open-new-game').click();
  await expect(page.locator('[data-difficulty="easy"]')).toBeVisible();
  await page.locator('[data-difficulty="easy"]').click();
  await page.locator('#new-game').click();
  await page.locator('#shuffle').click();
  await expect(page.locator('#confirm-action')).toBeVisible();
  const dialog = await page.locator('#confirm-action').boundingBox();
  expect(dialog!.x).toBeGreaterThanOrEqual(10);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(310);
  await expect(page.locator('#cancel-action')).toBeVisible();
});


test('settings and new game have separate overlays and preserve a cancelled round', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(() => localStorage.getItem('mahjong.game.v1'));
  await page.getByRole('button', { name: 'Einstellungen und Anleitung', exact: true }).click();
  await expect(page.locator('#settings')).toBeVisible();
  await expect(page.locator('#new-game-dialog')).not.toBeVisible();
  await expect(page.locator('#settings [data-layout], #settings [data-difficulty], #settings #new-game')).toHaveCount(0);
  await expect(page.locator('#settings #highlight-free')).toBeVisible();
  await page.locator('#settings summary').click();
  await expect(page.locator('#settings details')).toHaveAttribute('open', '');
  await page.screenshot({ path: `test-results/${test.info().project.name}-settings-only.png` });
  await page.locator('#settings .close-dialog').click();
  await expect(page.getByRole('button', { name: 'Einstellungen und Anleitung', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Neues Spiel', exact: true }).click();
  await expect(page.locator('#new-game-dialog')).toBeVisible();
  await expect(page.locator('#settings')).not.toBeVisible();
  await expect(page.locator('#new-game-dialog [data-theme], #new-game-dialog details')).toHaveCount(0);
  await page.locator('[data-difficulty="easy"]').click();
  await page.locator('[data-layout="lotus"]').click();
  await page.screenshot({ path: `test-results/${test.info().project.name}-new-game-only.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('#new-game-dialog')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('mahjong.game.v1'))).toBe(before);
  await page.locator('#open-new-game').click();
  await expect(page.locator('[data-difficulty="hard"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#new-game-dialog .close-dialog').click();
  await expect(page.locator('#new-game-dialog')).not.toBeVisible();
});
