import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRoyalPhoenix } from './phoenix.js?v=2.1.1';
import { loadPhoenixGLB } from './glb-adapter.js?v=2.1.1';
import { createPhoenixParticles } from './particles.js?v=2.1.1';
import { createFeatherAccents } from './feather-accents.js?v=2.1.1';
import { createCinematicEnvironment } from './cinematic-effects.js?v=2.1.1';
import { CinematicShader } from './postfx.js?v=2.1.1';
import { createRoyalAudioCue } from './royal-audio.js?v=2.1.1';

const bootStartedAt = performance.now();
let firstRenderMs = null;
const bootState = { stage: 'module-start', marks: [], error: null };
window.__PHOENIX_BOOT__ = bootState;
function markBoot(stage) {
  bootState.stage = stage;
  bootState.marks.push({ stage, ms: Math.round((performance.now() - bootStartedAt) * 10) / 10 });
}
window.addEventListener('error', (event) => {
  bootState.error = event.error?.stack || event.message || String(event.error || 'window-error');
});
window.addEventListener('unhandledrejection', (event) => {
  bootState.error = event.reason?.stack || String(event.reason || 'unhandled-rejection');
});
markBoot('module-start');

const viewport = document.querySelector('[data-viewport]');
const loading = document.querySelector('[data-loading]');
const params = new URLSearchParams(window.location.search);
const captureMode = params.get('capture') === '1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
const hardwareCores = navigator.hardwareConcurrency || (isMobile ? 4 : 8);
const deviceMemory = navigator.deviceMemory || (isMobile ? 4 : 8);
const lowPowerMobile = isMobile && (hardwareCores <= 4 || deviceMemory <= 4);

function computeRenderPixelRatio() {
  const cssPixels = Math.max(1, window.innerWidth * window.innerHeight);
  const pixelBudget = isMobile ? 1_450_000 : 3_600_000;
  const budgetRatio = Math.sqrt(pixelBudget / cssPixels);
  const hardCap = isMobile ? 1.8 : 2.0;
  return Math.max(1, Math.min(window.devicePixelRatio || 1, hardCap, budgetRatio));
}

let renderPixelRatio = computeRenderPixelRatio();
const performanceProfile = isMobile
  ? (lowPowerMobile ? 'mobile-lean' : 'mobile-balanced')
  : 'desktop-balanced';
const particleBudget = isMobile
  ? (lowPowerMobile ? 10000 : 14000)
  : 22000;
const featherBudget = isMobile
  ? (lowPowerMobile ? 40 : 54)
  : 92;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020102);
scene.fog = new THREE.FogExp2(0x040103, isMobile ? 0.030 : 0.023);

const camera = new THREE.PerspectiveCamera(37, window.innerWidth / window.innerHeight, 0.1, 90);
camera.position.set(0, 0.18, isMobile ? 13.15 : 11.75);

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: captureMode
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(renderPixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = false;
viewport.appendChild(renderer.domElement);

function initializeEnvironmentLighting() {
  if (scene.environment) return;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  scene.environment = pmrem.fromScene(roomEnvironment, 0.035).texture;
  roomEnvironment.traverse((node) => {
    node.geometry?.dispose?.();
    if (Array.isArray(node.material)) node.material.forEach((material) => material?.dispose?.());
    else node.material?.dispose?.();
  });
  pmrem.dispose();
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.058;
controls.enablePan = false;
controls.minDistance = 6.7;
controls.maxDistance = 17.5;
controls.maxPolarAngle = Math.PI * 0.76;
controls.minPolarAngle = Math.PI * 0.24;
controls.target.set(0, -0.28, 0);
controls.autoRotate = !reducedMotion;
controls.autoRotateSpeed = 0.46;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderPixelRatio);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.92,
  0.78,
  0.24
);
composer.addPass(bloomPass);

const cinematicPass = new ShaderPass(CinematicShader);
cinematicPass.uniforms.uResolution.value = new THREE.Vector2(
  window.innerWidth * renderPixelRatio,
  window.innerHeight * renderPixelRatio
);
cinematicPass.uniforms.uMotion.value = reducedMotion ? 0 : 1;
composer.addPass(cinematicPass);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x4b1020, 0x020102, 0.34);
scene.add(hemi);

const key = new THREE.SpotLight(0xffc77a, 122, 30, Math.PI * 0.205, 0.82, 1.12);
key.position.set(4.7, 8.0, 6.7);
key.target.position.set(0, 0.18, 0);
key.castShadow = false;
scene.add(key, key.target);

const crimsonRim = new THREE.PointLight(0xc90f32, 88, 20, 1.72);
crimsonRim.position.set(-5.9, 2.1, -3.9);
scene.add(crimsonRim);

const goldRim = new THREE.PointLight(0xe0b76f, 72, 18, 1.62);
goldRim.position.set(5.5, -0.25, -2.9);
scene.add(goldRim);

const royalFill = new THREE.PointLight(0x661126, 24, 14, 1.95);
royalFill.position.set(0, -4.0, 4.7);
scene.add(royalFill);

const chestLight = new THREE.PointLight(0xd54129, 12, 8, 2.0);
chestLight.position.set(0, 0.1, 2.2);
scene.add(chestLight);

const baseLight = {
  key: key.intensity,
  crimson: crimsonRim.intensity,
  gold: goldRim.intensity,
  fill: royalFill.intensity,
  chest: chestLight.intensity
};

let phoenix = createRoyalPhoenix();
let modelSource = 'procedural';
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
      sampleCount: particleBudget,
      targetSpan: isMobile ? 7.7 : 8.35,
      royalize: true
    });
    modelSource = candidate.source;
    break;
  } catch (error) {
    console.warn('Phoenix GLB candidate failed:', candidate.url, error);
  }
}

markBoot('model-ready');

phoenix.group.scale.setScalar(isMobile ? 0.95 : 1);
phoenix.group.position.y = 0.05;

const motionRoot = new THREE.Group();
motionRoot.name = 'RoyalPhoenixMotionRoot';
motionRoot.add(phoenix.group);
scene.add(motionRoot);

// First paint the actual Phoenix before building the heavier particle/FX layers.
phoenix.setOpacity?.(1);
renderer.render(scene, camera);
firstRenderMs = performance.now() - bootStartedAt;
markBoot('first-render');
loading?.classList.add('is-hidden');
const scheduleIdle = window.requestIdleCallback
  ? (callback) => window.requestIdleCallback(callback, { timeout: 900 })
  : (callback) => window.setTimeout(callback, 220);
scheduleIdle(initializeEnvironmentLighting);

markBoot('particles-start');
const particleSystem = createPhoenixParticles({
  phoenixTargets: phoenix.anchors,
  count: particleBudget,
  pixelRatio: renderPixelRatio
});
particleSystem.points.position.copy(phoenix.group.position);
particleSystem.points.scale.copy(phoenix.group.scale);
particleSystem.setPointSize(isMobile ? 0.11 : 0.10);
motionRoot.add(particleSystem.points);
markBoot('particles-ready');

markBoot('feathers-start');
const featherAccents = createFeatherAccents(phoenix.anchors, {
  count: featherBudget
});
featherAccents.mesh.position.copy(phoenix.group.position);
featherAccents.mesh.scale.copy(phoenix.group.scale);
motionRoot.add(featherAccents.mesh);
markBoot('feathers-ready');

markBoot('environment-start');
const heroFx = createCinematicEnvironment({
  scene,
  anchors: phoenix.anchors,
  isMobile,
  reducedMotion,
  pixelRatio: renderPixelRatio
});

markBoot('environment-ready');

const audioCue = createRoyalAudioCue({ enabled: true });
markBoot('audio-ready');

function makeStars() {
  const count = isMobile ? (lowPowerMobile ? 420 : 620) : 1150;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const gold = new THREE.Color(0xd8b15c);
  const crimson = new THREE.Color(0x6d1728);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = 15 + Math.random() * 28;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 22;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;
    color.copy(i % 17 === 0 ? gold : crimson);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.043,
    vertexColors: true,
    transparent: true,
    opacity: 0.46,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

markBoot('stars-start');
const stars = makeStars();
markBoot('stars-ready');

const quality = 'ultra';
let displayMode = 'hybrid';
let shapeMode = 'phoenix';
const motionEnabled = !reducedMotion;
const pointerTarget = new THREE.Vector2();
const pointer = new THREE.Vector2();
let intro = reducedMotion ? 1 : 0;
let lastIdlePulse = 0;

function setDisplay(mode) {
  displayMode = mode;
  if (mode === 'solid') {
    phoenix.group.visible = true;
    phoenix.setOpacity?.(1);
    particleSystem.points.visible = false;
    particleSystem.setOpacity?.(0);
    featherAccents.mesh.visible = true;
  } else if (mode === 'particle') {
    phoenix.group.visible = false;
    particleSystem.points.visible = true;
    particleSystem.setOpacity?.(1);
    featherAccents.mesh.visible = false;
  } else {
    phoenix.group.visible = true;
    phoenix.setOpacity?.(1);
    particleSystem.points.visible = true;
    particleSystem.setOpacity?.(0.52);
    featherAccents.mesh.visible = true;
  }
}

function setShape(name) {
  shapeMode = name;
  particleSystem.setTarget(name, { seconds: name === 'phoenix' ? 1.7 : 1.45 });
  if (name !== 'phoenix') setDisplay('particle');
  else if (displayMode === 'particle') setDisplay('hybrid');
}

function resetCamera() {
  camera.position.set(0, 0.18, isMobile ? 13.15 : 11.75);
  controls.target.set(0, -0.28, 0);
  controls.update();
}

function capturePhoenixProbe(size = 512) {
  if (!captureMode) return null;

  const probeSize = THREE.MathUtils.clamp(Math.floor(size), 128, 768);
  const target = new THREE.WebGLRenderTarget(probeSize, probeSize, {
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;

  const previousTarget = renderer.getRenderTarget();
  const previousAspect = camera.aspect;
  const previousHeroFxVisible = heroFx.group.visible;
  const previousStarsVisible = stars.visible;
  const previousParticleVisible = particleSystem.points.visible;
  const previousPhoenixVisible = phoenix.group.visible;
  const previousFeathersVisible = featherAccents.mesh.visible;

  heroFx.group.visible = false;
  stars.visible = false;
  particleSystem.points.visible = false;
  phoenix.group.visible = true;
  featherAccents.mesh.visible = true;
  phoenix.setOpacity?.(1);

  camera.aspect = 1;
  camera.updateProjectionMatrix();

  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);

  const pixels = new Uint8Array(probeSize * probeSize * 4);
  renderer.readRenderTargetPixels(target, 0, 0, probeSize, probeSize, pixels);

  let lit = 0;
  let bright = 0;
  let totalLuma = 0;
  let maxLuma = 0;
  const count = probeSize * probeSize;
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    totalLuma += luma;
    if (luma > 8) lit++;
    if (luma > 28) bright++;
    if (luma > maxLuma) maxLuma = luma;
  }

  const canvas = document.createElement('canvas');
  canvas.width = probeSize;
  canvas.height = probeSize;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(probeSize, probeSize);
  const rowBytes = probeSize * 4;
  for (let y = 0; y < probeSize; y++) {
    const src = (probeSize - 1 - y) * rowBytes;
    const dst = y * rowBytes;
    image.data.set(pixels.subarray(src, src + rowBytes), dst);
  }
  ctx.putImageData(image, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');

  renderer.setRenderTarget(previousTarget);
  target.dispose();

  camera.aspect = previousAspect;
  camera.updateProjectionMatrix();
  heroFx.group.visible = previousHeroFxVisible;
  stars.visible = previousStarsVisible;
  particleSystem.points.visible = previousParticleVisible;
  phoenix.group.visible = previousPhoenixVisible;
  featherAccents.mesh.visible = previousFeathersVisible;
  setDisplay(displayMode);

  return {
    width: probeSize,
    height: probeSize,
    litRatio: lit / count,
    brightRatio: bright / count,
    meanLuma: totalLuma / count,
    maxLuma,
    dataUrl
  };
}

function triggerRoyalPulse({ sensory = true, amount = 1 } = {}) {
  heroFx.triggerPulse(amount);
  particleSystem.triggerPulse(amount);
  phoenix.triggerPulse?.(amount);

  if (sensory) {
    audioCue.trigger();
    if (navigator.vibrate) navigator.vibrate(12);
  }
}

function awakenSequence() {
  setDisplay('particle');
  particleSystem.setTarget('scatter', { seconds: 0.72 });
  triggerRoyalPulse({ sensory: false, amount: 1.25 });
  window.setTimeout(() => {
    particleSystem.setTarget('phoenix', { seconds: 1.35 });
    setDisplay('hybrid');
  }, reducedMotion ? 40 : 620);
}

markBoot('initial-state-start');
setDisplay('hybrid');
phoenix.setOpacity?.(1);
particleSystem.setTarget('phoenix', { seconds: reducedMotion ? 0.2 : 2.15 });
particleSystem.setDensity(1);
particleSystem.setPixelRatio(renderPixelRatio);
heroFx.setIntro(intro);
markBoot('initial-state-ready');

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const motion = motionEnabled ? 1 : 0;

  pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 5.2));
  phoenix.setPointer?.(pointer.x, pointer.y);
  heroFx.setPointer(pointer.x, pointer.y);

  if (!reducedMotion && intro < 1) {
    intro = Math.min(1, intro + dt / 2.45);
    const reveal = 1 - Math.pow(1 - intro, 3);
    heroFx.setIntro(reveal);
  }

  const breathe = 1 + Math.sin(time * 1.16) * 0.0065 * motion;
  const revealScale = reducedMotion ? 1 : THREE.MathUtils.lerp(0.965, 1, 1 - Math.pow(1 - intro, 3));
  motionRoot.position.y = Math.sin(time * 0.70) * 0.13 * motion;
  motionRoot.position.x = Math.sin(time * 0.30) * 0.035 * motion + pointer.x * 0.055 * motion;
  motionRoot.rotation.z = Math.sin(time * 0.41) * 0.011 * motion - pointer.x * 0.012 * motion;
  motionRoot.rotation.x = Math.sin(time * 0.28) * 0.005 * motion + pointer.y * 0.008 * motion;
  motionRoot.scale.setScalar(breathe * revealScale);

  controls.target.x = pointer.x * 0.10 * motion;
  controls.target.y = -0.28 + pointer.y * 0.065 * motion;
  controls.update();

  phoenix.update(time, motion, dt);
  particleSystem.update(dt, time, motion);
  heroFx.update(dt, time, motion);
  featherAccents.update(time, motion, heroFx.pulse);
  stars.rotation.y += dt * 0.010 * motion;
  stars.rotation.x = Math.sin(time * 0.08) * 0.008 * motion;

  const pulse = heroFx.pulse;
  const breatheLight = 1 + Math.sin(time * 1.08) * 0.025 * motion;
  key.intensity = baseLight.key * breatheLight * (1 + pulse * 0.18);
  crimsonRim.intensity = baseLight.crimson * (1 + pulse * 0.42);
  goldRim.intensity = baseLight.gold * (1 + pulse * 0.34);
  royalFill.intensity = baseLight.fill * (1 + pulse * 0.22);
  chestLight.intensity = baseLight.chest * (1 + pulse * 1.25);

  cinematicPass.uniforms.uTime.value = time;
  cinematicPass.uniforms.uPulse.value = pulse;
  cinematicPass.uniforms.uMotion.value = motion;

  if (motion && intro >= 1 && time - lastIdlePulse > 17.5) {
    lastIdlePulse = time;
    triggerRoyalPulse({ sensory: false, amount: 0.72 });
  }

  composer.render();
}

function setPointerFromEvent(event) {
  pointerTarget.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -((event.clientY / window.innerHeight) * 2 - 1)
  );
}

window.addEventListener('pointermove', setPointerFromEvent, { passive: true });
window.addEventListener('pointerleave', () => pointerTarget.set(0, 0));
window.addEventListener('pointerdown', (event) => {
  setPointerFromEvent(event);
  triggerRoyalPulse({ sensory: true, amount: 1 });
}, { passive: true });
window.addEventListener('dblclick', awakenSequence);

window.addEventListener('resize', () => {
  renderPixelRatio = computeRenderPixelRatio();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(renderPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setPixelRatio(renderPixelRatio);
  composer.setSize(window.innerWidth, window.innerHeight);
  particleSystem.setPixelRatio(renderPixelRatio);
  cinematicPass.uniforms.uResolution.value.set(
    window.innerWidth * renderPixelRatio,
    window.innerHeight * renderPixelRatio
  );
});

window.addEventListener('keydown', (event) => {
  if (event.key === '1') setShape('phoenix');
  if (event.key === '2') setShape('rose');
  if (event.key === '3') setShape('crown');
  if (event.key === '4') setShape('scatter');
  if (event.key.toLowerCase() === 'r') resetCamera();
  if (event.code === 'Space') {
    event.preventDefault();
    triggerRoyalPulse({ sensory: true, amount: 1 });
  }
  if (event.key.toLowerCase() === 'a') awakenSequence();
});

const startupMs = performance.now() - bootStartedAt;
markBoot('api-start');

window.__PHOENIX_LAB__ = {
  version: '2.1.0',
  setShape,
  setDisplay,
  pulse: (amount = 1) => triggerRoyalPulse({ sensory: false, amount }),
  awaken: awakenSequence,
  resetCamera,
  captureProbe: captureMode ? capturePhoenixProbe : undefined,
  phoenixAdapter: phoenix.adapterContract,
  getState: () => ({
    quality,
    displayMode,
    shapeMode,
    particles: particleSystem.activeCount,
    modelSource,
    motion: motionEnabled,
    intro,
    pulse: heroFx.pulse,
    menu: false,
    captureMode,
    performanceProfile,
    renderPixelRatio,
    realtimeShadows: false,
    particleBudget,
    firstRenderMs,
    startupMs
  })
};
markBoot('ready');

animate();
