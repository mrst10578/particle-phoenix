# LoPRax Royal Phoenix 3D Lab

## Product
Independent static web app for experimenting with LoPRax royal visual effects. Do not couple it to LoPRax-Web2 unless explicitly requested.

## Current architecture
- Three.js 0.160 through browser import maps.
- No build step required.
- `src/phoenix.js`: volumetric procedural phoenix plus particle target data.
- `src/particles.js`: morph engine.
- `src/shapes.js`: rose/crown/scatter targets.
- `src/app.js`: rendering, lighting, postprocessing, performance tiers.
- `src/ui.js`: control panel.
- `references/phoenix/`: source design references; never treat them as runtime assets by default.

## Design rules
- Visual language: obsidian black, burgundy, deep crimson, ember orange, antique gold.
- Phoenix is the dominant identity; rose and crown are secondary motifs.
- Prefer cinematic royal styling over cartoon/game aesthetics.
- Mobile performance is a first-class constraint.
- Respect prefers-reduced-motion.

## Engineering rules
- Preserve static hosting compatibility.
- Keep a single canonical particle-target contract: `{ positions, colors }`.
- A future GLB may replace the procedural solid model without rewriting the particle/UI systems.
- Run `npm run check` after source changes.
- Do not add camera/gesture permissions unless explicitly requested.
