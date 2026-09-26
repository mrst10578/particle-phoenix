import * as THREE from 'three';
import { createRoseShape, createCrownShape, createScatterShape } from './shapes.js?v=2.1.1';

function resample(source, count) {
  const srcCount = source.positions.length / 3;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const j = (i * 1543 + 97) % srcCount;
    positions[i * 3] = source.positions[j * 3];
    positions[i * 3 + 1] = source.positions[j * 3 + 1];
    positions[i * 3 + 2] = source.positions[j * 3 + 2];
    colors[i * 3] = source.colors[j * 3];
    colors[i * 3 + 1] = source.colors[j * 3 + 1];
    colors[i * 3 + 2] = source.colors[j * 3 + 2];
  }
  return { positions, colors };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const vertexShader = /* glsl */`
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec3 aColorFrom;
  attribute vec3 aColorTo;
  attribute float aSeed;

  uniform float uProgress;
  uniform float uTime;
  uniform float uMotion;
  uniform float uPulse;
  uniform float uDriftScale;
  uniform float uPixelRatio;
  uniform float uPointScale;

  varying vec3 vColor;
  varying float vSeed;
  varying float vPulse;

  void main() {
    float e = uProgress;
    vec3 pos = mix(aFrom, aTo, e);

    float phase = aSeed * 6.28318530718;
    vec3 drift = vec3(
      sin(uTime * 1.31 + phase),
      cos(uTime * 1.03 + phase * 1.7),
      sin(uTime * 1.19 + phase * 0.63)
    ) * uDriftScale * uMotion;

    pos += drift;
    pos *= 1.0 + uPulse * (0.010 + aSeed * 0.012);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float classScale = mix(0.72, 1.55, fract(aSeed * 7.31));
    float depthScale = clamp(8.0 / max(4.0, -mvPosition.z), 0.55, 1.45);
    gl_PointSize = (2.3 + classScale * 2.7) * uPixelRatio * uPointScale * depthScale * (1.0 + uPulse * 0.32);

    vec3 baseColor = mix(aColorFrom, aColorTo, e);
    float goldClass = step(0.88, aSeed);
    float emberClass = 1.0 - step(0.17, aSeed);
    baseColor = mix(baseColor, vec3(1.0, 0.74, 0.30), goldClass * 0.24);
    baseColor = mix(baseColor, vec3(1.0, 0.15, 0.035), emberClass * 0.18);

    vColor = baseColor;
    vSeed = aSeed;
    vPulse = uPulse;
  }
`;

const fragmentShader = /* glsl */`
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vSeed;
  varying float vPulse;

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;

    float glow = pow(max(0.0, 1.0 - d), 2.15);
    float core = 1.0 - smoothstep(0.0, 0.36, d);
    float soft = 1.0 - smoothstep(0.12, 1.0, d);
    float dustClass = smoothstep(0.0, 0.24, vSeed) * (1.0 - smoothstep(0.24, 0.46, vSeed));
    float alpha = soft * mix(0.44, 0.92, core);
    alpha *= mix(0.68, 1.0, dustClass);
    alpha *= 0.82 + vPulse * 0.18;

    vec3 color = vColor * (0.72 + core * 1.35 + glow * 0.72);
    color += vec3(1.0, 0.34, 0.06) * glow * (0.08 + vPulse * 0.12);
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

export function createPhoenixParticles({ phoenixTargets, count = 22000, pixelRatio = 1 }) {
  const targets = {
    phoenix: resample(phoenixTargets, count),
    rose: createRoseShape(count),
    crown: createCrownShape(count),
    scatter: createScatterShape(count)
  };

  const from = new Float32Array(targets.scatter.positions);
  const to = new Float32Array(targets.phoenix.positions);
  const colorFrom = new Float32Array(targets.scatter.colors);
  const colorTo = new Float32Array(targets.phoenix.colors);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = ((i * 16807) % 2147483647) / 2147483647;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(from, 3));
  geometry.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
  geometry.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
  geometry.setAttribute('aColorFrom', new THREE.BufferAttribute(colorFrom, 3));
  geometry.setAttribute('aColorTo', new THREE.BufferAttribute(colorTo, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uPulse: { value: 0 },
    uDriftScale: { value: 0.018 },
    uPixelRatio: { value: pixelRatio },
    uPointScale: { value: 1 },
    uOpacity: { value: 1 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'PhoenixParticlesV2';
  points.frustumCulled = false;

  let progress = 0;
  let duration = 1.45;
  let targetName = 'phoenix';
  let density = 1;
  let visibleCount = count;
  let pulse = 0;
  geometry.setDrawRange(0, visibleCount);

  function bakeCurrentIntoFrom() {
    const eased = easeInOutCubic(progress);
    const fromAttr = geometry.attributes.aFrom.array;
    const toAttr = geometry.attributes.aTo.array;
    const fromColor = geometry.attributes.aColorFrom.array;
    const toColor = geometry.attributes.aColorTo.array;

    for (let i = 0; i < count * 3; i++) {
      fromAttr[i] = THREE.MathUtils.lerp(fromAttr[i], toAttr[i], eased);
      fromColor[i] = THREE.MathUtils.lerp(fromColor[i], toColor[i], eased);
    }
  }

  function setTarget(name, { immediate = false, seconds = 1.45 } = {}) {
    const next = targets[name];
    if (!next) return;

    bakeCurrentIntoFrom();
    geometry.attributes.aTo.array.set(next.positions);
    geometry.attributes.aColorTo.array.set(next.colors);
    geometry.attributes.aFrom.needsUpdate = true;
    geometry.attributes.aTo.needsUpdate = true;
    geometry.attributes.aColorFrom.needsUpdate = true;
    geometry.attributes.aColorTo.needsUpdate = true;

    targetName = name;
    duration = Math.max(0.2, seconds);
    progress = immediate ? 1 : 0;
    uniforms.uProgress.value = immediate ? 1 : 0;
    uniforms.uDriftScale.value = name === 'scatter' ? 0.065 : 0.018;

    if (immediate) {
      geometry.attributes.aFrom.array.set(next.positions);
      geometry.attributes.aColorFrom.array.set(next.colors);
      geometry.attributes.aFrom.needsUpdate = true;
      geometry.attributes.aColorFrom.needsUpdate = true;
    }
  }

  function update(dt, time, motion = 1) {
    if (progress < 1) progress = Math.min(1, progress + dt / duration);
    pulse = Math.max(0, pulse - dt * 2.15);

    uniforms.uProgress.value = easeInOutCubic(progress);
    uniforms.uTime.value = time;
    uniforms.uMotion.value = motion;
    uniforms.uPulse.value = pulse;
  }

  function setDensity(value) {
    density = THREE.MathUtils.clamp(value, 0.25, 1);
    visibleCount = Math.floor(count * density);
    geometry.setDrawRange(0, visibleCount);
  }

  function setPointSize(value) {
    uniforms.uPointScale.value = THREE.MathUtils.clamp(value / 0.1, 0.45, 2.2);
  }

  function setPixelRatio(value) {
    uniforms.uPixelRatio.value = Math.min(Math.max(value, 1), 2.25);
  }

  function setOpacity(value) {
    uniforms.uOpacity.value = THREE.MathUtils.clamp(value, 0, 1);
  }

  function triggerPulse(amount = 1) {
    pulse = Math.max(pulse, THREE.MathUtils.clamp(amount, 0, 1.5));
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return {
    points,
    update,
    setTarget,
    setDensity,
    setPointSize,
    setPixelRatio,
    setOpacity,
    triggerPulse,
    dispose,
    get targetName() { return targetName; },
    get activeCount() { return visibleCount; },
    get progress() { return progress; },
    maxCount: count
  };
}
