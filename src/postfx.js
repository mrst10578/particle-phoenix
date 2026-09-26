export const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uMotion: { value: 1 },
    uResolution: { value: null }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uPulse;
    uniform float uMotion;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;

      float heroMask = 1.0 - smoothstep(0.04, 0.58, length(centered * vec2(0.86, 1.0)));
      float heat = (
        sin(uv.y * 92.0 + uTime * 1.7) +
        sin(uv.y * 151.0 - uTime * 1.15 + uv.x * 23.0)
      ) * 0.5;
      uv.x += heat * 0.00034 * heroMask * uMotion;

      float aberration = (0.00018 + uPulse * 0.0022) * (0.35 + length(centered));
      vec2 shift = vec2(aberration, 0.0);

      vec3 base = texture2D(tDiffuse, uv).rgb;
      float red = texture2D(tDiffuse, uv + shift).r;
      float blue = texture2D(tDiffuse, uv - shift).b;
      vec3 color = vec3(red, base.g, blue);

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      vec3 warmShadow = vec3(0.055, 0.010, 0.017);
      vec3 goldHighlight = vec3(1.06, 0.83, 0.52);
      color = mix(color, color + warmShadow, (1.0 - smoothstep(0.0, 0.35, luma)) * 0.26);
      color *= mix(vec3(1.0), goldHighlight, smoothstep(0.72, 1.35, luma) * 0.08);
      color.r *= 1.025;
      color.b *= 0.965;

      float grain = hash21(gl_FragCoord.xy + uTime * 61.7) - 0.5;
      color += grain * 0.0105;

      float vignette = 1.0 - smoothstep(0.24, 0.88, length(centered * vec2(0.92, 1.08)));
      color *= mix(0.64, 1.02, vignette);

      float pulseHalo = exp(-abs(length(centered) - (0.12 + uPulse * 0.35)) * 35.0) * uPulse;
      color += vec3(0.28, 0.055, 0.012) * pulseHalo * 0.18;

      gl_FragColor = vec4(max(color, 0.0), 1.0);
    }
  `
};
