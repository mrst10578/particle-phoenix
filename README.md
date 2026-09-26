# LoPRax Royal Phoenix 3D Lab

Independent browser-based R&D lab for the LoPRax **Phoenix + Crimson Rose + Crown** visual language.

The current public build is **Royal Phoenix V2**, a menu-free cinematic hero experience built on Three.js.

## V2 visual system

- Canonical external `models/royal-phoenix-external-v1.glb`, with internal GLB and procedural fallbacks.
- Runtime Royal feather material with obsidian / burgundy / crimson / antique-gold zoning.
- Physical clearcoat, sheen, selective iridescence, micro-roughness, warm rim response and restrained ember underglow.
- Organic vertex deformation for breathing, feather-edge ripple and pointer-reactive motion.
- Automatic playback support for animations embedded in future GLB replacements.
- Additional instanced feather accents to break up the silhouette and reduce the single-surface look.
- GPU-driven Phoenix particle morphing for Phoenix / Rose / Crown / Scatter targets.
- High-density Ultra particles with multi-scale ember / gold-dust behavior.
- Eclipse halo, crown rays, constellation details, floor presence, embers, ash and crimson petals.
- Warm cinematic post-processing with bloom, subtle heat shimmer, grain, vignette and pulse-only chromatic burst.
- Royal Pulse interaction on pointer/touch/Space, including synchronized lighting, particles, material glow, haptic feedback where available and a short procedural audio cue after user interaction.
- Dark-to-awakened intro choreography and an explicit Awaken sequence.
- Pointer parallax and idle choreography.
- Menu-free public presentation.
- Reduced-motion support.
- Static hosting and GitHub Pages compatibility.

## Public interaction

- Drag / touch: orbit.
- Wheel / pinch: zoom.
- Tap / click / Space: Royal Pulse.
- Double-click or key `A`: Awaken sequence.
- Keys `1`, `2`, `3`, `4`: Phoenix, Rose, Crown, Scatter particle targets.
- `R`: reset camera.

There is no public settings panel. Ultra rendering is the canonical public mode.

## Architecture

```text
index.html
src/
  app.js                scene, camera, lighting, choreography, interaction
  glb-adapter.js        external model loading, normalization, animation mixer
  royal-material.js     Royal PBR material + feather deformation shader
  feather-accents.js    instanced silhouette feather layer
  particles.js          GPU particle morph engine
  shapes.js             rose / crown / scatter targets
  cinematic-effects.js  halo, floor, embers, ash, petals, pulse ring
  postfx.js             cinematic grading / heat / grain / vignette
  royal-audio.js        interaction-only procedural pulse cue
  phoenix.js            procedural fallback Phoenix
  styles.css            menu-free page chrome / loading presentation
scripts/
  validate.mjs          static product contract
  runtime-smoke.mjs     deployed Chromium smoke test
docs/
  PRODUCT_SPEC_V2.md
  IMPLEMENTATION_PLAN_V2.md
  ZZZOPS_GOALS.md
```

## GLB replacement contract

The Lab loads `models/royal-phoenix-external-v1.glb` by default. A future artist-grade or rigged GLB can replace it without rewriting the particle engine:

```text
?model=<url-or-relative-path>
```

The adapter normalizes the asset to the hero viewport, applies the Royal material system, samples the active surface into the canonical particle-target contract and automatically plays embedded animation clips when present.

```js
{ positions: Float32Array, colors: Float32Array }
```

Use `?procedural=1` to force the final procedural fallback.

## Runtime API

The deployed lab exposes `window.__PHOENIX_LAB__` for development and integration without adding visible controls:

```js
window.__PHOENIX_LAB__.getState()
window.__PHOENIX_LAB__.pulse()
window.__PHOENIX_LAB__.awaken()
window.__PHOENIX_LAB__.setShape('rose')
window.__PHOENIX_LAB__.setDisplay('particle')
window.__PHOENIX_LAB__.resetCamera()
```

## Verification

Static checks:

```bash
npm run check
```

After a successful GitHub Pages deployment, `.github/workflows/runtime-smoke.yml` opens the exact hosted build in Chromium, verifies the external GLB, Ultra state, menu-free DOM, particle count, morph controls and Royal Pulse, and uploads a screenshot artifact.

## External asset attribution

The canonical external Phoenix is based on **Phoenix by rononono on Sketchfab**, used under Creative Commons Attribution (CC BY) and modified for LoPRax. Full attribution and modification notes are in `ASSET_CREDITS.md`.

## Upstream credit

Based on the original **3D Particle Rose** project by `hvccj/particle-rose`. The upstream README identifies the project as MIT licensed. The fork keeps that attribution while substantially changing the product and implementation.
