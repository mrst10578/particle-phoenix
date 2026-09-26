import * as THREE from 'three';

export const ROYAL = {
  obsidian: new THREE.Color(0x0b0507),
  charcoal: new THREE.Color(0x211015),
  burgundy: new THREE.Color(0x480616),
  crimson: new THREE.Color(0xa20d2d),
  scarlet: new THREE.Color(0xd72c3c),
  gold: new THREE.Color(0xd4aa58),
  antiqueGold: new THREE.Color(0x8a622d),
  ember: new THREE.Color(0xff6137)
};

export function royalColorForPoint(x, y, z, box, out = new THREE.Color()) {
  const sx = Math.max(box.max.x - box.min.x, 1e-5);
  const sy = Math.max(box.max.y - box.min.y, 1e-5);
  const sz = Math.max(box.max.z - box.min.z, 1e-5);
  const nx = THREE.MathUtils.clamp((x - box.min.x) / sx, 0, 1);
  const ny = THREE.MathUtils.clamp((y - box.min.y) / sy, 0, 1);
  const nz = THREE.MathUtils.clamp((z - box.min.z) / sz, 0, 1);
  const cx = nx * 2 - 1;
  const cz = nz * 2 - 1;
  const edge = Math.max(Math.abs(cx), Math.abs(cz));
  const featherGrain = 0.5 + 0.5 * Math.sin(x * 0.19 + y * 0.31 + z * 0.13);
  const vein = 0.5 + 0.5 * Math.sin((x - z) * 0.43);

  const crimsonMask = THREE.MathUtils.clamp(0.16 + edge * 0.63 + featherGrain * 0.14, 0, 1);
  const shadowMask = THREE.MathUtils.clamp((1 - edge) * 0.61 + (0.48 - ny) * 0.16, 0, 0.76);
  const tipGold = THREE.MathUtils.smoothstep(edge, 0.86, 1.0);
  const crestGold = THREE.MathUtils.smoothstep(ny, 0.91, 1.0) * 0.78;
  const jewelGold = THREE.MathUtils.smoothstep(vein, 0.88, 1.0) * tipGold * 0.32;
  const goldMask = Math.max(tipGold * 0.58, crestGold, jewelGold);

  out.copy(ROYAL.burgundy)
    .lerp(ROYAL.crimson, crimsonMask * 0.78)
    .lerp(ROYAL.obsidian, shadowMask)
    .lerp(ROYAL.gold, goldMask);

  if (edge > 0.94 && ny < 0.76) out.lerp(ROYAL.ember, 0.12);
  return out;
}

function attachRoyalShader(material, box) {
  const uniforms = {
    uRoyalTime: { value: 0 },
    uRoyalMotion: { value: 1 },
    uRoyalPulse: { value: 0 },
    uRoyalPointer: { value: new THREE.Vector2() },
    uBoundsMin: { value: box.min.clone() },
    uBoundsMax: { value: box.max.clone() }
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uRoyalTime;
uniform float uRoyalMotion;
uniform float uRoyalPulse;
uniform vec2 uRoyalPointer;
uniform vec3 uBoundsMin;
uniform vec3 uBoundsMax;
varying float vRoyalEdge;
varying float vRoyalHeight;
varying vec3 vRoyalLocal;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vec3 royalSpan = max(uBoundsMax - uBoundsMin, vec3(0.0001));
vec3 royalN = clamp((position - uBoundsMin) / royalSpan, 0.0, 1.0);
vec3 royalC = royalN * 2.0 - 1.0;
float royalEdge = max(abs(royalC.x), abs(royalC.z));
float royalTip = smoothstep(0.34, 0.98, royalEdge);
float royalLower = 1.0 - royalN.y;
float royalWave = sin(uRoyalTime * 1.34 + position.x * 0.105 + position.z * 0.073);
float royalWave2 = cos(uRoyalTime * 1.07 + position.z * 0.119 - position.y * 0.051);
float royalFlutter = royalTip * (0.085 + royalLower * 0.14) * uRoyalMotion;
transformed.y += royalWave * royalFlutter;
transformed.z += royalWave2 * royalFlutter * 0.48;
transformed.x += uRoyalPointer.x * royalTip * 0.028 * uRoyalMotion;
transformed.y += uRoyalPointer.y * royalTip * 0.018 * uRoyalMotion;
float royalBreath = 1.0 + sin(uRoyalTime * 1.10) * 0.0038 * uRoyalMotion + uRoyalPulse * 0.006;
transformed *= royalBreath;
vRoyalEdge = royalEdge;
vRoyalHeight = royalN.y;
vRoyalLocal = position;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uRoyalTime;
uniform float uRoyalMotion;
uniform float uRoyalPulse;
varying float vRoyalEdge;
varying float vRoyalHeight;
varying vec3 vRoyalLocal;`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
float royalMicro = 0.5 + 0.5 * sin(vRoyalLocal.x * 0.73 + vRoyalLocal.y * 0.41 + vRoyalLocal.z * 0.57);
roughnessFactor = clamp(roughnessFactor + (royalMicro - 0.5) * 0.085, 0.18, 0.52);`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
float royalVein = 0.5 + 0.5 * sin(vRoyalLocal.x * 0.31 + vRoyalLocal.y * 0.23 - vRoyalLocal.z * 0.17 - uRoyalTime * 1.6);
float royalEdgeGlow = smoothstep(0.76, 1.0, vRoyalEdge);
float royalTailHeat = pow(clamp(1.0 - vRoyalHeight, 0.0, 1.0), 2.2);
float royalFresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.4);
float royalEmber = royalEdgeGlow * royalVein * (0.035 + royalTailHeat * 0.055);
royalEmber += uRoyalPulse * (0.07 + royalEdgeGlow * 0.16);
totalEmissiveRadiance += vec3(1.0, 0.075, 0.018) * royalEmber;
totalEmissiveRadiance += vec3(0.36, 0.07, 0.018) * royalFresnel * royalEdgeGlow * (0.05 + uRoyalPulse * 0.04);`
      );

    material.userData.royalShader = shader;
  };

  material.customProgramCacheKey = () => 'loprax-royal-v2';
  material.userData.royalUniforms = uniforms;
}

export function applyRoyalMaterial(mesh) {
  const geometry = mesh.geometry;
  if (!geometry?.attributes?.position) return null;

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  const box = geometry.boundingBox.clone();
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
    metalness: 0.46,
    roughness: 0.29,
    clearcoat: 0.42,
    clearcoatRoughness: 0.22,
    sheen: 0.48,
    sheenColor: new THREE.Color(0x7e102d),
    iridescence: 0.08,
    iridescenceIOR: 1.4,
    emissive: new THREE.Color(0x140105),
    emissiveIntensity: 0.16,
    specularIntensity: 0.82,
    specularColor: new THREE.Color(0xffd89a),
    side: THREE.DoubleSide
  });

  if ('anisotropy' in material) {
    material.anisotropy = 0.72;
    material.anisotropyRotation = Math.PI * 0.08;
  }
  material.envMapIntensity = 1.42;
  material.name = 'LoPRaxRoyalPhoenixV2';
  attachRoyalShader(material, box);

  const old = mesh.material;
  mesh.material = material;
  if (Array.isArray(old)) old.forEach((entry) => entry?.dispose?.());
  else old?.dispose?.();

  return material;
}

export function updateRoyalMaterials(materials, { time = 0, motion = 1, pulse = 0, pointer = null } = {}) {
  materials.forEach((material) => {
    const uniforms = material.userData?.royalUniforms;
    if (!uniforms) return;
    uniforms.uRoyalTime.value = time;
    uniforms.uRoyalMotion.value = motion;
    uniforms.uRoyalPulse.value = pulse;
    if (pointer) uniforms.uRoyalPointer.value.copy(pointer);
  });
}
