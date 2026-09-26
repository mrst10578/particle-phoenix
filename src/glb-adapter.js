import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { applyRoyalMaterial, updateRoyalMaterials, ROYAL } from './royal-material.js';

function materialColor(material) {
  if (Array.isArray(material)) return materialColor(material[0]);
  return material?.color?.clone?.() ?? ROYAL.crimson.clone();
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
    scale: targetSpan / maxDimension,
    center: new THREE.Vector3()
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

    if (royalize) {
      const material = applyRoyalMaterial(node);
      if (material) materials.add(material);
    } else {
      const list = Array.isArray(node.material) ? node.material : [node.material];
      list.filter(Boolean).forEach((material) => materials.add(material));
    }
    meshes.push(node);
  });

  if (!meshes.length) throw new Error('The supplied GLB contains no mesh geometry.');

  const normalization = normalizeModel(group, sourceScene, targetSpan);
  group.updateMatrixWorld(true);
  const anchors = makeAnchors(meshes, sampleCount);

  let mixer = null;
  let activeAnimationCount = 0;
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(sourceScene);
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip);
      action.reset().fadeIn(0.28).play();
      activeAnimationCount++;
    }
  }

  const pointer = new THREE.Vector2();
  let pulse = 0;

  function setOpacity(opacity) {
    materials.forEach((material) => {
      material.transparent = opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.62;
      material.needsUpdate = true;
    });
  }

  function setPointer(x, y) {
    pointer.set(x, y);
  }

  function triggerPulse(amount = 1) {
    pulse = Math.max(pulse, THREE.MathUtils.clamp(amount, 0, 1.5));
  }

  function update(time, motion = 1, dt = 0) {
    if (mixer && dt > 0 && motion > 0) mixer.update(dt * motion);

    if (motion) {
      group.rotation.y = Math.sin(time * 0.24) * 0.022 + pointer.x * 0.012;
      group.rotation.z = Math.sin(time * 0.17) * 0.004 - pointer.x * 0.004;
      group.rotation.x = pointer.y * 0.004;
    }

    pulse = Math.max(0, pulse - dt * 1.9);
    updateRoyalMaterials(materials, { time, motion, pulse, pointer });
  }

  return {
    group,
    anchors,
    update,
    setOpacity,
    setPointer,
    triggerPulse,
    palette: ROYAL,
    adapterContract: {
      type: 'glb',
      source: url,
      sampledMeshes: meshes.length,
      normalization,
      royalized: royalize,
      animations: activeAnimationCount,
      targetContract: '{ positions: Float32Array, colors: Float32Array }'
    }
  };
}
