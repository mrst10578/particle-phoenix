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
    window.__PHOENIX_LAB__.setDisplay('solid');
  });
  await page.waitForTimeout(420);
  after = await page.evaluate(() => window.__PHOENIX_LAB__.getState());
  if (after.shapeMode !== 'phoenix') throw new Error('Phoenix target restore failed');
  if (!(after.pulse > 0)) throw new Error('Royal Pulse did not activate');

  const visual = await page.evaluate(() => {
    const canvas = document.querySelector('.viewport canvas');
    if (!canvas) return { error: 'missing-canvas' };
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return { error: 'missing-webgl-context' };

    const width = Math.min(canvas.width, 720);
    const height = Math.min(canvas.height, 720);
    const x = Math.max(0, Math.floor((canvas.width - width) / 2));
    const y = Math.max(0, Math.floor((canvas.height - height) / 2));
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let lit = 0;
    let bright = 0;
    let maxLuma = 0;
    let totalLuma = 0;
    const sampleCount = width * height;
    for (let i = 0; i < pixels.length; i += 4) {
      const luma = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
      totalLuma += luma;
      if (luma > 8) lit++;
      if (luma > 28) bright++;
      if (luma > maxLuma) maxLuma = luma;
    }

    return {
      width,
      height,
      litRatio: lit / sampleCount,
      brightRatio: bright / sampleCount,
      meanLuma: totalLuma / sampleCount,
      maxLuma
    };
  });

  if (visual.error) throw new Error('Framebuffer probe failed: ' + visual.error);
  if (visual.litRatio < 0.008 || visual.maxLuma < 32) {
    throw new Error('WebGL framebuffer appears blank: ' + JSON.stringify(visual));
  }

  await mkdir('artifacts', { recursive: true });
  try {
    const dataUrl = await page.evaluate(() => document.querySelector('.viewport canvas')?.toDataURL('image/png') || null);
    if (dataUrl?.startsWith('data:image/png;base64,')) {
      await writeFile('artifacts/phoenix-v2-canvas.png', Buffer.from(dataUrl.split(',')[1], 'base64'));
    }
  } catch (error) {
    console.warn('Canvas evidence capture skipped:', error.message);
  }

  if (errors.length) {
    throw new Error('Runtime errors detected:\n' + errors.join('\n'));
  }

  console.log(JSON.stringify({
    url: testUrl.toString(),
    state,
    adapter,
    ui,
    after,
    visual
  }, null, 2));
} finally {
  await browser.close();
}
