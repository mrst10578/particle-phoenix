# Royal Phoenix V2 — Cinematic Hero Specification

## Authority
This specification captures the user's 2026-09-26 instruction to take the current Phoenix Lab through the full art-quality improvement pass using ZzzOps + Servotab.

Primary baseline: `main` after menu removal and external GLB activation.

## Outcome
Turn the current Phoenix Lab from a 3D viewer into a premium, living, cinematic LoPRax hero asset while preserving static hosting and a menu-free presentation.

## V2 requirements

| ID | Requirement | Acceptance |
|---|---|---|
| V2-R1 | Artist-grade GLB remains the canonical solid source | external GLB is default; internal/procedural remain fallbacks; future GLB swap needs no particle rewrite |
| V2-R2 | Royal material system | selective obsidian/burgundy/crimson/antique-gold palette, physical shading, directional feather sheen, restrained ember underglow |
| V2-R3 | Organic model motion | breathing, feather/edge ripple, wing/tail-like deformation, floating motion; respects reduced motion |
| V2-R4 | Future rig/animation support | GLB animations auto-play when present without changing the app contract |
| V2-R5 | GPU particle phoenix | morph/drift runs primarily in shaders; multi-scale ember/dust/ash look; high-density Ultra remains practical |
| V2-R6 | Cinematic environment | halo/crown geometry, floor/contact presence, stars, ember/ash aura, petals, layered depth |
| V2-R7 | Cinematic post-processing | warm grade, vignette, subtle grain/heat shimmer, interaction-only chromatic burst, bloom |
| V2-R8 | Reactive hero | pointer/touch parallax, tap Royal Pulse, synchronized light/halo/material/particle reaction, subtle haptic where supported |
| V2-R9 | Intro choreography | dark-to-awakened reveal without adding visible menus |
| V2-R10 | Menu-free public surface | no settings/control panel; runtime/API/keyboard hooks may remain for development |
| V2-R11 | Mobile/web compatibility | static hosting, no camera permission, no paid/runtime service dependency; reduced-motion honored |
| V2-R12 | Attribution and swap contract | CC BY attribution retained; external model replacement documented |

## Explicit boundary
LoPRax-Web2 integration remains a separate repository task. This V2 run prepares a reusable hero component contract but does not modify the separate Web2 repository.

## Geometry upgrade note
A materially better sculpt can replace `models/royal-phoenix-external-v1.glb` later. The V2 runtime must not depend on this exact mesh topology.
