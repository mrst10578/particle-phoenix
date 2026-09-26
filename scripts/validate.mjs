import { readFileSync, existsSync } from 'node:fs';

const required = [
  'index.html',
  'src/styles.css',
  'src/app.js',
  'src/phoenix.js',
  'src/particles.js',
  'src/shapes.js',
  'src/royal-material.js',
  'src/glb-adapter.js',
  'src/cinematic-effects.js',
  'src/postfx.js',
  'src/royal-audio.js',
  'models/README.md',
  'models/royal-phoenix-external-v1.glb',
  'models/royal-phoenix-v1.glb',
  'ASSET_CREDITS.md',
  'docs/PRODUCT_SPEC.md',
  'docs/PRODUCT_SPEC_V2.md',
  'docs/IMPLEMENTATION_PLAN.md',
  'docs/IMPLEMENTATION_PLAN_V2.md',
  'docs/ZZZOPS_GOALS.md',
  'references/phoenix/LoPRax_Phoenix_3D_Reference_Pack.zip'
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}

const html = readFileSync('index.html', 'utf8');
for (const token of ['./src/styles.css', './src/app.js', 'type="importmap"']) {
  if (!html.includes(token)) {
    console.error('index.html is missing required token:', token);
    process.exit(1);
  }
}
if (html.includes('data-lab-panel') || html.includes('data-panel-toggle')) {
  console.error('Public Phoenix V2 surface must remain menu-free');
  process.exit(1);
}

const app = readFileSync('src/app.js', 'utf8');
for (const token of [
  'createRoyalPhoenix',
  'loadPhoenixGLB',
  'createPhoenixParticles',
  'createCinematicEnvironment',
  'CinematicShader',
  'createRoyalAudioCue',
  'RoyalPhoenixMotionRoot',
  'triggerRoyalPulse'
]) {
  if (!app.includes(token)) {
    console.error('app.js is missing V2 integration token:', token);
    process.exit(1);
  }
}

for (const modelPath of ['models/royal-phoenix-external-v1.glb', 'models/royal-phoenix-v1.glb']) {
  const glb = readFileSync(modelPath);
  if (glb.length < 100_000 || glb.subarray(0, 4).toString('ascii') !== 'glTF') {
    console.error('Phoenix GLB is missing or invalid:', modelPath);
    process.exit(1);
  }
}

if (!app.includes("./models/royal-phoenix-external-v1.glb")) {
  console.error('app.js does not load the external Royal Phoenix GLB by default');
  process.exit(1);
}
if (!app.includes("./models/royal-phoenix-v1.glb")) {
  console.error('app.js does not retain the internal GLB fallback');
  process.exit(1);
}
if (!app.includes("quality = 'ultra'")) {
  console.error('Phoenix V2 must remain locked to Ultra quality');
  process.exit(1);
}
if (!readFileSync('src/particles.js', 'utf8').includes('ShaderMaterial')) {
  console.error('Phoenix V2 particles are not using the GPU shader path');
  process.exit(1);
}

console.log('Royal Phoenix V2 static project contract OK');
