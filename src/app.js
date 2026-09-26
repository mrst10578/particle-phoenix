import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRoyalPhoenix } from './phoenix.js';
import { loadPhoenixGLB } from './glb-adapter.js';
import { createPhoenixParticles } from './particles.js';
import { createCinematicEnvironment } from './cinematic-effects.js';
import { CinematicShader } from './postfx.js';
import { createRoyalAudioCue } from './royal-audio.js';

const viewport = document.querySelector('[data-viewport]');
const loading = document.querySelector('[data-loading]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
const maxPixelRatio = Math.min(window.devicePixelRatio, 3);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020102);
scene.fog = new THREE.FogExp2(0x040103, isMobile ? 0.030 : 0.023);

const camera = new THREE.PerspectiveCamera(37, window.innerWidth / window.innerHeight, 0.1, 90);
camera.position.set(0, 0.18, isMobile ? 13.15 : 11.75);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(maxPixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
scene.environment = pmrem.fromScene(roomEnvironment, 0.035).texture;
roomEnvironment.dispose();
pmrem.dispose();

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
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.14,
  0.86,
  0.20
);
composer.addPass(bloomPass);

const cinematicPass = new ShaderPass(CinematicShader);
cinematicPass.uniforms.uResolution.value = new THREE.Vector2(
  window.innerWidth * maxPixelRatio,
  window.innerHeight * maxPixelRatio
);
cinematicPass.uniforms.uMotion.value = reducedMotion ? 0 : 1;
composer.addPass(cinematicPass);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0x671329, 0x020102, 0.46);
scene.add(hemi);

const key = new THREE.SpotLight(0xffc878, 152, 30, Math.PI * 0.215, 0.80, 1.12);
key.position.set(4.7, 8.0, 6.7);
key.target.position.set(0, 0.18, 0);
key.castShadow = true;
key.shadow.mapSize.set(4096, 4096);
key.shadow.bias = -0.00012;
key.shadow.normalBias = 0.018;
scene.add(key, key.target);

const crimsonRim = new THREE.PointLight(0xff123a, 124, 20, 1.72);
crimsonRim.position.set(-5.9, 2.1, -3.9);
scene.add(crimsonRim);

const goldRim = new THREE.PointLight(0xffd78c, 96, 18, 1.62);
goldRim.position.set(5.5, -0.25, -2.9);
scene.add(goldRim);

const royalFill = new THREE.PointLight(0x8d1733, 36, 14, 1.95);
royalFill.position.set(0, -4.0, 4.7);
scene.add(royalFill);

const chestLight = new THREE.PointLight(0xff5d34, 18, 8, 2.0);
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
      sampleCount: isMobile ? 26000 : 36000,
      targetSpan: isMobile ? 7.7 : 8.35,
      royalize: true
    });
    modelSource = candidate.source;
    break;
  } catch (error) {
    console.warn('Phoenix GLB candidate failed:', candidate.url, error);
  }
}

phoenix.group.scale.setScalar(isMobile ? 0.95 : 1);
phoenix.group.position.y = 0.05;

const motionRoot = new THREE.Group();
motionRoot.name = 'RoyalPhoenixMotionRoot';
motionRoot.add(phoenix.group);
scene.add(motionRoot);

const particleSystem = createPhoenixParticles({
  phoenixTargets: phoenix.anchors,
  count: isMobile ? 26000 : 36000,
  pixelRatio: maxPixelRatio
});
particleSystem.points.position.copy(phoenix.group.position);
particleSystem.points.scale.copy(phoenix.group.scale);
motionRoot.add(particleSystem.points);

const heroFx = createCinematicEnvironment({
  scene,
  anchors: phoenix.anchors,
  isMobile,
  reducedMotion,
  pixelRatio: maxPixelRatio
});

const audioCue = createRoyalAudioCue({ enabled: true });

function makeStars() {
  const count = isMobile ? 1000 : 1900;
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

const stars = makeStars();

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
  } else if (mode === 'particle') {
    phoenix.group.visible = false;
    particleSystem.points.visible = true;
  } else {
    phoenix.group.visible = true;
    phoenix.setOpacity?.(0.78);
    particleSystem.points.visible = true;
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

setDisplay('hybrid');
phoenix.setOpacity?.(reducedMotion ? 0.78 : 0);
particleSystem.setTarget('phoenix', { seconds: reducedMotion ? 0.2 : 2.45 });
particleSystem.setDensity(1);
particleSystem.setPixelRatio(maxPixelRatio);
heroFx.setIntro(intro);

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
    phoenix.setOpacity?.(0.78 * reveal);
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
  stars.rotation.y += dt * 0.010 * motion;
  stars.rotation.x = Math.sin(time * 0.08) * 0.008 * motion;

  const pulse = heroFx.pulse;
  key.intensity = baseLight.key * (1 + pulse * 0.28);
  crimsonRim.intensity = baseLight.crimson * (1 + pulse * 0.72);
  goldRim.intensity = baseLight.gold * (1 + pulse * 0.62);
  royalFill.intensity = baseLight.fill * (1 + pulse * 0.36);
  chestLight.intensity = baseLight.chest * (1 + pulse * 2.2);

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
  const ratio = Math.min(window.devicePixelRatio, 3);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  composer.setSize(window.innerWidth, window.innerHeight);
  particleSystem.setPixelRatio(ratio);
  cinematicPass.uniforms.uResolution.value.set(
    window.innerWidth * ratio,
    window.innerHeight * ratio
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

window.__PHOENIX_LAB__ = {
  version: '2.0.0',
  setShape,
  setDisplay,
  pulse: (amount = 1) => triggerRoyalPulse({ sensory: false, amount }),
  awaken: awakenSequence,
  resetCamera,
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
    menu: false
  })
};

window.setTimeout(() => loading?.classList.add('is-hidden'), reducedMotion ? 30 : 360);
animate();
