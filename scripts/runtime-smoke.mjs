import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.PHOENIX_URL || 'https://mrst10578.github.io/particle-phoenix/';

function withParams(base, entries) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(entries)) url.searchParams.set(key, String(value));
  return url.toString();
}

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

  const desktopUrl = withParams(baseUrl, {
    capture: 1,
    profile: 'desktop',
    smoke: Date.now()
  });

  await page.goto(desktopUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__PHOENIX_LAB__), null, { timeout: 60000 });
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
  const adapter = await page.evaluate(() => window.__PHOENIX_LAB__.phoenixAdapter);
  const publicApi = await page.evaluate(() => ({
    hasSetShape: typeof window.__PHOENIX_LAB__.setShape === 'function',
    hasSetDisplay: typeof window.__PHOENIX_LAB__.setDisplay === 'function'
  }));
  const ui = await page.evaluate(() => ({
    menus: document.querySelectorAll('[data-lab-panel], .lab-panel, [data-panel-toggle]').length,
    canvases: document.querySelectorAll('canvas').length,
    loadingHidden: document.querySelector('[data-loading]')?.classList.contains('is-hidden') ?? false
  }));

  if (state.modelSource !== 'external-glb') throw new Error('Expected external-glb, got ' + state.modelSource);
  if (state.quality !== 'ultra') throw new Error('Expected ultra quality, got ' + state.quality);
  if (state.menu !== false || ui.menus !== 0) throw new Error('Public UI is not menu-free');
  if (state.captureMode !== true) throw new Error('Capture verification mode did not activate');
  if ('particles' in state) throw new Error('Body particle state still exists');
  if (publicApi.hasSetShape || publicApi.hasSetDisplay) throw new Error('Morph/display particle APIs still exist');
  if (state.ambientMotes < 6 || state.ambientMotes > 20) {
    throw new Error('Unexpected desktop ambient mote count: ' + state.ambientMotes);
  }
  if (state.anchorSamples > 2000) throw new Error('Anchor sample budget is unexpectedly high: ' + state.anchorSamples);
  if (state.realtimeShadows !== false) throw new Error('Realtime shadows must stay disabled');
  if (!(state.firstRenderMs > 0 && state.startupMs >= state.firstRenderMs)) {
    throw new Error('Invalid startup metrics: ' + JSON.stringify({
      firstRenderMs: state.firstRenderMs,
      startupMs: state.startupMs
    }));
  }
  if (!adapter || adapter.type !== 'glb' || !String(adapter.source).includes('royal-phoenix-external-v1.glb')) {
    throw new Error('External GLB adapter is not active');
  }
  if (ui.canvases < 1) throw new Error('No canvas rendered');
  if (!ui.loadingHidden) throw new Error('Loading overlay did not hide');

  await page.evaluate(() => window.__PHOENIX_LAB__.pulse(1));
  await page.waitForTimeout(240);
  const after = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
  if (!(after.pulse > 0)) throw new Error('Royal Pulse did not activate');

  const visual = await page.evaluate(() => {
    if (typeof window.__PHOENIX_LAB__.captureProbe !== 'function') {
      return { error: 'missing-capture-probe' };
    }
    return window.__PHOENIX_LAB__.captureProbe(512);
  });

  if (visual.error) throw new Error('Render probe failed: ' + visual.error);
  if (visual.litRatio < 0.008 || visual.maxLuma < 28) {
    throw new Error('Phoenix render target appears blank: ' + JSON.stringify(visual));
  }

  await mkdir('artifacts', { recursive: true });
  if (visual.dataUrl?.startsWith('data:image/png;base64,')) {
    await writeFile(
      'artifacts/phoenix-v3-solid-probe.png',
      Buffer.from(visual.dataUrl.split(',')[1], 'base64')
    );
  }

  const visualSummary = { ...visual };
  delete visualSummary.dataUrl;

  if (errors.length) throw new Error('Desktop runtime errors:\n' + errors.join('\n'));

  await page.evaluate(() => {
    const canvas = document.querySelector('.viewport canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await page.close();

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

  const mobileUrl = withParams(baseUrl, {
    profile: 'mobile',
    smokeMobile: Date.now()
  });
  await mobilePage.goto(mobileUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await mobilePage.waitForFunction(() => Boolean(window.__PHOENIX_LAB__), null, { timeout: 60000 });
  await mobilePage.waitForTimeout(900);

  const mobileState = await mobilePage.evaluate(() => window.__PHOENIX_LAB__.getState());
  if (!String(mobileState.performanceProfile).startsWith('mobile-')) {
    throw new Error('Mobile profile did not activate: ' + JSON.stringify(mobileState));
  }
  if (mobileState.ambientMotes > 10) {
    throw new Error('Too many mobile ambient motes: ' + mobileState.ambientMotes);
  }
  if (mobileState.anchorSamples > 1000) {
    throw new Error('Mobile anchor sampling budget is too high: ' + mobileState.anchorSamples);
  }
  if (mobileState.renderPixelRatio > 1.81) {
    throw new Error('Mobile pixel ratio budget is too high: ' + mobileState.renderPixelRatio);
  }
  if (mobileState.realtimeShadows !== false) {
    throw new Error('Realtime shadows unexpectedly enabled on mobile');
  }
  if ('particles' in mobileState) throw new Error('Mobile body particle state still exists');
  if (mobileErrors.length) throw new Error('Mobile runtime errors:\n' + mobileErrors.join('\n'));

  await mobileContext.close();

  console.log(JSON.stringify({
    url: desktopUrl,
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
