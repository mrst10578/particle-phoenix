import * as THREE from 'three';

function seeded(index) {
  const x = Math.sin(index * 12.9898 + 91.717) * 43758.5453;
  return x - Math.floor(x);
}

function makeFeatherGeometry() {
  const positions = new Float32Array([
     0.00, 0.00, 0,
    -0.34, 0.30, 0,
    -0.16, 0.78, 0,
     0.00, 1.00, 0,
     0.16, 0.78, 0,
     0.34, 0.30, 0
  ]);
  const indices = [
    0, 1, 2,
    0, 2, 3,
    0, 3, 4,
    0, 4, 5
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function boundsFromAnchors(anchors) {
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  for (let i = 0; i < anchors.positions.length; i += 3) {
    p.set(anchors.positions[i], anchors.positions[i + 1], anchors.positions[i + 2]);
    box.expandByPoint(p);
  }
  return {
    box,
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3())
  };
}

export function createFeatherAccents(anchors, { count = 110 } = {}) {
  const { box, center, size } = boundsFromAnchors(anchors);
  const span = Math.max(size.x, size.y, size.z);
  const sourceCount = anchors.positions.length / 3;
  const geometry = makeFeatherGeometry();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 0.38,
    roughness: 0.32,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
    emissive: 0x160105,
    emissiveIntensity: 0.16,
    transparent: true,
    opacity: 0.91,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  material.envMapIntensity = 1.28;

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'RoyalFeatherAccents';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;

  const base = [];
  const yAxis = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const outward = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const rollQ = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    let j = (i * 2081 + 113) % sourceCount;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let edge = 0;

    for (let attempt = 0; attempt < 18; attempt++) {
      const k = j * 3;
      p.set(anchors.positions[k], anchors.positions[k + 1], anchors.positions[k + 2]);
      nx = Math.abs((p.x - center.x) / Math.max(size.x * 0.5, 1e-5));
      ny = (p.y - box.min.y) / Math.max(size.y, 1e-5);
      nz = Math.abs((p.z - center.z) / Math.max(size.z * 0.5, 1e-5));
      edge = Math.max(nx, nz);
      if (edge > 0.72 || ny < 0.28 || ny > 0.88) break;
      j = (j + 1223) % sourceCount;
    }

    const seed = seeded(i * 19 + 7);
    const tip = seeded(i * 23 + 11);
    outward.copy(p).sub(center);
    if (outward.lengthSq() < 1e-5) outward.set(0, 1, 0);
    outward.normalize();

    q.setFromUnitVectors(yAxis, outward);
    rollQ.setFromAxisAngle(outward, (seed - 0.5) * 0.75);
    q.multiply(rollQ);

    const length = span * (0.055 + seed * 0.055 + (ny < 0.26 ? 0.035 : 0));
    const width = length * (0.23 + tip * 0.10);
    scale.set(width, length, width);

    const position = p.clone().addScaledVector(outward, span * 0.0105);
    base.push({
      position,
      quaternion: q.clone(),
      scale: scale.clone(),
      outward: outward.clone(),
      seed
    });

    if (ny > 0.89 && i % 3 === 0) color.set(0xd8b15c);
    else if (edge > 0.91 && i % 5 === 0) color.set(0xb98239);
    else if (i % 7 === 0) color.set(0x231015);
    else color.set(i % 2 ? 0xa20d2d : 0x65091d);

    mesh.setColorAt(i, color);
    matrix.compose(position, q, scale);
    mesh.setMatrixAt(i, matrix);
  }

  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.instanceMatrix.needsUpdate = true;

  const workQ = new THREE.Quaternion();
  const flutterQ = new THREE.Quaternion();
  const pulseScale = new THREE.Vector3();

  function update(time, motion = 1, pulse = 0) {
    for (let i = 0; i < count; i++) {
      const feather = base[i];
      const flutter = Math.sin(time * (1.0 + feather.seed * 0.8) + feather.seed * 12.0)
        * (0.014 + feather.seed * 0.018) * motion;
      flutterQ.setFromAxisAngle(feather.outward, flutter);
      workQ.copy(feather.quaternion).multiply(flutterQ);
      const k = 1 + pulse * (0.015 + feather.seed * 0.018);
      pulseScale.copy(feather.scale).multiplyScalar(k);
      matrix.compose(feather.position, workQ, pulseScale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return {
    mesh,
    update,
    dispose,
    bounds: { box, center, size, span }
  };
}
