import { readFileSync, existsSync } from 'node:fs';

const required = [
  'index.html',
  'src/styles.css',
  'src/app.js',
  'src/phoenix.js',
  'src/particles.js',
  'src/shapes.js',
  'src/ui.js',
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
for (const token of ['createRoyalPhoenix', 'createPhoenixParticles', 'createLabUI']) {
  if (!app.includes(token)) {
    console.error('app.js is missing integration token:', token);
    process.exit(1);
  }
}

console.log('Static project contract OK');
