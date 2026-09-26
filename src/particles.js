import * as THREE from 'three';
import { createRoseShape, createCrownShape, createScatterShape } from './shapes.js';

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,245,220,.95)');
  g.addColorStop(0.35, 'rgba(255,110,65,.45)');
  g.addColorStop(1, 'rgba(255,30,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

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

export function createPhoenixParticles({ phoenixTargets, count = 9000 }) {
  const targets = {
    phoenix: resample(phoenixTargets, count),
    rose: createRoseShape(count),
    crown: createCrownShape(count),
    scatter: createScatterShape(count)
  };

  const current = new Float32Array(targets.scatter.positions);
  const from = new Float32Array(current);
  const to = new Float32Array(targets.phoenix.positions);
  const currentColors = new Float32Array(targets.scatter.colors);
  const colorFrom = new Float32Array(currentColors);
  const colorTo = new Float32Array(targets.phoenix.colors);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = Math.random() * Math.PI * 2;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(current, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.105,
    map: createGlowTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'PhoenixParticles';
  let progress = 0;
  let duration = 1.35;
  let targetName = 'phoenix';
  let density = 0.72;
  let visibleCount = Math.floor(count * density);
  geometry.setDrawRange(0, visibleCount);

  function setTarget(name, { immediate = false, seconds = 1.35 } = {}) {
    const next = targets[name];
    if (!next) return;
    from.set(current);
    colorFrom.set(currentColors);
    to.set(next.positions);
    colorTo.set(next.colors);
    targetName = name;
    duration = Math.max(0.2, seconds);
    progress = immediate ? 1 : 0;
    if (immediate) {
      current.set(to);
      currentColors.set(colorTo);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
  }

  function update(dt, time, motion = 1) {
    if (progress < 1) progress = Math.min(1, progress + dt / duration);
    const eased = easeInOutCubic(progress);
    const driftScale = targetName === 'scatter' ? 0.055 : 0.018;
    for (let i = 0; i < visibleCount; i++) {
      const k = i * 3;
      const drift = Math.sin(time * 1.3 + seeds[i]) * driftScale * motion;
      current[k] = THREE.MathUtils.lerp(from[k], to[k], eased) + drift;
      current[k + 1] = THREE.MathUtils.lerp(from[k + 1], to[k + 1], eased) + Math.cos(time + seeds[i]) * driftScale * 0.8 * motion;
      current[k + 2] = THREE.MathUtils.lerp(from[k + 2], to[k + 2], eased) + drift * 0.6;

      currentColors[k] = THREE.MathUtils.lerp(colorFrom[k], colorTo[k], eased);
      currentColors[k + 1] = THREE.MathUtils.lerp(colorFrom[k + 1], colorTo[k + 1], eased);
      currentColors[k + 2] = THREE.MathUtils.lerp(colorFrom[k + 2], colorTo[k + 2], eased);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    material.size = 0.098 + Math.sin(time * 2.1) * 0.008 * motion;
  }

  function setDensity(value) {
    const previousVisibleCount = visibleCount;
    density = THREE.MathUtils.clamp(value, 0.25, 1);
    visibleCount = Math.floor(count * density);

    // Newly revealed particles enter at the active target instead of exposing
    // stale positions that were intentionally skipped while hidden.
    if (visibleCount > previousVisibleCount) {
      const target = targets[targetName];
      for (let i = previousVisibleCount; i < visibleCount; i++) {
        const k = i * 3;
        current[k] = target.positions[k];
        current[k + 1] = target.positions[k + 1];
        current[k + 2] = target.positions[k + 2];
        currentColors[k] = target.colors[k];
        currentColors[k + 1] = target.colors[k + 1];
        currentColors[k + 2] = target.colors[k + 2];
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }

    geometry.setDrawRange(0, visibleCount);
  }

  function setPointSize(value) {
    material.size = THREE.MathUtils.clamp(value, 0.045, 0.2);
  }

  function dispose() {
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
  }

  return {
    points,
    update,
    setTarget,
    setDensity,
    setPointSize,
    dispose,
    get targetName() { return targetName; },
    get activeCount() { return visibleCount; },
    maxCount: count
  };
}
