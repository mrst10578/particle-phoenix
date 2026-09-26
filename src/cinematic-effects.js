import * as THREE from 'three';

function seeded(index) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function boundsFromAnchors(anchors) {
  const box = new THREE.Box3();
  const p = new THREE.Vector3();
  for (let i = 0; i < anchors.positions.length; i += 3) {
    p.set(anchors.positions[i], anchors.positions[i + 1], anchors.positions[i + 2]);
    box.expandByPoint(p);
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return { box, center, size };
}

function makeRadialTexture(inner = 'rgba(255,210,110,.85)', outer = 'rgba(80,0,18,0)') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, 'rgba(160,30,42,.24)');
  g.addColorStop(0.68, 'rgba(90,5,18,.08)');
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 64, 4, 128, 64, 120);
  g.addColorStop(0, 'rgba(0,0,0,.82)');
  g.addColorStop(0.30, 'rgba(0,0,0,.52)');
  g.addColorStop(0.68, 'rgba(0,0,0,.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(canvas);
}

function makeAura(anchors, { count, kind, pixelRatio }) {
  const { box, center, size } = boundsFromAnchors(anchors);
  const base = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sourceCount = anchors.positions.length / 3;
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    let j = (i * 1877 + 71) % sourceCount;
    for (let attempt = 0; attempt < 7; attempt++) {
      const k = j * 3;
      const x = anchors.positions[k];
      const y = anchors.positions[k + 1];
      const z = anchors.positions[k + 2];
      const nx = Math.abs((x - center.x) / Math.max(size.x * 0.5, 1e-5));
      const ny = (y - box.min.y) / Math.max(size.y, 1e-5);
      const nz = Math.abs((z - center.z) / Math.max(size.z * 0.5, 1e-5));
      const edge = Math.max(nx, nz);
      if (kind === 'ember' ? (edge > 0.58 || ny < 0.38) : (edge > 0.68 || ny < 0.28)) break;
      j = (j + 997) % sourceCount;
    }

    const k = j * 3;
    const n = i * 3;
    base[n] = anchors.positions[k];
    base[n + 1] = anchors.positions[k + 1];
    base[n + 2] = anchors.positions[k + 2];
    seeds[i] = seeded(i * 9 + (kind === 'ember' ? 3 : 19));

    if (kind === 'ember') {
      color.setRGB(
        Math.min(1, anchors.colors[k] * 1.18 + 0.22),
        Math.min(1, anchors.colors[k + 1] * 0.7 + 0.03),
        Math.min(1, anchors.colors[k + 2] * 0.45 + 0.01)
      );
    } else {
      const v = 0.12 + seeds[i] * 0.13;
      color.setRGB(v * 0.78, v * 0.52, v * 0.58);
    }
    colors[n] = color.r;
    colors[n + 1] = color.g;
    colors[n + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(base, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uPulse: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uKind: { value: kind === 'ember' ? 1 : 0 },
    uIntro: { value: 0 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: kind === 'ember' ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime;
      uniform float uMotion;
      uniform float uPulse;
      uniform float uPixelRatio;
      uniform float uKind;
      uniform float uIntro;
      varying vec3 vColor;
      varying float vSeed;
      varying float vKind;
      void main() {
        vec3 p = position;
        float phase = aSeed * 6.28318530718;
        float speed = mix(0.16, 0.62, aSeed);
        float rise = fract(aSeed + uTime * speed * 0.14 * uMotion);
        p.y += rise * mix(0.7, 1.8, uKind);
        p.x += sin(uTime * (0.7 + aSeed) + phase) * mix(0.08, 0.18, uKind) * uMotion;
        p.z += cos(uTime * (0.54 + aSeed) + phase * 1.4) * mix(0.05, 0.14, uKind) * uMotion;
        p *= 1.0 + uPulse * 0.012 * uKind;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float baseSize = mix(1.2, 3.8, fract(aSeed * 5.17));
        gl_PointSize = baseSize * uPixelRatio * (1.0 + uPulse * 0.45 * uKind);
        vColor = color;
        vSeed = aSeed;
        vKind = uKind;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vSeed;
      varying float vKind;
      uniform float uPulse;
      uniform float uIntro;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q) * 2.0;
        if (d > 1.0) discard;
        float soft = 1.0 - smoothstep(0.06, 1.0, d);
        float core = 1.0 - smoothstep(0.0, 0.34, d);
        float alpha = mix(0.22, 0.66, vKind) * soft * (0.55 + core * 0.65);
        alpha *= 0.72 + fract(vSeed * 11.7) * 0.28;
        alpha *= uIntro;
        vec3 c = vColor * (0.72 + core * mix(0.25, 1.3, vKind));
        c += vec3(1.0, 0.19, 0.035) * core * uPulse * vKind * 0.32;
        gl_FragColor = vec4(c, alpha);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = kind === 'ember' ? 'RoyalEmberAura' : 'RoyalAshAura';
  return { points, material, geometry };
}

function makePetals({ count, span }) {
  const geometry = new THREE.PlaneGeometry(0.12, 0.24, 1, 1);
  geometry.translate(0, 0.12, 0);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x5b0719,
    emissive: 0x190106,
    emissiveIntensity: 0.22,
    metalness: 0.12,
    roughness: 0.5,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'CrimsonPetals';
  mesh.frustumCulled = false;

  const state = Array.from({ length: count }, (_, i) => ({
    seed: seeded(i * 13 + 5),
    phase: seeded(i * 17 + 9) * Math.PI * 2,
    radius: span * (0.43 + seeded(i * 7 + 2) * 0.34),
    speed: 0.05 + seeded(i * 11 + 4) * 0.09
  }));
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const scale = new THREE.Vector3();

  function update(time, motion, pulse) {
    for (let i = 0; i < count; i++) {
      const s = state[i];
      const t = (s.seed + time * s.speed * motion) % 1;
      const angle = s.phase + time * (0.08 + s.seed * 0.11) * motion;
      position.set(
        Math.cos(angle) * s.radius,
        THREE.MathUtils.lerp(span * 0.6, -span * 0.62, t),
        Math.sin(angle) * s.radius * 0.46 - span * 0.04
      );
      rotation.set(
        angle * 0.7 + time * 0.16,
        time * (0.2 + s.seed * 0.3),
        angle + t * Math.PI * 2
      );
      const k = (0.66 + s.seed * 0.65) * (1 + pulse * 0.12);
      scale.set(k, k, k);
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update, geometry, material };
}

export function createCinematicEnvironment({
  scene,
  anchors,
  isMobile = false,
  reducedMotion = false,
  pixelRatio = 1
}) {
  const { box, center, size } = boundsFromAnchors(anchors);
  const span = Math.max(size.x, size.y, size.z);
  const group = new THREE.Group();
  group.name = 'LoPRaxCinematicEnvironment';
  scene.add(group);

  const halo = new THREE.Group();
  halo.name = 'RoyalEclipseHalo';
  halo.position.set(center.x, center.y + size.y * 0.035, box.min.z - span * 0.17);
  group.add(halo);

  const glowTexture = makeRadialTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x8d1730,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(span * 1.18, span * 1.18, 1);
  halo.add(glow);

  const ringMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xd3a557, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0x8e102c, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: 0xf0cf83, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
  ];
  const rings = [0.39, 0.445, 0.49].map((factor, i) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(span * factor, span * (i === 0 ? 0.0038 : 0.0022), 10, 180), ringMaterials[i]);
    halo.add(mesh);
    return mesh;
  });

  const rayMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9b461,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const rayGeometry = new THREE.PlaneGeometry(span * 0.018, span * 0.22);
  rayGeometry.translate(0, span * 0.11, 0);
  const rays = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const angle = Math.PI * 0.5 + THREE.MathUtils.lerp(-1.02, 1.02, t);
    const ray = new THREE.Mesh(rayGeometry, rayMaterial);
    ray.position.set(Math.cos(angle) * span * 0.39, Math.sin(angle) * span * 0.39, 0.01);
    ray.rotation.z = angle - Math.PI * 0.5;
    ray.scale.y = i === 3 ? 1.25 : (i === 2 || i === 4 ? 1.05 : 0.82);
    halo.add(ray);
    rays.push(ray);
  }

  const constellationCount = isMobile ? 40 : 72;
  const constellationPositions = new Float32Array(constellationCount * 3);
  for (let i = 0; i < constellationCount; i++) {
    const a = (i / constellationCount) * Math.PI * 2 + seeded(i) * 0.04;
    const r = span * (0.48 + seeded(i * 5 + 2) * 0.035);
    constellationPositions[i * 3] = Math.cos(a) * r;
    constellationPositions[i * 3 + 1] = Math.sin(a) * r;
    constellationPositions[i * 3 + 2] = 0.02;
  }
  const constellationGeometry = new THREE.BufferGeometry();
  constellationGeometry.setAttribute('position', new THREE.BufferAttribute(constellationPositions, 3));
  const constellationMaterial = new THREE.PointsMaterial({
    color: 0xf1cc7a,
    size: 0.035,
    transparent: true,
    opacity: 0.66,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  halo.add(new THREE.Points(constellationGeometry, constellationMaterial));

  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb15a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(span * 0.17, span * 0.177, 128),
    pulseMaterial
  );
  pulseRing.position.copy(halo.position).add(new THREE.Vector3(0, 0, span * 0.36));
  group.add(pulseRing);

  const floorY = box.min.y - span * 0.07;
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x070305,
    metalness: 0.66,
    roughness: 0.24,
    transparent: true,
    opacity: 0.7,
    clearcoat: 0.3,
    clearcoatRoughness: 0.22,
    depthWrite: false
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(span * 0.63, 128), floorMaterial);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(center.x, floorY, center.z);
  floor.receiveShadow = false;
  group.add(floor);

  const contactShadowTexture = makeContactShadowTexture();
  const contactShadowMaterial = new THREE.MeshBasicMaterial({
    map: contactShadowTexture,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 0.78, span * 0.34),
    contactShadowMaterial
  );
  contactShadow.rotation.x = -Math.PI * 0.5;
  contactShadow.position.set(center.x, floorY + 0.018, center.z + span * 0.015);
  group.add(contactShadow);

  const floorRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x8c1731,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(span * 0.33, span * 0.335, 128), floorRingMaterial);
  floorRing.rotation.x = -Math.PI * 0.5;
  floorRing.position.set(center.x, floorY + 0.012, center.z);
  group.add(floorRing);

  const ember = makeAura(anchors, { count: isMobile ? 560 : 1050, kind: 'ember', pixelRatio });
  const ash = makeAura(anchors, { count: isMobile ? 240 : 480, kind: 'ash', pixelRatio });
  group.add(ember.points, ash.points);

  const petals = makePetals({ count: isMobile ? 24 : 42, span });
  group.add(petals.mesh);

  let pulse = 0;
  let intro = 0;
  const pointer = new THREE.Vector2();

  function triggerPulse(amount = 1) {
    pulse = Math.max(pulse, THREE.MathUtils.clamp(amount, 0, 1.5));
  }

  function setPointer(x, y) {
    pointer.set(x, y);
  }

  function setIntro(value) {
    intro = THREE.MathUtils.clamp(value, 0, 1);
  }

  function update(dt, time, motion = 1) {
    pulse = Math.max(0, pulse - dt * 1.55);
    const activeMotion = reducedMotion ? 0 : motion;

    halo.rotation.z = time * 0.011 * activeMotion + pointer.x * 0.025;
    rings[0].rotation.z = time * 0.018 * activeMotion;
    rings[1].rotation.z = -time * 0.013 * activeMotion;
    rings[2].rotation.z = time * 0.007 * activeMotion;
    halo.position.x = center.x + pointer.x * span * 0.018;
    halo.position.y = center.y + size.y * 0.035 + pointer.y * span * 0.012;

    glowMaterial.opacity = (0.25 + pulse * 0.17) * intro;
    ringMaterials[0].opacity = (0.30 + pulse * 0.28) * intro;
    ringMaterials[1].opacity = (0.22 + pulse * 0.13) * intro;
    ringMaterials[2].opacity = (0.12 + pulse * 0.2) * intro;
    rayMaterial.opacity = (0.14 + pulse * 0.28) * intro;
    constellationMaterial.opacity = (0.46 + pulse * 0.26) * intro;
    floorMaterial.opacity = 0.58 * intro;
    contactShadowMaterial.opacity = (0.48 + pulse * 0.08) * intro;
    floorRingMaterial.opacity = (0.12 + pulse * 0.2) * intro;

    const ringScale = 0.78 + (1 - pulse) * 0.8;
    pulseRing.scale.setScalar(ringScale);
    pulseMaterial.opacity = pulse * pulse * 0.68 * intro;

    ember.material.uniforms.uTime.value = time;
    ember.material.uniforms.uMotion.value = activeMotion;
    ember.material.uniforms.uPulse.value = pulse;
    ember.material.uniforms.uIntro.value = intro;
    ash.material.uniforms.uTime.value = time;
    ash.material.uniforms.uMotion.value = activeMotion;
    ash.material.uniforms.uPulse.value = pulse;
    ash.material.uniforms.uIntro.value = intro * 0.72;

    petals.material.opacity = (0.38 + pulse * 0.14) * intro;
    petals.update(time, activeMotion, pulse);

    floorRing.rotation.z = time * 0.05 * activeMotion;
  }

  function dispose() {
    scene.remove(group);
    glowTexture.dispose();
    glowMaterial.dispose();
    ringMaterials.forEach((m) => m.dispose());
    rings.forEach((m) => m.geometry.dispose());
    rayGeometry.dispose();
    rayMaterial.dispose();
    constellationGeometry.dispose();
    constellationMaterial.dispose();
    pulseRing.geometry.dispose();
    pulseMaterial.dispose();
    floor.geometry.dispose();
    floorMaterial.dispose();
    contactShadow.geometry.dispose();
    contactShadowMaterial.dispose();
    contactShadowTexture.dispose();
    floorRing.geometry.dispose();
    floorRingMaterial.dispose();
    ember.geometry.dispose();
    ember.material.dispose();
    ash.geometry.dispose();
    ash.material.dispose();
    petals.geometry.dispose();
    petals.material.dispose();
  }

  return {
    group,
    update,
    triggerPulse,
    setPointer,
    setIntro,
    dispose,
    get pulse() { return pulse; },
    bounds: { box, center, size, span, floorY }
  };
}
