import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.PHOENIX_URL || 'https://mrst10578.github.io/particle-phoenix/';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push('console: ' + message.text());
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => Boolean(window.__PHOENIX_LAB__), null, { timeout: 60000 });
await page.waitForTimeout(3200);

const state = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
const adapter = await page.evaluate(() => window.__PHOENIX_LAB__.phoenixAdapter);
const ui = await page.evaluate(() => ({
  menus: document.querySelectorAll('[data-lab-panel], .lab-panel, [data-panel-toggle]').length,
  canvases: document.querySelectorAll('canvas').length,
  loadingHidden: document.querySelector('[data-loading]')?.classList.contains('is-hidden') ?? false
}));

if (state.modelSource !== 'external-glb') throw new Error('Expected external-glb, got ' + state.modelSource);
if (state.quality !== 'ultra') throw new Error('Expected ultra quality, got ' + state.quality);
if (state.menu !== false || ui.menus !== 0) throw new Error('Public UI is not menu-free');
if (state.particles < 20000) throw new Error('Particle count unexpectedly low: ' + state.particles);
if (!adapter || adapter.type !== 'glb' || !String(adapter.source).includes('royal-phoenix-external-v1.glb')) {
  throw new Error('External GLB adapter is not active');
}
if (ui.canvases < 1) throw new Error('No canvas rendered');
if (!ui.loadingHidden) throw new Error('Loading overlay did not hide');

await page.evaluate(() => window.__PHOENIX_LAB__.setShape('rose'));
await page.waitForTimeout(250);
let after = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
if (after.shapeMode !== 'rose' || after.displayMode !== 'particle') {
  throw new Error('Rose particle morph control failed');
}

await page.evaluate(() => {
  window.__PHOENIX_LAB__.setShape('phoenix');
  window.__PHOENIX_LAB__.pulse(1);
});
await page.waitForTimeout(350);
after = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
if (after.shapeMode !== 'phoenix') throw new Error('Phoenix target restore failed');
if (!(after.pulse > 0)) throw new Error('Royal Pulse did not activate');

await mkdir('artifacts', { recursive: true });
try {
  await page.evaluate(() => window.__PHOENIX_LAB__.setDisplay('solid'));
  await page.waitForTimeout(120);
  const cdp = await page.context().newCDPSession(page);
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  const { writeFile } = await import('node:fs/promises');
  await writeFile('artifacts/phoenix-v2.png', Buffer.from(shot.data, 'base64'));
} catch (error) {
  console.warn('Visual evidence capture skipped:', error.message);
}

if (errors.length) {
  throw new Error('Runtime errors detected:\n' + errors.join('\n'));
}

console.log(JSON.stringify({ url, state, adapter, ui, after }, null, 2));
await browser.close();
