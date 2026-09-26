import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

const ROYAL = {
  obsidian: new THREE.Color(0x10070a),
  charcoal: new THREE.Color(0x241016),
  burgundy: new THREE.Color(0x4b0718),
  crimson: new THREE.Color(0xa10d2d),
  scarlet: new THREE.Color(0xd63743),
  gold: new THREE.Color(0xd6ac58),
  ember: new THREE.Color(0xff653b)
};

function materialColor(material) {
  if (Array.isArray(material)) return materialColor(material[0]);
  return material?.color?.clone?.() ?? ROYAL.crimson.clone();
}

function royalColorForPoint(x, y, z, box, out = new THREE.Color()) {
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const nx = Math.min(1, Math.abs(x - center.x) / Math.max(size.x * 0.5, 1e-5));
  const ny = THREE.MathUtils.clamp((y - box.min.y) / Math.max(size.y, 1e-5), 0, 1);
  const nz = Math.min(1, Math.abs(z - center.z) / Math.max(size.z * 0.5, 1e-5));
  const edge = Math.max(nx, nz);

  const crimsonMask = THREE.MathUtils.clamp(0.18 + edge * 0.68 + (1 - ny) * 0.12, 0, 1);
  const goldTip = THREE.MathUtils.smoothstep(edge, 0.80, 1.0);
  const crownGold = THREE.MathUtils.smoothstep(ny, 0.87, 1.0) * 0.72;
  const goldMask = Math.max(goldTip * 0.68, crownGold);
  const shadowMask = THREE.MathUtils.clamp((1 - edge) * 0.58 + (0.52 - ny) * 0.18, 0, 0.72);

  out.copy(ROYAL.burgundy)
    .lerp(ROYAL.crimson, crimsonMask * 0.82)
    .lerp(ROYAL.obsidian, shadowMask)
    .lerp(ROYAL.gold, goldMask);

  if (edge > 0.94 && ny < 0.72) {
    out.lerp(ROYAL.ember, 0.16);
  }

  return out;
}

function applyRoyalMaterial(mesh) {
  const geometry = mesh.geometry;
  if (!geometry?.attributes?.position) return;

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  const box = geometry.boundingBox;
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i++) {
    royalColorForPoint(position.getX(i), position.getY(i), position.getZ(i), box, color);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.34,
    roughness: 0.34,
    clearcoat: 0.34,
    clearcoatRoughness: 0.28,
    sheen: 0.36,
    sheenColor: new THREE.Color(0x7c102a),
    emissive: new THREE.Color(0x170106),
    emissiveIntensity: 0.15,
    side: THREE.DoubleSide
  });

  material.name = 'LoPRaxRoyalPhoenix';
  mesh.material = material;
}

function normalizeModel(group, sourceScene, targetSpan) {
  const offsetRoot = new THREE.Group();
  offsetRoot.name = 'PhoenixOffsetRoot';

  const scaleRoot = new THREE.Group();
  scaleRoot.name = 'PhoenixScaleRoot';

  group.remove(sourceScene);
  offsetRoot.add(sourceScene);
  scaleRoot.add(offsetRoot);
  group.add(scaleRoot);

  group.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(group);
  const center = initialBox.getCenter(new THREE.Vector3());
  const size = initialBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1e-5);

  offsetRoot.position.copy(center).multiplyScalar(-1);
  scaleRoot.scale.setScalar(targetSpan / maxDimension);
  group.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(group);
  const finalSize = finalBox.getSize(new THREE.Vector3());

  return {
    originalSize: size,
    normalizedSize: finalSize,
    scale: targetSpan / maxDimension
  };
}

function makeAnchors(meshes, sampleCount) {
  const weights = meshes.map((mesh) => Math.max(1, mesh.geometry?.attributes?.position?.count ?? 1));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const positions = new Float32Array(sampleCount * 3);
  const colors = new Float32Array(sampleCount * 3);
  let cursor = 0;

  meshes.forEach((mesh, index) => {
    if (!mesh.geometry?.attributes?.position) return;

    const count = index === meshes.length - 1
      ? sampleCount - cursor
      : Math.max(1, Math.round(sampleCount * (weights[index] / total)));

    const sampler = new MeshSurfaceSampler(mesh).build();
    const local = new THREE.Vector3();
    const world = new THREE.Vector3();
    const sampledColor = new THREE.Color();
    const fallbackColor = materialColor(mesh.material);
    const hasVertexColors = Boolean(mesh.geometry.attributes.color);

    for (let i = 0; i < count && cursor < sampleCount; i++, cursor++) {
      if (hasVertexColors) sampler.sample(local, undefined, sampledColor);
      else sampler.sample(local);

      world.copy(local).applyMatrix4(mesh.matrixWorld);
      positions[cursor * 3] = world.x;
      positions[cursor * 3 + 1] = world.y;
      positions[cursor * 3 + 2] = world.z;

      const color = hasVertexColors ? sampledColor : fallbackColor;
      colors[cursor * 3] = color.r;
      colors[cursor * 3 + 1] = color.g;
      colors[cursor * 3 + 2] = color.b;
    }
  });

  return { positions, colors };
}

export async function loadPhoenixGLB(
  url,
  {
    sampleCount = 12000,
    targetSpan = 8.2,
    royalize = true
  } = {}
) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const sourceScene = gltf.scene;

  const group = new THREE.Group();
  group.name = 'RoyalPhoenixGLB';
  group.add(sourceScene);

  const meshes = [];
  const materials = new Set();

  sourceScene.traverse((node) => {
    if (!node.isMesh) return;

    node.castShadow = false;
    node.receiveShadow = false;

    if (royalize) applyRoyalMaterial(node);

    meshes.push(node);
    const list = Array.isArray(node.material) ? node.material : [node.material];
    list.filter(Boolean).forEach((material) => materials.add(material));
  });

  if (!meshes.length) throw new Error('The supplied GLB contains no mesh geometry.');

  const normalization = normalizeModel(group, sourceScene, targetSpan);
  group.updateMatrixWorld(true);
  const anchors = makeAnchors(meshes, sampleCount);

  function setOpacity(opacity) {
    materials.forEach((material) => {
      material.transparent = opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.62;
      material.needsUpdate = true;
    });
  }

  function update(time, motion = 1) {
    if (!motion) return;
    group.rotation.y = Math.sin(time * 0.24) * 0.022;
    group.rotation.z = Math.sin(time * 0.17) * 0.004;
  }

  return {
    group,
    anchors,
    update,
    setOpacity,
    palette: ROYAL,
    adapterContract: {
      type: 'glb',
      source: url,
      sampledMeshes: meshes.length,
      normalization,
      royalized: royalize,
      targetContract: '{ positions: Float32Array, colors: Float32Array }'
    }
  };
}
