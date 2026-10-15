import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const playwright = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright-core');
const browser = await playwright.chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const base = process.env.TEST_URL || 'http://127.0.0.1:4173/';
const out = resolve(process.env.TEST_ARTIFACTS || 'test-results');
await mkdir(out, { recursive: true });
const checks = [], errors = [], failedAssets = [];
const check = (condition, message) => { assert.ok(condition, message); checks.push(message); };
async function pageFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) failedAssets.push({ url: response.url(), status: response.status() }); });
  return { context, page };
}
async function ready(page) { await page.goto(base); await page.waitForSelector('html[data-ready=true]'); }
try {
  const { page, context } = await pageFor();
  await ready(page);
  await page.waitForSelector('#hero-stage[data-ready=true]');
  check(await page.locator('#hero-stage').getAttribute('data-ready') === 'true', 'Hero WebGL scene renders');
  check(await page.locator('#work-title br').count() === 1 && await page.locator('#work-title em').count() === 1, 'Text splitting preserves line breaks and emphasis');
  check(await page.locator('h1').getAttribute('aria-label') === 'Benedicto Boseke', 'Hero heading has an intact accessible name');
  check(await page.locator('#connect-title').getAttribute('aria-label') === 'Thanks for stopping by.', 'Decorative symbols stay out of heading accessible names');
  await page.waitForTimeout(1100);
  await page.screenshot({ path: resolve(out, 'desktop-hero.png') });
  const railInfo = await page.locator('#project-rail').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, card: el.querySelector('article').getBoundingClientRect().width, columns: getComputedStyle(el).gridAutoColumns }));
  console.log('Rail layout:', JSON.stringify(railInfo));

  await page.locator('#menu-toggle').click();
  check(await page.locator('#site-menu').evaluate(el => el.open), 'Menu opens as a modal dialog');
  for (let index = 0; index < 12; index++) await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.activeElement.closest('#site-menu') !== null), 'Keyboard focus stays inside the menu');
  await page.keyboard.press('Escape');
  check(await page.locator('#menu-toggle').evaluate(el => el === document.activeElement), 'Escape closes menu and restores opener focus');
  await page.locator('#menu-toggle').click();
  await page.locator('[data-menu-link][href="#work"]').click();
  await page.waitForFunction(() => location.hash === '#work' && !document.querySelector('#transition-curtain').classList.contains('is-active'));
  check(await page.locator('#site-menu').evaluate(el => !el.open), 'Menu link closes dialog and completes its section transition');
  const workTop = await page.locator('#work').evaluate(el => el.getBoundingClientRect().top);
  check(workTop >= 80 && workTop < 140, 'Section navigation clears the fixed header');
  await page.goBack();
  await page.waitForFunction(() => location.hash === '');
  await page.goForward();
  await page.waitForFunction(() => location.hash === '#work');
  check(true, 'Browser Back and Forward retain section navigation');

  await page.locator('[data-filter="python"]').click();
  check(await page.locator('.project-card:not([hidden])').count() === 1, 'Python filter exposes exactly one real project');
  await page.locator('[data-project-open="machine-learning-skripsi"]').click();
  check(await page.locator('#project-dialog-title').textContent() === 'Machine Learning', 'Project dialog opens the selected project');
  check((await page.locator('#project-dialog-link').getAttribute('href')).endsWith('/machine-learning-skripsi'), 'Project dialog links to the correct repository');
  await page.keyboard.press('Escape');
  check(await page.locator('[data-project-open="machine-learning-skripsi"]').evaluate(el => el === document.activeElement), 'Project dialog returns focus on Escape');
  await page.locator('[data-filter="web"]').click();
  check(await page.locator('.project-card:not([hidden])').count() === 5, 'Web filter exposes five real projects');
  await page.locator('[data-filter="all"]').click();
  await page.locator('#rail-next').click();
  await page.waitForFunction(() => document.querySelector('#project-rail').scrollLeft > 100);
  check(true, 'Project carousel advances');
  await page.locator('#rail-prev').click();
  await page.waitForFunction(() => document.querySelector('#project-rail').scrollLeft < 2);
  check(true, 'Project carousel returns to the beginning');

  await page.locator('#motion-toggle').click();
  check(await page.locator('html').getAttribute('data-motion') === 'off', 'Motion pause stops optional animation');
  await page.locator('#objects').scrollIntoViewIfNeeded();
  await page.waitForSelector('#object-stage[data-ready=true]');
  const orbit = await page.locator('#object-canvas').screenshot();
  await page.locator('[data-object="ribbon"]').click();
  check((await page.locator('#object-title').textContent()).includes('Ribbon'), 'Showcase switches to Ribbon');
  const ribbon = await page.locator('#object-canvas').screenshot();
  check(!orbit.equals(ribbon), 'Switching sculpture changes rendered pixels');
  await page.locator('[data-object="constellation"]').click();
  check(await page.locator('button[data-object="constellation"]').getAttribute('aria-pressed') === 'true', 'Showcase selection exposes its pressed state');
  await page.locator('#object-stage').focus();
  const beforeTurn = await page.locator('#object-canvas').screenshot();
  await page.keyboard.press('ArrowRight');
  check(!beforeTurn.equals(await page.locator('#object-canvas').screenshot()), 'Keyboard rotates the WebGL object with motion paused');
  await page.locator('#object-reset').click();
  await page.screenshot({ path: resolve(out, 'desktop-playground.png') });
  await page.locator('#object-canvas').evaluate(canvas => { const gl = canvas.getContext('webgl'); window.testLostContext = gl.getExtension('WEBGL_lose_context'); window.testLostContext.loseContext(); });
  await page.waitForFunction(() => document.querySelector('#object-stage').dataset.ready === 'false');
  check(await page.locator('#object-stage .scene-fallback').isVisible(), 'WebGL context loss exposes static artwork');
  await page.waitForTimeout(150);
  await page.evaluate(() => window.testLostContext.restoreContext());
  await page.waitForSelector('#object-stage[data-ready=true]');
  check(true, 'WebGL context restoration recovers the sculpture');
  await page.reload(); await page.waitForSelector('html[data-ready=true]');
  check(await page.locator('html').getAttribute('data-motion') === 'off', 'Motion choice persists after reload');
  await page.locator('#connect').scrollIntoViewIfNeeded();
  await page.locator('#copy-profile').click();
  await page.waitForFunction(() => /copied|Copy this link/.test(document.querySelector('#copy-status').textContent));
  check(/copied|Copy this link/.test(await page.locator('#copy-status').textContent()), 'Copy action reports success or a usable fallback');
  await context.close();

  const mobile = await pageFor({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ready(mobile.page);
  await mobile.page.waitForTimeout(900);
  check(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile page has no horizontal overflow');
  await mobile.page.screenshot({ path: resolve(out, 'mobile-hero.png') });
  await mobile.page.locator('#menu-toggle').click();
  check(await mobile.page.locator('[data-menu-link][href="#connect"]').isVisible(), 'Mobile menu exposes all section links');
  await mobile.page.screenshot({ path: resolve(out, 'mobile-menu.png') });
  await mobile.page.keyboard.press('Escape');
  await mobile.page.locator('[data-filter="python"]').click();
  check(await mobile.page.locator('.project-card:not([hidden])').count() === 1, 'Mobile filtering works');
  await mobile.page.locator('[data-filter="all"]').click();
  await mobile.page.locator('#objects').scrollIntoViewIfNeeded();
  await mobile.page.locator('[data-object="ribbon"]').click();
  check((await mobile.page.locator('#object-title').textContent()).includes('Ribbon'), 'Mobile object selection works');
  await mobile.page.setViewportSize({ width: 844, height: 390 });
  await mobile.page.waitForTimeout(200);
  check(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Landscape resize preserves layout');
  await mobile.context.close();

  const reduced = await pageFor({ reducedMotion: 'reduce' });
  await ready(reduced.page);
  check(await reduced.page.locator('html').getAttribute('data-motion') === 'off', 'System reduced motion disables decorative animation');
  check(await reduced.page.locator('#motion-toggle').isDisabled(), 'System reduced motion cannot be overridden accidentally');
  check(await reduced.page.locator('.reveal-pending').count() === 0, 'Reduced motion exposes all essential content');
  await reduced.context.close();

  const fallback = await pageFor();
  await fallback.page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return String(type).startsWith('webgl') || type === 'experimental-webgl' ? null : getContext.call(this, type, ...args); };
  });
  await ready(fallback.page);
  check(await fallback.page.locator('#hero-stage .scene-fallback').isVisible(), 'Devices without WebGL receive static hero artwork');
  await fallback.page.locator('[data-object="ribbon"]').click();
  check((await fallback.page.locator('#object-title').textContent()).includes('Ribbon'), 'Study descriptions remain usable without WebGL');
  await fallback.context.close();

  const plain = await pageFor({ javaScriptEnabled: false });
  await plain.page.goto(base);
  check(await plain.page.locator('.project-card').count() === 6, 'All six project links are present without JavaScript');
  check(await plain.page.locator('#menu-toggle').isHidden(), 'No-JS page hides the unsupported menu control');
  check(await plain.page.locator('.detail-button:visible').count() === 0, 'No-JS page hides unsupported project dialogs');
  await plain.context.close();

  const trimmed = await pageFor();
  await trimmed.page.route('**/scripts/features.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace(/: true,/g, ': false,') });
  });
  await ready(trimmed.page);
  check(await trimmed.page.locator('#objects').isHidden() && await trimmed.page.locator('#timeline').isHidden(), 'Feature flags hide optional sections');
  check(await trimmed.page.locator('[href="#objects"]').isHidden(), 'Trimming a section also removes its navigation link');
  check(await trimmed.page.locator('#project-rail').evaluate(el => el.classList.contains('is-grid')), 'Disabling carousel restores a regular project grid');
  check(await trimmed.page.locator('.project-card:not([hidden])').count() === 6, 'Feature trimming preserves project content');
  await trimmed.context.close();
  check(errors.length === 0, `No JavaScript errors (${errors.length})`);
  check(failedAssets.length === 0, `No missing local assets (${failedAssets.length})`);
  await writeFile(resolve(out, 'validation.json'), JSON.stringify({ passed: checks.length, checks, errors, failedAssets }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors, failedAssets, artifacts: out }));
} catch (error) {
  console.error(error);
  console.error(JSON.stringify({ checks, errors, failedAssets }));
  process.exitCode = 1;
} finally { await browser.close(); }
