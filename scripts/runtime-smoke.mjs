import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.PHOENIX_URL || 'https://mrst10578.github.io/particle-phoenix/';
const testUrl = new URL(baseUrl);
testUrl.searchParams.set('capture', '1');
testUrl.searchParams.set('smoke', String(Date.now()));

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });

  await page.goto(testUrl.toString(), { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__PHOENIX_LAB__), null, { timeout: 60000 });
  await page.waitForTimeout(3400);

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
  if (state.captureMode !== true) throw new Error('Capture verification mode did not activate');
  if (state.particles < 18000) throw new Error('Desktop particle count unexpectedly low: ' + state.particles);
  if (state.realtimeShadows !== false) throw new Error('Realtime shadows should be disabled in the optimized runtime');
  if (!(state.firstPaintMs > 0 && state.startupMs > state.firstPaintMs)) {
    throw new Error('Expected first Phoenix paint before full FX startup: ' + JSON.stringify({
      firstPaintMs: state.firstPaintMs,
      startupMs: state.startupMs
    }));
  }
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
    window.__PHOENIX_LAB__.setDisplay('solid');
  });
  await page.waitForTimeout(420);
  after = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
  if (after.shapeMode !== 'phoenix') throw new Error('Phoenix target restore failed');
  if (!(after.pulse > 0)) throw new Error('Royal Pulse did not activate');

  const visual = await page.evaluate(() => {
    if (typeof window.__PHOENIX_LAB__.captureProbe !== 'function') {
      return { error: 'missing-capture-probe' };
    }
    return window.__PHOENIX_LAB__.captureProbe(512);
  });

  if (visual.error) throw new Error('Framebuffer probe failed: ' + visual.error);
  if (visual.litRatio < 0.008 || visual.maxLuma < 32) {
    throw new Error('WebGL framebuffer appears blank: ' + JSON.stringify(visual));
  }

  await mkdir('artifacts', { recursive: true });
  try {
    if (visual.dataUrl?.startsWith('data:image/png;base64,')) {
      await writeFile('artifacts/phoenix-v2-model-probe.png', Buffer.from(visual.dataUrl.split(',')[1], 'base64'));
    }
  } catch (error) {
    console.warn('Model probe evidence capture skipped:', error.message);
  }

  const visualSummary = { ...visual };
  delete visualSummary.dataUrl;

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 Chrome/140 Safari/537.36'
  });
  const mobilePage = await mobileContext.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', (error) => mobileErrors.push('pageerror: ' + error.message));
  mobilePage.on('console', (message) => {
    if (message.type() === 'error') mobileErrors.push('console: ' + message.text());
  });

  const mobileUrl = new URL(baseUrl);
  mobileUrl.searchParams.set('smokeMobile', String(Date.now()));
  await mobilePage.goto(mobileUrl.toString(), { waitUntil: 'networkidle', timeout: 120000 });
  await mobilePage.waitForFunction(() => Boolean(window.__PHOENIX_LAB__), null, { timeout: 60000 });
  await mobilePage.waitForTimeout(1200);

  const mobileState = await mobilePage.evaluate(() => window.__PHOENIX_LAB__.getState());
  if (!String(mobileState.performanceProfile).startsWith('mobile-')) {
    throw new Error('Mobile optimization profile did not activate: ' + JSON.stringify(mobileState));
  }
  if (mobileState.particles > 14000) {
    throw new Error('Mobile particle budget is too high: ' + mobileState.particles);
  }
  if (mobileState.renderPixelRatio > 1.81) {
    throw new Error('Mobile pixel ratio budget is too high: ' + mobileState.renderPixelRatio);
  }
  if (mobileState.realtimeShadows !== false) {
    throw new Error('Realtime shadows unexpectedly enabled on mobile');
  }
  if (!(mobileState.firstPaintMs > 0 && mobileState.startupMs > mobileState.firstPaintMs)) {
    throw new Error('Mobile first paint did not precede full FX startup: ' + JSON.stringify({
      firstPaintMs: mobileState.firstPaintMs,
      startupMs: mobileState.startupMs
    }));
  }
  if (mobileErrors.length) {
    throw new Error('Mobile runtime errors detected:\n' + mobileErrors.join('\n'));
  }
  await mobileContext.close();

  if (errors.length) {
    throw new Error('Runtime errors detected:\n' + errors.join('\n'));
  }

  console.log(JSON.stringify({
    url: testUrl.toString(),
    state,
    adapter,
    ui,
    after,
    visual: visualSummary,
    mobileState
  }, null, 2));
} finally {
  await browser.close();
}
