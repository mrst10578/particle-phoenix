# Full Implementation Plan

Canonical authority: `docs/PRODUCT_SPEC.md` on branch `feat/royal-phoenix-3d-lab`.

| Phase | Intended outcome | Implementation slice | Verification |
|---|---|---|---|
| 1 | Clean independent lab structure | modules, docs, CI, asset references | static contract check |
| 2 | Volumetric phoenix | procedural mesh/group builder | syntax + source inspection |
| 3 | Web optimization | instancing, quality tiers, GLB adapter contract | static + runtime metrics UI |
| 4 | Browser 3D | scene/camera/renderer/orbit | browser smoke after deploy |
| 5 | Royal visual system | PBR materials, bloom, fog, embers, lights | visual check |
| 6 | 3D particle phoenix | targets emitted from the same geometry construction | behavior check |
| 7 | Animation | wing/tail motion, breathing, auto-rotate, morph transitions | interaction check |
| 8 | Mobile performance | DPR caps, bloom tiers, draw-range density | responsive check |
| 9 | Lab controls | display mode, shape, density, quality, effects, reset | interaction check |
| 10 | Morph worlds | phoenix / rose / crown / scatter | interaction check |

## Dependency order
1 → 2 → 3/4 → 5 → 6 → 7 → 8 → 9 → 10.

## Scope deltas
None. The artist-grade external GLB is intentionally a future replacement option; the current accepted implementation uses procedural 3D so execution does not block on a third-party service.

## Full acceptance
Completion is measured against all ten rows above. Host-only visual checks remain explicitly unverified until the branch is deployed or merged to a previewable host.
