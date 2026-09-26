import { readFileSync, existsSync } from 'node:fs';

const required = [
  'index.html',
  'src/styles.css',
  'src/app.js',
  'src/phoenix.js',
  'src/particles.js',
  'src/shapes.js',
  'src/ui.js',
  'src/glb-adapter.js',
  'models/README.md',
  'models/royal-phoenix-external-v1.glb',
  'models/royal-phoenix-v1.glb',
  'ASSET_CREDITS.md',
  'docs/PRODUCT_SPEC.md',
  'docs/IMPLEMENTATION_PLAN.md',
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

const app = readFileSync('src/app.js', 'utf8');
for (const token of ['createRoyalPhoenix', 'loadPhoenixGLB', 'createPhoenixParticles', 'createLabUI']) {
  if (!app.includes(token)) {
    console.error('app.js is missing integration token:', token);
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

console.log('Static project contract OK');
