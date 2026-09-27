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
  return {
    box,
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3())
  };
}

function makeContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 64, 6, 128, 64, 120);
  g.addColorStop(0, 'rgba(0,0,0,.82)');
  g.addColorStop(0.32, 'rgba(0,0,0,.50)');
  g.addColorStop(0.68, 'rgba(0,0,0,.14)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createAmbientMotes({ count, span, pixelRatio }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  const crimson = new THREE.Color(0x5a0a1c);
  const warm = new THREE.Color(0x9a6b3e);
  const dust = new THREE.Color(0xd0c7bb);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const seed = seeded(i * 17 + 5);
    const ring = 0.72 + seeded(i * 13 + 3) * 0.64;
    const angle = seeded(i * 11 + 7) * Math.PI * 2;

    positions[i3] = Math.cos(angle) * span * ring * 0.58;
    positions[i3 + 1] = (seeded(i * 19 + 9) - 0.34) * span * 0.92;
    positions[i3 + 2] = Math.sin(angle) * span * ring * 0.42;

    const color = i % 5 === 0 ? dust : (i % 3 === 0 ? warm : crimson);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    seeds[i] = seed;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uOpacity: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uPointer: { value: new THREE.Vector2() }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime;
      uniform float uMotion;
      uniform float uPixelRatio;
      uniform vec2 uPointer;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec3 p = position;
        float phase = aSeed * 6.28318530718;
        float drift = uTime * (0.08 + aSeed * 0.08) * uMotion;

        p.y += sin(drift + phase) * 0.10;
        p.x += cos(drift * 0.83 + phase * 1.7) * 0.06 + uPointer.x * 0.025;
        p.z += sin(drift * 0.61 + phase * 1.2) * 0.045 + uPointer.y * 0.015;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = mix(1.25, 2.55, fract(aSeed * 7.31)) * uPixelRatio;

        vColor = color;
        vAlpha = mix(0.20, 0.50, fract(aSeed * 5.73));
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q) * 2.0;
        if (d > 1.0) discard;

        float soft = 1.0 - smoothstep(0.08, 1.0, d);
        float core = 1.0 - smoothstep(0.0, 0.26, d);
        vec3 color = vColor * (0.72 + core * 0.48);
        gl_FragColor = vec4(color, soft * vAlpha * uOpacity);
      }
    `
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'AmbientMotes';
  points.frustumCulled = false;

  function update(time, motion = 1) {
    uniforms.uTime.value = time;
    uniforms.uMotion.value = motion;
  }

  function setOpacity(value) {
    uniforms.uOpacity.value = THREE.MathUtils.clamp(value, 0, 1);
  }

  function setPointer(x, y) {
    uniforms.uPointer.value.set(x, y);
  }

  function setPixelRatio(value) {
    uniforms.uPixelRatio.value = THREE.MathUtils.clamp(value, 1, 2);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { points, update, setOpacity, setPointer, setPixelRatio, dispose, count };
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
  group.name = 'MinimalPhoenixEnvironment';
  scene.add(group);

  const floorY = box.min.y - span * 0.07;

  const floorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x050204,
    metalness: 0.34,
    roughness: 0.48,
    transparent: true,
    opacity: 0.42,
    clearcoat: 0.12,
    clearcoatRoughness: 0.52,
    depthWrite: false
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(span * 0.60, 96), floorMaterial);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(center.x, floorY, center.z);
  floor.receiveShadow = false;
  group.add(floor);

  const contactShadowTexture = makeContactShadowTexture();
  const contactShadowMaterial = new THREE.MeshBasicMaterial({
    map: contactShadowTexture,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 0.76, span * 0.31),
    contactShadowMaterial
  );
  contactShadow.rotation.x = -Math.PI * 0.5;
  contactShadow.position.set(center.x, floorY + 0.016, center.z + span * 0.012);
  group.add(contactShadow);

  const motes = createAmbientMotes({
    count: isMobile ? 8 : 14,
    span,
    pixelRatio
  });
  group.add(motes.points);

  const pointer = new THREE.Vector2();
  let pulse = 0;
  let intro = reducedMotion ? 1 : 0;

  function triggerPulse(amount = 1) {
    pulse = Math.max(pulse, THREE.MathUtils.clamp(amount, 0, 1.25));
  }

  function setPointer(x, y) {
    pointer.set(x, y);
    motes.setPointer(x, y);
  }

  function setIntro(value) {
    intro = THREE.MathUtils.clamp(value, 0, 1);
    motes.setOpacity(intro * 0.72);
  }

  function setPixelRatio(value) {
    motes.setPixelRatio(value);
  }

  function update(dt, time, motion = 1) {
    pulse = Math.max(0, pulse - dt * 1.7);
    const activeMotion = reducedMotion ? 0 : motion;

    motes.update(time, activeMotion);
    motes.setOpacity((0.58 + pulse * 0.08) * intro);

    floorMaterial.opacity = 0.34 * intro;
    contactShadowMaterial.opacity = (0.46 + pulse * 0.05) * intro;
    contactShadow.scale.setScalar(1 + pulse * 0.01);
  }

  function dispose() {
    scene.remove(group);
    floor.geometry.dispose();
    floorMaterial.dispose();
    contactShadow.geometry.dispose();
    contactShadowMaterial.dispose();
    contactShadowTexture.dispose();
    motes.dispose();
  }

  return {
    group,
    update,
    triggerPulse,
    setPointer,
    setIntro,
    setPixelRatio,
    dispose,
    get pulse() { return pulse; },
    get moteCount() { return motes.count; },
    bounds: { box, center, size, span, floorY }
  };
}
