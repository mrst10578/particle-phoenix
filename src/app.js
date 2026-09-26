import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRoyalPhoenix } from './phoenix.js';
import { loadPhoenixGLB } from './glb-adapter.js';
import { createPhoenixParticles } from './particles.js';
import { createLabUI } from './ui.js';

const viewport = document.querySelector('[data-viewport]');
const loading = document.querySelector('[data-loading]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030102);
scene.fog = new THREE.FogExp2(0x050102, isMobile ? 0.034 : 0.027);

const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 0.15, isMobile ? 12.7 : 11.2);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = false;
controls.minDistance = 7;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.76;
controls.minPolarAngle = Math.PI * 0.24;
controls.target.set(0, -0.35, 0);
controls.autoRotate = !reducedMotion;
controls.autoRotateSpeed = 0.52;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.08,
  0.82,
  0.22
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x6f162b, 0x030102, 0.52);
scene.add(hemi);

const key = new THREE.SpotLight(0xffc878, 145, 28, Math.PI * 0.22, 0.82, 1.15);
key.position.set(4.6, 7.8, 6.5);
key.target.position.set(0, 0.15, 0);
scene.add(key, key.target);

const crimsonRim = new THREE.PointLight(0xff153d, 120, 19, 1.75);
crimsonRim.position.set(-5.8, 1.9, -3.8);
scene.add(crimsonRim);

const goldRim = new THREE.PointLight(0xffd68a, 92, 17, 1.65);
goldRim.position.set(5.4, -0.4, -2.8);
scene.add(goldRim);

const royalFill = new THREE.PointLight(0x8d1733, 34, 13, 2);
royalFill.position.set(0, -4.2, 4.5);
scene.add(royalFill);

let phoenix = createRoyalPhoenix();
let modelSource = 'procedural';
const params = new URLSearchParams(window.location.search);
const proceduralOnly = params.get('procedural') === '1';
const customModelUrl = params.get('model');

const modelCandidates = proceduralOnly ? [] : [
  ...(customModelUrl ? [{ url: customModelUrl, source: 'custom-glb' }] : []),
  { url: './models/royal-phoenix-external-v1.glb', source: 'external-glb' },
  { url: './models/royal-phoenix-v1.glb', source: 'internal-glb' }
];

for (const candidate of modelCandidates) {
  try {
    phoenix = await loadPhoenixGLB(candidate.url, {
      sampleCount: isMobile ? 18000 : 28000,
      targetSpan: isMobile ? 7.55 : 8.25,
      royalize: true
    });
    modelSource = candidate.source;
    break;
  } catch (error) {
    console.warn('Phoenix GLB candidate failed:', candidate.url, error);
  }
}

phoenix.group.scale.setScalar(isMobile ? 0.94 : 1);
phoenix.group.position.y = 0.08;

const motionRoot = new THREE.Group();
motionRoot.name = 'RoyalPhoenixMotionRoot';
motionRoot.add(phoenix.group);
scene.add(motionRoot);

const particleSystem = createPhoenixParticles({
  phoenixTargets: phoenix.anchors,
  count: isMobile ? 14000 : 22000
});
particleSystem.points.position.copy(phoenix.group.position);
particleSystem.points.scale.copy(phoenix.group.scale);
motionRoot.add(particleSystem.points);

function makeStars() {
  const count = isMobile ? 720 : 1400;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 15 + Math.random() * 26;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 20;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x7c3d4a,
    size: 0.045,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

function makeEmbers() {
  const count = isMobile ? 220 : 420;
  const positions = new Float32Array(count * 3);
  const speed = new Float32Array(count);
  const phase = new Float32Array(count);

  const reset = (i, initial = false) => {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = initial ? (Math.random() - 0.5) * 10 : -5.2 - Math.random() * 1.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    speed[i] = 0.45 + Math.random() * 0.85;
    phase[i] = Math.random() * Math.PI * 2;
  };

  for (let i = 0; i < count; i++) reset(i, true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xff5d35,
    size: isMobile ? 0.075 : 0.09,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return {
    points,
    material,
    update(dt, time, motion) {
      const arr = geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += speed[i] * dt * motion;
        arr[i * 3] += Math.sin(time * 0.8 + phase[i]) * dt * 0.14 * motion;
        if (arr[i * 3 + 1] > 5.6) reset(i);
      }
      geometry.attributes.position.needsUpdate = true;
    }
  };
}

const stars = makeStars();
const embers = makeEmbers();

const qualityProfiles = {
  ultra: { dpr: 3, bloom: 1.08, density: 1 }
};

const quality = 'ultra';
const bloomEnabled = true;
let displayMode = 'hybrid';
const motionEnabled = !reducedMotion;
let shapeMode = 'phoenix';
let fps = 60;
let fpsAccumulator = 0;
let fpsFrames = 0;

function applyUltraQuality() {
  const profile = qualityProfiles.ultra;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.dpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setSize(window.innerWidth, window.innerHeight);
  particleSystem.setDensity(profile.density);
  bloomPass.strength = profile.bloom;
}

function setDisplay(mode) {
  displayMode = mode;
  if (mode === 'solid') {
    phoenix.group.visible = true;
    phoenix.setOpacity(1);
    particleSystem.points.visible = false;
  } else if (mode === 'particle') {
    phoenix.group.visible = false;
    particleSystem.points.visible = true;
  } else {
    phoenix.group.visible = true;
    phoenix.setOpacity(0.72);
    particleSystem.points.visible = true;
  }
  ui.activateDisplay(mode);
}

function setShape(name) {
  shapeMode = name;
  particleSystem.setTarget(name);
  if (name !== 'phoenix') {
    setDisplay('particle');
  }
  ui.activateShape(name);
  ui.setStatus(name === 'phoenix' ? 'Royal Phoenix target' : name.charAt(0).toUpperCase() + name.slice(1) + ' morph target');
}

function resetCamera() {
  camera.position.set(0, 0.15, isMobile ? 12.7 : 11.2);
  controls.target.set(0, -0.35, 0);
  controls.update();
}

const ui = createLabUI({
  onDisplay: setDisplay,
  onShape: setShape,

  onReset: resetCamera,
  onFullscreen: () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
});

setDisplay('hybrid');
particleSystem.setTarget('phoenix', { seconds: 2.15 });
applyUltraQuality();
ui.setStatus('Building royal phoenix…');

const clock = new THREE.Clock();

function updateFps(dt) {
  fpsAccumulator += dt;
  fpsFrames++;
  if (fpsAccumulator >= 1) {
    fps = fpsFrames / fpsAccumulator;
    fpsAccumulator = 0;
    fpsFrames = 0;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const motion = motionEnabled ? 1 : 0;

  if (motion) {
    motionRoot.position.y = Math.sin(time * 0.72) * 0.13;
    motionRoot.position.x = Math.sin(time * 0.31) * 0.035;
    motionRoot.rotation.z = Math.sin(time * 0.42) * 0.012;
    motionRoot.rotation.x = Math.sin(time * 0.29) * 0.006;
    const breathe = 1 + Math.sin(time * 1.18) * 0.0065;
    motionRoot.scale.setScalar(breathe);
  }

  controls.update();
  phoenix.update(time, motion);
  particleSystem.update(dt, time, motion);
  embers.update(dt, time, motion);
  stars.rotation.y += dt * 0.012 * motion;
  updateFps(dt);

  ui.setStats({
    fps,
    particles: particleSystem.activeCount,
    quality,
    mode: shapeMode + '/' + displayMode
  });

  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (event) => {
  if (event.key === '1') setShape('phoenix');
  if (event.key === '2') setShape('rose');
  if (event.key === '3') setShape('crown');
  if (event.key === '4') setShape('scatter');
  if (event.key.toLowerCase() === 'r') resetCamera();
});

window.__PHOENIX_LAB__ = {
  version: '1.2.0',
  setShape,
  setDisplay,
  phoenixAdapter: phoenix.adapterContract,
  getState: () => ({ quality, displayMode, shapeMode, particles: particleSystem.activeCount, modelSource })
};

requestAnimationFrame(() => {
  loading?.classList.add('is-hidden');
  const sourceLabels = {
    'external-glb': 'External Royal Phoenix ready',
    'custom-glb': 'Custom Royal Phoenix ready',
    'internal-glb': 'Internal GLB fallback ready',
    procedural: 'Procedural fallback ready'
  };
  ui.setStatus(sourceLabels[modelSource] || 'Royal Phoenix ready');
});
animate();
