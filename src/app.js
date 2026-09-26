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
scene.background = new THREE.Color(0x050203);
scene.fog = new THREE.FogExp2(0x070204, isMobile ? 0.043 : 0.034);

const camera = new THREE.PerspectiveCamera(43, window.innerWidth / window.innerHeight, 0.1, 80);
camera.position.set(0, 0.15, isMobile ? 12.7 : 11.2);

const renderer = new THREE.WebGLRenderer({
  antialias: !isMobile,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.35 : 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;
renderer.shadowMap.enabled = false;
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
controls.autoRotateSpeed = 0.36;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  isMobile ? 0.58 : 0.82,
  0.72,
  0.28
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x8f2637, 0x070204, 0.8);
scene.add(hemi);

const key = new THREE.SpotLight(0xffb75c, 180, 28, Math.PI * 0.24, 0.85, 1.2);
key.position.set(4.5, 7.5, 6);
key.target.position.set(0, 0, 0);
scene.add(key, key.target);

const crimsonRim = new THREE.PointLight(0xff1738, 95, 18, 1.8);
crimsonRim.position.set(-5.5, 1.5, -3.5);
scene.add(crimsonRim);

const goldRim = new THREE.PointLight(0xffcf77, 70, 16, 1.7);
goldRim.position.set(5.2, -1.2, -2.5);
scene.add(goldRim);

let phoenix = createRoyalPhoenix();
const externalModelUrl = new URLSearchParams(window.location.search).get('model');
if (externalModelUrl) {
  try {
    phoenix = await loadPhoenixGLB(externalModelUrl, { sampleCount: isMobile ? 8500 : 14000 });
  } catch (error) {
    console.warn('External GLB failed; using procedural phoenix instead.', error);
  }
}
phoenix.group.scale.setScalar(isMobile ? 0.91 : 1);
phoenix.group.position.y = 0.25;
scene.add(phoenix.group);

const particleSystem = createPhoenixParticles({
  phoenixTargets: phoenix.anchors,
  count: isMobile ? 6500 : 9000
});
particleSystem.points.position.copy(phoenix.group.position);
particleSystem.points.scale.copy(phoenix.group.scale);
scene.add(particleSystem.points);

function makeStars() {
  const count = isMobile ? 320 : 650;
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
  const count = isMobile ? 90 : 180;
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
  high: { dpr: 1.85, bloom: 0.88, density: 1 },
  medium: { dpr: 1.35, bloom: 0.6, density: 0.72 },
  low: { dpr: 1, bloom: 0, density: 0.45 }
};

let quality = isMobile ? 'medium' : 'high';
let bloomEnabled = quality !== 'low';
let displayMode = 'hybrid';
let motionEnabled = !reducedMotion;
let shapeMode = 'phoenix';
let fps = 60;
let fpsAccumulator = 0;
let fpsFrames = 0;
let autoQualityCooldown = 0;

function applyQuality(next, automatic = false) {
  quality = next;
  const profile = qualityProfiles[next];
  const qualitySelect = document.querySelector('[data-quality]');
  const densityInput = document.querySelector('[data-density]');
  if (qualitySelect) qualitySelect.value = next;
  if (densityInput) densityInput.value = String(Math.round(profile.density * 100));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.dpr));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setSize(window.innerWidth, window.innerHeight);
  particleSystem.setDensity(profile.density);
  bloomPass.strength = bloomEnabled ? profile.bloom : 0;
  if (!automatic) autoQualityCooldown = 8;
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
    phoenix.setOpacity(0.5);
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
  onDensity: (value) => particleSystem.setDensity(value),
  onQuality: (value) => applyQuality(value),
  onBloom: (enabled) => {
    bloomEnabled = enabled;
    bloomPass.strength = enabled ? qualityProfiles[quality].bloom : 0;
  },
  onAutoRotate: (enabled) => { controls.autoRotate = enabled && !reducedMotion; },
  onMotion: (enabled) => { motionEnabled = enabled && !reducedMotion; },
  onReset: resetCamera,
  onFullscreen: () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
});

setDisplay('hybrid');
particleSystem.setTarget('phoenix', { seconds: 2.15 });
applyQuality(quality);
ui.setStatus('Building royal phoenix…');

const clock = new THREE.Clock();

function updateFps(dt) {
  fpsAccumulator += dt;
  fpsFrames++;
  autoQualityCooldown = Math.max(0, autoQualityCooldown - dt);
  if (fpsAccumulator >= 1) {
    fps = fpsFrames / fpsAccumulator;
    fpsAccumulator = 0;
    fpsFrames = 0;

    if (autoQualityCooldown <= 0) {
      if (fps < 38 && quality === 'high') applyQuality('medium', true);
      else if (fps < 31 && quality === 'medium') applyQuality('low', true);
      autoQualityCooldown = 7;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const motion = motionEnabled ? 1 : 0;

  controls.update();
  phoenix.update(time, motion);
  particleSystem.update(dt, time, motion);
  embers.update(dt, time, motion);
  stars.rotation.y += dt * 0.008 * motion;
  updateFps(dt);

  ui.setStats({
    fps,
    particles: particleSystem.activeCount,
    quality,
    mode: shapeMode + '/' + displayMode
  });

  if (bloomEnabled && quality !== 'low') composer.render();
  else renderer.render(scene, camera);
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
  version: '1.0.0',
  setShape,
  setDisplay,
  phoenixAdapter: phoenix.adapterContract,
  getState: () => ({ quality, displayMode, shapeMode, particles: particleSystem.activeCount })
};

requestAnimationFrame(() => {
  loading?.classList.add('is-hidden');
  ui.setStatus('Royal Phoenix Lab ready');
});
animate();
