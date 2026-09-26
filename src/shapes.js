import * as THREE from 'three';

const GOLD = new THREE.Color(0xd9b261);
const CRIMSON = new THREE.Color(0xa70f2d);
const BURGUNDY = new THREE.Color(0x4c0718);
const EMBER = new THREE.Color(0xff5a36);

function seeded(index) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function writeColor(array, index, color, intensity = 1) {
  array[index * 3] = color.r * intensity;
  array[index * 3 + 1] = color.g * intensity;
  array[index * 3 + 2] = color.b * intensity;
}

export function createRoseShape(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = seeded(i * 4 + 1);
    const v = seeded(i * 4 + 2);
    const w = seeded(i * 4 + 3);
    const layer = Math.floor(u * 11);
    const layerT = layer / 10;
    const petals = 5 + layer;
    const petal = Math.floor(v * petals);
    const t = w;
    const baseAngle = (petal / petals) * Math.PI * 2 + layer * 2.399963;
    const width = Math.sin(t * Math.PI);
    const side = seeded(i * 7 + 9) * 2 - 1;
    const angle = baseAngle + side * width * (0.28 - layerT * 0.1);
    const radius = 0.25 + layerT * 2.45 + t * (0.28 + layerT * 0.45);
    const cup = (1 - layerT) * 1.6 + layerT * 0.35;
    const y = 1.2 - layerT * 2.3 + Math.sin(t * Math.PI) * cup - Math.pow(t, 2) * layerT * 0.8;
    const r = radius - side * side * 0.18;

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r * 0.75;

    const color = i % 13 === 0 ? GOLD : (layerT > 0.7 ? CRIMSON : BURGUNDY);
    writeColor(colors, i, color, i % 17 === 0 ? 1.25 : 1);
  }

  return { positions, colors };
}

export function createCrownShape(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const spikeCount = 5;

  for (let i = 0; i < count; i++) {
    const r = seeded(i * 5 + 1);
    const depth = (seeded(i * 5 + 2) - 0.5) * 0.5;

    if (r < 0.42) {
      const a = seeded(i * 5 + 3) * Math.PI * 2;
      const radius = 2.45 + (seeded(i * 5 + 4) - 0.5) * 0.22;
      positions[i * 3] = Math.cos(a) * radius;
      positions[i * 3 + 1] = -1.15 + Math.sin(a * 2) * 0.12;
      positions[i * 3 + 2] = Math.sin(a) * 0.72 + depth;
    } else {
      const spike = Math.floor(seeded(i * 5 + 6) * spikeCount);
      const local = seeded(i * 5 + 7);
      const angle = -1.05 + (spike / (spikeCount - 1)) * 2.1;
      const baseX = Math.sin(angle) * 2.2;
      const baseY = -0.85 + Math.cos(angle) * 0.15;
      const tipHeight = spike === 2 ? 3.1 : (spike === 1 || spike === 3 ? 2.35 : 1.75);
      const tipX = Math.sin(angle) * (spike === 2 ? 0.25 : 1.55);
      positions[i * 3] = THREE.MathUtils.lerp(baseX, tipX, local);
      positions[i * 3 + 1] = THREE.MathUtils.lerp(baseY, tipHeight, local);
      positions[i * 3 + 2] = depth * (1 - local * 0.5);
    }

    writeColor(colors, i, i % 9 === 0 ? EMBER : GOLD, i % 23 === 0 ? 1.4 : 1);
  }

  return { positions, colors };
}

export function createScatterShape(count, radiusMin = 7, radiusMax = 13) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const dark = new THREE.Color(0x44101c);

  for (let i = 0; i < count; i++) {
    const u = seeded(i * 3 + 1);
    const v = seeded(i * 3 + 2);
    const r = THREE.MathUtils.lerp(radiusMin, radiusMax, seeded(i * 3 + 3));
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    writeColor(colors, i, i % 19 === 0 ? EMBER : dark, i % 19 === 0 ? 1.35 : 0.8);
  }

  return { positions, colors };
}
