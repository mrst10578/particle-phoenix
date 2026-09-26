import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

function materialColor(material) {
  if (Array.isArray(material)) return materialColor(material[0]);
  return material?.color?.clone?.() ?? new THREE.Color(0xb51c35);
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
    const color = materialColor(mesh.material);

    for (let i = 0; i < count && cursor < sampleCount; i++, cursor++) {
      sampler.sample(local);
      world.copy(local).applyMatrix4(mesh.matrixWorld);
      positions[cursor * 3] = world.x;
      positions[cursor * 3 + 1] = world.y;
      positions[cursor * 3 + 2] = world.z;
      colors[cursor * 3] = color.r;
      colors[cursor * 3 + 1] = color.g;
      colors[cursor * 3 + 2] = color.b;
    }
  });

  return { positions, colors };
}

export async function loadPhoenixGLB(url, { sampleCount = 12000 } = {}) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const group = gltf.scene;
  group.name = 'ExternalPhoenixGLB';
  group.updateMatrixWorld(true);

  const meshes = [];
  const materials = new Set();
  group.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = false;
    node.receiveShadow = false;
    meshes.push(node);
    const list = Array.isArray(node.material) ? node.material : [node.material];
    list.filter(Boolean).forEach((material) => materials.add(material));
  });

  if (!meshes.length) throw new Error('The supplied GLB contains no mesh geometry.');
  const anchors = makeAnchors(meshes, sampleCount);

  function setOpacity(opacity) {
    materials.forEach((material) => {
      material.transparent = opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.65;
      material.needsUpdate = true;
    });
  }

  function update(time, motion = 1) {
    if (!motion) return;
    group.rotation.y = Math.sin(time * 0.26) * 0.018;
  }

  return {
    group,
    anchors,
    update,
    setOpacity,
    palette: {},
    adapterContract: {
      type: 'glb',
      source: url,
      sampledMeshes: meshes.length,
      targetContract: '{ positions: Float32Array, colors: Float32Array }'
    }
  };
}
