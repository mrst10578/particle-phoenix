# ZzzOps Goal Ledger

GitHub Issues are disabled in this fork, so this repository-local ledger is the durable fallback queue.

## Completed V1 root
**G0 — Royal Phoenix 3D Lab** — phases 1–10 implemented and deployed.

## Completed V2 root
**G20 — Royal Phoenix V2 Cinematic Hero** — implemented / verified on GitHub Pages.

## Active V3 root
**G30 — Minimal Solid Phoenix**  
Remove the visible rear yellow/gold geometry and remove the Phoenix body/morph particle system. Keep the solid Royal Phoenix, its organic motion, material/shader, feather accents, floor/contact presence, light Royal Pulse, and only a tiny ambient floating mote field.

### V3 goal DAG
- G31 — remove Phoenix body particle engine + morph/display branches from runtime → G30 — in-progress
- G32 — remove halo/eclipse/crown rays/constellation/petals/ember/ash/pulse-ring rear FX → G31 — planned
- G33 — replace all remaining spatial particles with a tiny ambient mote system only → G32 — planned
- G34 — simplify public/runtime API and keyboard controls for solid-only mode → G31,G33 — planned
- G35 — delete dead particle/morph source modules and update static contract/docs → G34 — planned
- G36 — deploy and verify desktop + mobile + render probe on GitHub Pages → G35 — planned

## V3 acceptance
- No visible yellow/gold geometry behind the Phoenix.
- No Phoenix body particle shell.
- No Phoenix/Rose/Crown/Scatter morph system.
- No star field, ember aura, ash cloud, petals, constellation, halo or crown rays.
- Only a very small field of ambient floating motes remains.
- Phoenix remains solid, animated, Royal-shaded, menu-free and responsive.
- Realtime shadows remain disabled; contact shadow stays as the lightweight depth cue.
- GitHub Actions Quality, Pages deploy and deployed Chromium Runtime Smoke pass.

## Follow-up asset opportunity
A future higher-quality sculpt or rigged GLB remains a drop-in geometry upgrade through the existing adapter.
