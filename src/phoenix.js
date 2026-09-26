import * as THREE from 'three';

const PALETTE = {
  obsidian: new THREE.Color(0x12070a),
  charcoal: new THREE.Color(0x231015),
  burgundy: new THREE.Color(0x4f0718),
  crimson: new THREE.Color(0xa20d2b),
  scarlet: new THREE.Color(0xd22b35),
  gold: new THREE.Color(0xd8b15c),
  antiqueGold: new THREE.Color(0x8f672e),
  ember: new THREE.Color(0xff6338)
};

function mat(color, { metalness = 0.35, roughness = 0.48, emissive = 0x000000, emissiveIntensity = 0 } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    side: THREE.DoubleSide
  });
}

function addEllipsoidSamples(targets, center, radii, count, color) {
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const p = new THREE.Vector3(
      center.x + radii.x * Math.sin(phi) * Math.cos(theta),
      center.y + radii.y * Math.cos(phi),
      center.z + radii.z * Math.sin(phi) * Math.sin(theta)
    );
    targets.push({ p, color });
  }
}

function basisFor(direction) {
  const dir = direction.clone().normalize();
  const helper = Math.abs(dir.y) > 0.8 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3().crossVectors(dir, helper).normalize();
  const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize();
  return { dir, tangent, bitangent };
}

function addSegmentSamples(targets, start, end, radius, count, color, taper = true) {
  const delta = end.clone().sub(start);
  const { tangent, bitangent } = basisFor(delta);
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const a = Math.random() * Math.PI * 2;
    const rr = radius * (taper ? THREE.MathUtils.lerp(1, 0.16, t) : 1) * Math.sqrt(Math.random());
    const p = start.clone().lerp(end, t)
      .addScaledVector(tangent, Math.cos(a) * rr)
      .addScaledVector(bitangent, Math.sin(a) * rr);
    targets.push({ p, color });
  }
}

function segmentMatrix(start, end, radius, matrix = new THREE.Matrix4()) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  const scale = new THREE.Vector3(radius, length, radius);
  return matrix.compose(midpoint, q, scale);
}

function rosette(side, material, targets) {
  const group = new THREE.Group();
  group.position.set(side * 0.93, 1.12, 0.18);
  const geo = new THREE.SphereGeometry(0.22, 14, 10);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const petal = new THREE.Mesh(geo, material);
    petal.scale.set(1.3, 0.62, 0.42);
    petal.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, Math.sin(a * 2) * 0.06);
    petal.rotation.z = a;
    group.add(petal);
  }
  addEllipsoidSamples(targets, group.position, new THREE.Vector3(0.48, 0.48, 0.22), 130, PALETTE.crimson);
  return group;
}

function createWing(side, material, targets) {
  const pivot = new THREE.Group();
  pivot.position.set(side * 0.78, 0.85, 0);

  const layers = 4;
  const perLayer = 11;
  const count = layers * perLayer;
  const geometry = new THREE.ConeGeometry(0.22, 1, 7, 1, false);
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  let n = 0;
  for (let layer = 0; layer < layers; layer++) {
    for (let i = 0; i < perLayer; i++) {
      const start = new THREE.Vector3(
        side * (0.08 + i * 0.025),
        0.05 + layer * 0.16,
        (i - 5) * 0.035 + layer * 0.03
      );
      const tip = new THREE.Vector3(
        side * (2.25 + i * 0.24 + layer * 0.34),
        1.5 + layer * 0.38 - i * 0.13,
        Math.sin(i * 0.55 + layer) * 0.24
      );
      const width = 0.74 - layer * 0.07 + i * 0.006;
      instanced.setMatrixAt(n, segmentMatrix(start, tip, width));
      const color = (i + layer) % 7 === 0 ? PALETTE.gold :
        ((i + layer) % 5 === 0 ? PALETTE.charcoal : (layer < 2 ? PALETTE.crimson : PALETTE.scarlet));
      instanced.setColorAt(n, color);

      const worldStart = start.clone().add(pivot.position);
      const worldTip = tip.clone().add(pivot.position);
      addSegmentSamples(targets, worldStart, worldTip, width * 0.18, 34, color);
      n++;
    }
  }
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  pivot.add(instanced);
  return pivot;
}

function addTube(group, points, radius, material, targets, color, samples = 180) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 42, radius, 7, false);
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  for (let i = 0; i < samples; i++) {
    const t = Math.random();
    const p = curve.getPoint(t);
    p.x += (Math.random() - 0.5) * radius * 1.6;
    p.y += (Math.random() - 0.5) * radius * 1.6;
    p.z += (Math.random() - 0.5) * radius * 1.6;
    targets.push({ p, color });
  }
  return mesh;
}

export function createRoyalPhoenix() {
  const group = new THREE.Group();
  group.name = 'RoyalPhoenix';

  const bodyMaterial = mat(0x3d0915, { metalness: 0.48, roughness: 0.42, emissive: 0x26030a, emissiveIntensity: 0.28 });
  const crimsonMaterial = mat(0x8f1028, { metalness: 0.4, roughness: 0.36, emissive: 0x35040d, emissiveIntensity: 0.3 });
  const featherMaterial = mat(0xffffff, { metalness: 0.34, roughness: 0.42, emissive: 0x220207, emissiveIntensity: 0.22 });
  const goldMaterial = mat(0xd2aa55, { metalness: 0.78, roughness: 0.28, emissive: 0x5d3108, emissiveIntensity: 0.42 });
  const darkMaterial = mat(0x16090c, { metalness: 0.5, roughness: 0.5 });
  const targets = [];

  const bodyGeo = new THREE.SphereGeometry(1, 30, 22);
  const body = new THREE.Mesh(bodyGeo, bodyMaterial);
  body.scale.set(0.92, 1.5, 0.7);
  body.position.set(0, -0.15, 0);
  group.add(body);
  addEllipsoidSamples(targets, body.position, new THREE.Vector3(0.92, 1.5, 0.7), 820, PALETTE.burgundy);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.75, 26, 18), crimsonMaterial);
  chest.scale.set(0.82, 1.28, 0.62);
  chest.position.set(0, 0.42, 0.23);
  group.add(chest);
  addEllipsoidSamples(targets, chest.position, new THREE.Vector3(0.62, 0.96, 0.48), 520, PALETTE.crimson);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 1.25, 18), bodyMaterial);
  neck.position.set(0, 1.25, 0.02);
  neck.rotation.z = -0.05;
  group.add(neck);
  addSegmentSamples(targets, new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(-0.02, 1.85, 0.02), 0.34, 260, PALETTE.burgundy, false);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 26, 18), crimsonMaterial);
  head.scale.set(0.95, 0.82, 0.82);
  head.position.set(-0.04, 2.04, 0.02);
  group.add(head);
  addEllipsoidSamples(targets, head.position, new THREE.Vector3(0.45, 0.39, 0.39), 300, PALETTE.crimson);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.66, 6), goldMaterial);
  beak.position.set(-0.02, 2.02, 0.48);
  beak.rotation.x = Math.PI / 2;
  group.add(beak);
  addSegmentSamples(targets, new THREE.Vector3(-0.02, 2.02, 0.33), new THREE.Vector3(-0.02, 2.02, 0.73), 0.12, 90, PALETTE.gold);

  const eyeGeo = new THREE.SphereGeometry(0.055, 12, 8);
  const eyeMat = mat(0xffc45c, { metalness: 0.1, roughness: 0.25, emissive: 0xff5a21, emissiveIntensity: 2.1 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.23, 2.12, 0.35);
    group.add(eye);
  }

  const leftWing = createWing(-1, featherMaterial, targets);
  const rightWing = createWing(1, featherMaterial, targets);
  leftWing.name = 'LeftWing';
  rightWing.name = 'RightWing';
  group.add(leftWing, rightWing);

  group.add(rosette(-1, crimsonMaterial, targets), rosette(1, crimsonMaterial, targets));

  const tail = new THREE.Group();
  tail.name = 'Tail';
  group.add(tail);
  const tailMats = [crimsonMaterial, goldMaterial, darkMaterial];
  const tailColors = [PALETTE.crimson, PALETTE.gold, PALETTE.charcoal];
  for (let i = 0; i < 9; i++) {
    const lane = i - 4;
    const s = lane / 4;
    const points = [
      new THREE.Vector3(s * 0.32, -1.15, -0.05 * Math.abs(s)),
      new THREE.Vector3(s * 0.72, -2.15, 0.22 * Math.sin(i)),
      new THREE.Vector3(s * 1.35 + Math.sin(i * 1.7) * 0.25, -3.45, 0.35 * Math.cos(i * 0.8)),
      new THREE.Vector3(s * 1.75 + Math.cos(i) * 0.5, -4.9 - Math.abs(s) * 0.55, 0.4 * Math.sin(i * 1.2))
    ];
    addTube(tail, points, 0.07 + (i % 3) * 0.015, tailMats[i % 3], targets, tailColors[i % 3], 145);
  }

  const crest = new THREE.Group();
  crest.name = 'CrownCrest';
  group.add(crest);
  for (let i = 0; i < 7; i++) {
    const lane = i - 3;
    const points = [
      new THREE.Vector3(lane * 0.08, 2.28, -0.05),
      new THREE.Vector3(lane * 0.16, 2.72 + Math.abs(lane) * 0.05, -0.16),
      new THREE.Vector3(lane * 0.24, 3.28 - Math.abs(lane) * 0.11, -0.34)
    ];
    const material = i % 2 ? crimsonMaterial : goldMaterial;
    const color = i % 2 ? PALETTE.scarlet : PALETTE.gold;
    addTube(crest, points, 0.035 + (3 - Math.abs(lane)) * 0.005, material, targets, color, 70);
  }

  const feet = new THREE.Group();
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.72, 9), goldMaterial);
    leg.position.set(side * 0.34, -1.55, 0.05);
    feet.add(leg);
    addSegmentSamples(targets, new THREE.Vector3(side * 0.34, -1.2, 0.05), new THREE.Vector3(side * 0.34, -1.9, 0.05), 0.08, 70, PALETTE.gold, false);
    for (let toe = -1; toe <= 1; toe++) {
      const start = new THREE.Vector3(side * 0.34, -1.9, 0.08);
      const end = new THREE.Vector3(side * 0.34 + toe * 0.16, -2.02, 0.4 + Math.abs(toe) * 0.08);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.48, 6), goldMaterial);
      claw.matrixAutoUpdate = false;
      claw.matrix.copy(segmentMatrix(start, end, 0.34));
      feet.add(claw);
      addSegmentSamples(targets, start, end, 0.035, 24, PALETTE.gold);
    }
  }
  group.add(feet);

  const anchorPositions = new Float32Array(targets.length * 3);
  const anchorColors = new Float32Array(targets.length * 3);
  targets.forEach(({ p, color }, i) => {
    anchorPositions[i * 3] = p.x;
    anchorPositions[i * 3 + 1] = p.y;
    anchorPositions[i * 3 + 2] = p.z;
    anchorColors[i * 3] = color.r;
    anchorColors[i * 3 + 1] = color.g;
    anchorColors[i * 3 + 2] = color.b;
  });

  const materials = [bodyMaterial, crimsonMaterial, featherMaterial, goldMaterial, darkMaterial, eyeMat];

  function setOpacity(opacity) {
    materials.forEach((material) => {
      material.transparent = opacity < 0.999;
      material.opacity = opacity;
      material.depthWrite = opacity > 0.65;
    });
  }

  function update(time, motion = 1) {
    const wing = Math.sin(time * 1.45) * 0.035 * motion;
    leftWing.rotation.z = wing;
    rightWing.rotation.z = -wing;
    tail.rotation.y = Math.sin(time * 0.72) * 0.045 * motion;
    crest.rotation.z = Math.sin(time * 0.85) * 0.01 * motion;
    const breathe = 1 + Math.sin(time * 1.1) * 0.012 * motion;
    body.scale.set(0.92 * breathe, 1.5 * breathe, 0.7 * breathe);
  }

  return {
    group,
    update,
    setOpacity,
    anchors: { positions: anchorPositions, colors: anchorColors },
    palette: PALETTE,
    adapterContract: {
      type: 'procedural',
      replacement: 'A future GLB scene may replace group; particle targets should then be sampled into the same {positions, colors} contract.'
    }
  };
}
