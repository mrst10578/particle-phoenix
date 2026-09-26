# LoPRax Royal Phoenix 3D Lab

Independent browser-based R&D lab for the LoPRax **Phoenix + Crimson Rose + Crown** visual language.

This repository started as a fork of the original 3D Particle Rose experiment and has been reworked into a volumetric Three.js phoenix laboratory.

## What exists now

- Canonical optimized `models/royal-phoenix-v1.glb` with a volumetric body, crown-like crest, layered wings, crimson rose shoulder language, talons, and a flowing tail.
- Royal crimson / obsidian / antique-gold PBR material system.
- Cinematic lighting, fog, bloom, stars, and ember field.
- Particle phoenix whose target points are generated from the same 3D construction data as the solid model.
- Solid / hybrid / particle viewing modes.
- 3D particle morphs: Phoenix → Crimson Rose → Crown → Scatter.
- Touch/mouse orbit and zoom.
- Mobile-oriented quality presets, DPR limits, particle density control, and automatic fallback.
- Reduced-motion support.
- Static hosting and GitHub Pages compatibility.
- Seven merged GLB material groups for low draw-call cost on mobile, with the procedural model retained as a fallback.
- Reference asset pack retained under `references/phoenix/`.

## Run locally

Any static HTTP server works:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

- Drag / touch: orbit.
- Wheel / pinch: zoom.
- Keys `1`, `2`, `3`, `4`: Phoenix, Rose, Crown, Scatter.
- `R`: reset camera.
- The on-screen lab panel controls rendering mode, particle density, quality, bloom, rotation, and motion.

## Architecture

```text
index.html
src/
  app.js          scene, camera, lights, postprocessing, quality
  phoenix.js      volumetric phoenix geometry + shared particle target contract
  particles.js    particle engine and morph state
  shapes.js       rose / crown / scatter 3D targets
  ui.js           lab controls
  styles.css      responsive royal UI
docs/
  PRODUCT_SPEC.md
  IMPLEMENTATION_PLAN.md
  ZZZOPS_GOALS.md
references/phoenix/
  LoPRax_Phoenix_3D_Reference_Pack.zip
```

## GLB model pipeline

The Lab now loads `models/royal-phoenix-v1.glb` by default. The model is generated reproducibly from `scripts/build_phoenix_glb.py`, while `createRoyalPhoenix()` remains the fallback. Both paths expose the same normalized particle-target structure:

```js
{ positions: Float32Array, colors: Float32Array }
```

A future sculpted or image-to-3D GLB can still replace this model without changing the particle system or UI: open the Lab with `?model=...`. Use `?procedural=1` to force the fallback.

## Verification

```bash
npm run check
```

This performs syntax checks for every JavaScript module and validates the expected project contract.

## Upstream credit

Based on the original **3D Particle Rose** project by `hvccj/particle-rose`. The upstream README identifies the project as MIT licensed. The fork keeps that attribution while substantially changing the product and implementation.
