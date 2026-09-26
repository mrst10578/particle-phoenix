# LoPRax Royal Phoenix 3D Lab

Independent browser-based R&D lab for the LoPRax **Phoenix + Crimson Rose + Crown** visual language.

This repository started as a fork of the original 3D Particle Rose experiment and has been reworked into a volumetric Three.js phoenix laboratory.

## What exists now

- Canonical external `models/royal-phoenix-external-v1.glb`, optimized from a CC BY Sketchfab Phoenix sculpt and recolored at runtime with LoPRax royal materials.
- Royal crimson / obsidian / antique-gold PBR material system.
- Cinematic lighting, fog, bloom, stars, and ember field.
- Particle phoenix whose target points are generated from the same 3D construction data as the solid model.
- Solid / hybrid / particle viewing modes.
- 3D particle morphs: Phoenix → Crimson Rose → Crown → Scatter.
- Touch/mouse orbit and zoom.
- Mobile-oriented quality presets, DPR limits, particle density control, and automatic fallback.
- Reduced-motion support.
- Static hosting and GitHub Pages compatibility.
- External Phoenix consolidated to one mesh for low draw-call cost; internal GLB and procedural Phoenix are retained as fallbacks.
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

The Lab now loads `models/royal-phoenix-external-v1.glb` by default, normalizes it to the viewport, applies LoPRax royal vertex colors/PBR shading, and samples particles from its actual surface. The internally generated `models/royal-phoenix-v1.glb` and `createRoyalPhoenix()` remain fallbacks. Every path exposes the same normalized particle-target structure:

```js
{ positions: Float32Array, colors: Float32Array }
```

Any future sculpted or image-to-3D GLB can still replace the default without changing the particle system or UI: open the Lab with `?model=...`. Use `?procedural=1` to force the final procedural fallback.

## External asset attribution

The canonical external Phoenix is based on **Phoenix by rononono on Sketchfab**, used under Creative Commons Attribution (CC BY) and modified for LoPRax. Full attribution and modification notes are in `ASSET_CREDITS.md`.

## Verification

```bash
npm run check
```

This performs syntax checks for every JavaScript module and validates the expected project contract.

## Upstream credit

Based on the original **3D Particle Rose** project by `hvccj/particle-rose`. The upstream README identifies the project as MIT licensed. The fork keeps that attribution while substantially changing the product and implementation.
