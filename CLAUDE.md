# LoPRax Royal Phoenix 3D Lab

## Product
Independent static web app for developing the LoPRax royal Phoenix hero. Do not couple it to LoPRax-Web2 unless explicitly requested.

## Current architecture
- Three.js 0.160 through browser import maps.
- No production build step required.
- `models/royal-phoenix-external-v1.glb`: canonical current solid model.
- `src/glb-adapter.js`: GLB loading, normalization, surface sampling, future embedded-animation playback.
- `src/royal-material.js`: V2 Royal PBR/feather shader and organic deformation.
- `src/feather-accents.js`: instanced silhouette feather details.
- `src/particles.js`: GPU particle morph engine.
- `src/shapes.js`: rose/crown/scatter targets.
- `src/cinematic-effects.js`: eclipse halo, crown rays, floor, ember/ash aura, petals, pulse.
- `src/postfx.js`: cinematic grade, heat shimmer, grain, vignette, pulse chromatic response.
- `src/royal-audio.js`: short interaction-only procedural pulse cue.
- `src/app.js`: scene, IBL, lights, camera, intro, parallax, choreography and integration.
- `src/phoenix.js`: procedural final fallback.
- There is intentionally no public UI module or settings menu.

## Design rules
- Visual language: obsidian black, burgundy, deep crimson, ember orange, antique gold.
- Phoenix is the dominant identity; rose and crown are secondary motifs.
- Prefer cinematic royal styling over cartoon/game aesthetics.
- Gold is an accent/jewelry material, not the dominant body color.
- Glow should read as heat/energy under the surface, not neon paint.
- The public surface remains menu-free.
- Respect `prefers-reduced-motion`.

## Engineering rules
- Preserve static hosting compatibility.
- Keep the canonical particle-target contract: `{ positions, colors }`.
- Future GLBs, including rigged/animated GLBs, must remain drop-in through the adapter.
- Preserve the internal GLB and procedural fallback paths.
- Keep CC BY attribution for the current external model.
- Do not add camera, microphone, orientation or other permission-gated input without explicit user request.
- Audio must only begin after user interaction.
- Run `npm run check` after source changes.
- Runtime acceptance is verified by the deployed Chromium smoke workflow when available.
