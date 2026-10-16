import { expect, test, type Page } from '@playwright/test';
import { createGame, matches, positions, removalPlan, removePair, type Game } from '../src/game';
import { newArcadeProfile, newArcadeRound } from '../src/arcade';

function seeded(initial: number) {
  let seed = initial;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function savedRound(pairs = 0, crystals = 5) {
  const game = createGame('turtle', seeded(32), 'easy');
  game.arcade = newArcadeRound();
  const plan = removalPlan(positions('turtle', 'easy'), seeded(32))!;
  for (const [a, b] of plan.slice(0, pairs)) removePair(game, a, b);
  return { game: { ...game, arcadeEnabled: true, arcadeProfile: { ...newArcadeProfile(), crystals } }, plan };
}
async function seed(page: Page, data: ReturnType<typeof savedRound>) {
  await page.addInitScript(g => { if (!localStorage.getItem('mahjong.game.v1')) localStorage.setItem('mahjong.game.v1', JSON.stringify(g)); }, data.game);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  // Let the browser finish the initial responsive layout before measuring it.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function pair(page: Page, ids: number[]) {
  await page.locator(`[data-id="${ids[0]}"]`).click();
  await page.locator(`[data-id="${ids[1]}"]`).click();
  await expect(page.locator('#menu')).toBeEnabled();
}

test('Classic stays unchanged; switching modes only affects a new round', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('#arcade-panel')).toBeHidden();
  await expect(page.locator('#arcade-panda')).toBeHidden();
  await expect(page.locator('.action-cost')).toHaveCount(0);
  await page.locator('#menu').click();
  await page.locator('#arcade-enabled').check();
  await page.locator('#settings .close-dialog').click();
  await expect(page.locator('#arcade-panel')).toBeHidden();
  await page.locator('#open-new-game').click();
  await expect(page.locator('#new-game-mode')).toContainText('Arcade');
  await page.locator('#new-game').click();
  await expect(page.locator('#arcade-panel')).toBeVisible();
  await expect(page.locator('#arcade-balance')).toHaveText('5');
  await page.locator('#hint').click();
  await expect(page.locator('#arcade-balance')).toHaveText('4');
  await page.reload();
  await expect(page.locator('#arcade-balance')).toHaveText('4');
  await page.locator('#menu').click();
  await page.locator('#arcade-enabled').uncheck();
  await page.locator('#settings .close-dialog').click();
  await expect(page.locator('#arcade-panel')).toBeVisible();
  await page.locator('#open-new-game').click();
  await page.locator('#new-game').click();
  await expect(page.locator('#arcade-panel')).toBeHidden();
  await expect(page.locator('.action-cost')).toHaveCount(0);
  await page.locator('#hint').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  expect(saved.arcadeProfile).toEqual({ level: 1, crystals: 4 });
});

test('milestones, fees, cancel and reset survive reloads', async ({ page }) => {
  const data = savedRound(11);
  await seed(page, data);
  await pair(page, data.plan[11]);
  await expect(page.locator('#arcade-score')).toHaveText('1.200');
  await expect(page.locator('.crystal-milestone.reached')).toHaveCount(1);
  await expect(page.locator('[data-crystal="0"]')).toHaveClass(/crystal-flash/);
  await page.locator('#undo').click();
  await expect(page.locator('#arcade-score')).toHaveText('1.100');
  await expect(page.locator('#arcade-balance')).toHaveText('4');
  await page.locator('#hint').click();
  await expect(page.locator('#arcade-score')).toHaveText('1.000');
  await expect(page.locator('#arcade-balance')).toHaveText('3');
  await page.locator('#shuffle').click();
  await expect(page.locator('#confirm-description')).toContainText('2 Kristalle und 300 Punkte');
  await page.locator('#cancel-action').click();
  await expect(page.locator('#arcade-balance')).toHaveText('3');
  await page.locator('#shuffle').click();
  await page.locator('#accept-action').click();
  await expect(page.locator('#arcade-balance')).toHaveText('1');
  await expect(page.locator('#arcade-score')).toHaveText('700');
  await page.reload();
  await expect(page.locator('#arcade-score')).toHaveText('700');
  await expect(page.locator('#arcade-balance')).toHaveText('1');
  await page.locator('#reset').click();
  await page.locator('#accept-action').click();
  await expect(page.locator('#arcade-score')).toHaveText('0');
  await expect(page.locator('#arcade-balance')).toHaveText('1');
});

test('insufficient balance blocks buttons and keyboard shortcuts, while Reset remains free', async ({ page }) => {
  const data = savedRound(2, 0);
  await seed(page, data);
  for (const action of ['undo', 'hint', 'shuffle']) {
    await expect(page.locator(`#${action}`)).toBeDisabled();
    await expect(page.locator(`#${action}`)).toHaveCSS('filter', 'grayscale(1)');
  }
  const before = await page.evaluate(() => localStorage.getItem('mahjong.game.v1'));
  for (const key of ['h', 'm', 'Control+z']) await page.keyboard.press(key);
  await expect(page.locator('#confirm-action')).toBeHidden();
  await expect(page.locator('.hinted')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('mahjong.game.v1'))).toBe(before);
  await page.locator('#reset').click();
  await page.locator('#accept-action').click();
  await expect(page.locator('#remaining')).toHaveText('24');
});

test('victory awards and animates one level, with no payout after reload, undo or Reset', async ({ page }) => {
  const data = savedRound(23);
  await seed(page, data);
  await pair(page, data.plan[23]);
  await expect(page.locator('#victory')).toBeVisible();
  await expect(page.locator('#arcade-level')).toHaveText('2');
  await expect(page.locator('#arcade-balance')).toHaveText('8');
  await expect(page.locator('#arcade-reward-copy')).toContainText('3 Kristalle gewonnen');
  await expect(page.locator('#next-level')).toHaveText('2');
  await expect(page.locator('#level-up')).toBeVisible();
  await page.reload();
  await expect(page.locator('#arcade-balance')).toHaveText('8');
  await expect(page.locator('#arcade-reward-copy')).toContainText('bereits belohnt');
  await expect(page.locator('#level-up')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#undo').click();
  await pair(page, data.plan[23]);
  await expect(page.locator('#arcade-balance')).toHaveText('7');
  await expect(page.locator('#level-up')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#reset').click();
  await page.locator('#accept-action').click();
  for (const ids of data.plan) await pair(page, ids);
  await expect(page.locator('#victory')).toBeVisible();
  await expect(page.locator('#arcade-level')).toHaveText('2');
  await expect(page.locator('#arcade-balance')).toHaveText('7');
});

test('failed shuffle does not charge crystals or points', async ({ page }) => {
  const data = savedRound();
  const top = data.game.tiles.find(t => t.z === 1)!;
  const bottom = data.game.tiles.find(t => t.z === 0 && t.x === top.x && t.y === top.y)!;
  top.face = bottom.face;
  data.game.removed = data.game.tiles.filter(t => t.id !== top.id && t.id !== bottom.id).map(t => t.id);
  await seed(page, data);
  await page.locator('#shuffle').click();
  await page.locator('#accept-action').click();
  await expect(page.locator('#toast')).toContainText('lässt sich nicht mischen');
  await expect(page.locator('#arcade-balance')).toHaveText('5');
  await expect(page.locator('#arcade-score')).toHaveText('2.300');
});

test('crystals have no backdrop and prices sit at the top right of each action', async ({ page }) => {
  await seed(page, savedRound(2));
  for (const crystal of await page.locator('.crystal-milestone > svg').all()) {
    await expect(crystal).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
  for (const action of ['undo', 'hint', 'shuffle']) {
    const button = await page.locator(`#${action}`).boundingBox();
    const badge = await page.locator(`#${action} .action-cost`).boundingBox();
    expect(badge!.y).toBeLessThan(button!.y + 2);
    expect(Math.abs(badge!.x + badge!.width - button!.x - button!.width)).toBeLessThan(1);
    await expect(page.locator(`#${action}`)).toBeEnabled();
  }
});

test('Panda reactions change on click, keyboard and pairs, then restore the original face', async ({ page }) => {
  const data = savedRound();
  await seed(page, data);
  const panda = page.locator('#arcade-panda'), face = page.locator('#panda-face');
  const original = await face.getAttribute('src');
  await page.locator(`[data-id="${data.plan[0][0]}"]`).click();
  await page.clock.install();
  await panda.click();
  const first = await panda.getAttribute('data-expression');
  expect(first).not.toBe('default');
  expect(await face.getAttribute('src')).not.toBe(original);
  await expect(page.locator(`[data-id="${data.plan[0][0]}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#arcade-score')).toHaveText('0');
  await page.clock.fastForward(1000);
  await panda.click();
  expect(await panda.getAttribute('data-expression')).not.toBe(first);
  await page.clock.fastForward(1000);
  await expect(panda).not.toHaveAttribute('data-expression', 'default');
  await page.clock.fastForward(601);
  await expect(panda).toHaveAttribute('data-expression', 'default');
  await expect(face).toHaveAttribute('src', original!);
  await panda.focus();
  await page.keyboard.press('Enter');
  await expect(panda).not.toHaveAttribute('data-expression', 'default');
  await page.clock.fastForward(1601);
  await expect(panda).toHaveAttribute('data-expression', 'default');
  await page.locator(`[data-id="${data.plan[0][1]}"]`).click();
  await expect(page.locator('#arcade-score')).toHaveText('100');
  await expect(panda).not.toHaveAttribute('data-expression', 'default');
  await page.clock.fastForward(1601);
  await expect(face).toHaveAttribute('src', original!);
});

for (const [width, height] of [[1440, 900], [390, 844], [568, 320]]) {
  test(`Panda stays above the victory overlay at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const data = savedRound(23);
    await seed(page, data);
    const panda = page.locator('#arcade-panda');
    const before = await panda.boundingBox();
    await pair(page, data.plan[23]);
    await expect(page.locator('#victory')).toBeVisible();
    await expect(page.locator('#victory .dialog-header > #arcade-panda')).toHaveCount(1);
    const after = await panda.boundingBox();
    const overlay = await page.locator('#victory').boundingBox();
    const title = await page.locator('#victory-title').boundingBox();
    expect(Math.abs(after!.x + after!.width / 2 - overlay!.x - overlay!.width / 2)).toBeLessThan(1);
    expect(after!.width).toBe(height <= 540 ? 64 : 112);
    expect(after!.y).toBeGreaterThanOrEqual(overlay!.y);
    expect(after!.y + after!.height).toBeLessThan(title!.y);
    expect(await panda.evaluate(el => {
      const r = el.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('#arcade-panda') === el;
    })).toBe(true);
    const expression = await panda.getAttribute('data-expression');
    await panda.click();
    await expect(panda).not.toHaveAttribute('data-expression', expression!);
    await expect(page.locator('#victory')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.table > #arcade-panda')).toHaveCount(1);
    const restored = await panda.boundingBox();
    expect(Math.abs(restored!.x - before!.x)).toBeLessThan(1);
    expect(Math.abs(restored!.width - before!.width)).toBeLessThan(1);
    await panda.click();
    await expect(panda).not.toHaveAttribute('data-expression', 'default');
    await page.reload();
    await expect(page.locator('#victory .dialog-header > #arcade-panda')).toBeVisible();
    await panda.click();
    await expect(panda).not.toHaveAttribute('data-expression', 'default');
    await page.screenshot({ path: `test-results/${test.info().project.name}-victory-panda-${width}.png` });
  });
}

test('level-up uses an animation and respects reduced motion', async ({ page }) => {
  const data = savedRound(23);
  await seed(page, data);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await pair(page, data.plan[23]);
  await expect(page.locator('#victory')).toBeVisible();
  await expect(page.locator('#next-level')).toHaveCSS('animation-name', 'level-rise');
  await expect(page.locator('#next-level')).toHaveCSS('animation-duration', '0.85s');
  await page.waitForTimeout(1450);
  await page.screenshot({ path: `test-results/${test.info().project.name}-arcade-victory.png` });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('#next-level').evaluate(el => parseFloat(getComputedStyle(el).animationDuration))).toBeLessThan(.001);
});

for (const [width, height] of [[390, 844], [320, 568], [568, 320]]) {
  test(`dialog headers and actions stay visible while content scrolls at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const data = savedRound(23);
    await seed(page, data);
    async function checkDialog(id: string) {
      const dialog = page.locator(id), content = dialog.locator('.dialog-content');
      await expect(dialog).toBeVisible();
      await content.evaluate(el => { el.scrollTop = 0; });
      const header = await dialog.locator('.dialog-header').boundingBox();
      const footer = await dialog.locator('.dialog-footer').boundingBox();
      expect(header!.y).toBeGreaterThanOrEqual(0);
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(height);
      const scroll = await content.evaluate(el => {
        el.scrollTop = el.scrollHeight;
        return { offset: el.scrollTop, overflow: el.scrollHeight > el.clientHeight, height: el.clientHeight };
      });
      expect(scroll.height).toBeGreaterThan(36);
      if (scroll.overflow) expect(scroll.offset).toBeGreaterThan(0);
      expect(await dialog.locator('.dialog-header').boundingBox()).toEqual(header);
      expect(await dialog.locator('.dialog-footer').boundingBox()).toEqual(footer);
      expect(await dialog.evaluate(el => el.scrollTop)).toBe(0);
      const title = await dialog.locator('h1').boundingBox();
      expect(title!.y).toBeGreaterThanOrEqual(header!.y);
      expect(title!.y + title!.height).toBeLessThanOrEqual(header!.y + header!.height + 1);
    }
    // Exercise the optional installation action without requesting an install.
    await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));
    await page.locator('#menu').click();
    await page.locator('#settings summary').click();
    await checkDialog('#settings');
    await page.screenshot({ path: `test-results/${test.info().project.name}-settings-scroll-${width}.png` });
    await page.locator('#settings .close-dialog').click();
    await page.locator('#open-new-game').click();
    await checkDialog('#new-game-dialog');
    await expect(page.locator('#new-game')).toBeInViewport();
    await page.screenshot({ path: `test-results/${test.info().project.name}-new-game-scroll-${width}.png` });
    await page.locator('#new-game-dialog .close-dialog').click();
    await page.locator('#shuffle').click();
    await checkDialog('#confirm-action');
    await page.locator('#cancel-action').click();
    await pair(page, data.plan[23]);
    await checkDialog('#victory');
    await expect(page.locator('#play-again')).toBeInViewport();
    await page.screenshot({ path: `test-results/${test.info().project.name}-victory-scroll-${width}.png` });
  });
}

for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390], [568, 320], [768, 1024], [601, 568], [900, 600]]) {
  test(`Arcade fits ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const data = savedRound(12);
    await seed(page, data);
    await expect(page.locator('#arcade-panda')).toBeVisible();
    expect(await page.locator('#panda-face').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const boxes = await page.evaluate(() => {
      const box = (selector: string) => { const r = document.querySelector(selector)!.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
      return { arena: box('#arena'), panel: box('#arcade-panel'), tools: box('.tools'), hud: box('.hud'), actions: box('.corner-actions'), panda: box('#arcade-panda'), tiles: [...document.querySelectorAll('.tile')].map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }), overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
    });
    expect(boxes.overflow).toBe(false);
    expect(boxes.arena.top).toBeGreaterThan(boxes.panel.bottom + 15);
    expect(boxes.tiles.every(r => r.left >= 0 && r.top >= boxes.panel.bottom + 10 && r.right <= width
      && (width > height ? r.right <= boxes.tools.left - 12 : r.bottom <= boxes.tools.top))).toBe(true);
    if (width > height) {
      expect(boxes.tools.bottom - boxes.tools.top).toBeGreaterThan(boxes.tools.right - boxes.tools.left);
      expect(Math.abs((boxes.tools.top + boxes.tools.bottom) / 2 - height / 2)).toBeLessThan(1);
      expect(boxes.tools.right).toBeLessThanOrEqual(width - 12);
      expect(boxes.tools.top).toBeGreaterThan(boxes.actions.bottom + 5);
    }
    expect(boxes.panda.right).toBeLessThan(boxes.tools.left);
    expect(boxes.panda.right - boxes.panda.left).toBeGreaterThan(width <= 600 ? 48 : width > height && height <= 540 ? 52 : 80);
    expect(Math.abs((boxes.panel.left + boxes.panel.right) / 2 - (boxes.hud.left + boxes.hud.right) / 2)).toBeLessThan(1);
    await expect(page.locator('.hud > #arcade-panel')).toHaveCount(1);
    if (width > height && height <= 540) expect(boxes.actions.left).toBeGreaterThan(boxes.panel.right);
    if (width === 1440 || width === 390 || width === 320 || width === 844) await page.screenshot({ path: `test-results/${test.info().project.name}-arcade-${width}x${height}.png` });
    // Check the largest actual image bounds during a successful pair reaction.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator(`[data-id="${data.plan[12][0]}"]`).click();
    await page.locator(`[data-id="${data.plan[12][1]}"]`).click();
    const peak = await page.locator('#panda-face').evaluate(el => {
      const animation = el.getAnimations().find(a => (a as CSSAnimation).animationName === 'panda-pair')!;
      animation.pause(); animation.currentTime = 375;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    expect(peak.left).toBeGreaterThanOrEqual(8);
    expect(peak.right).toBeLessThanOrEqual(boxes.tools.left - 8);
    expect(peak.right <= boxes.arena.left - 8 || peak.top >= boxes.arena.bottom + 8).toBe(true);
    expect(peak.bottom).toBeLessThanOrEqual(height - 8);
  });
}

test('Arcade panda, points and profile are available offline', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not expose Service Workers.');
  await seed(page, savedRound(12));
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  expect(await page.locator('#panda-face').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await page.evaluate(() => {
    const choices = [0, 0, .99]; let index = 0;
    Math.random = () => choices[index++ % choices.length];
  });
  const expressionSources = new Set<string>();
  for (let i = 0; i < 3; i++) {
    await page.locator('#arcade-panda').click();
    await expect.poll(() => page.locator('#panda-face').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expressionSources.add((await page.locator('#panda-face').getAttribute('src'))!);
  }
  expect(expressionSources.size).toBe(3);
  const game: Game = await page.evaluate(() => JSON.parse(localStorage.getItem('mahjong.game.v1')!));
  const [a, b] = matches(game)[0];
  await pair(page, [a.id, b.id]);
  await expect(page.locator('#arcade-score')).toHaveText('1.300');
});
