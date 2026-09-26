# Full Implementation Plan

Canonical authority: `docs/PRODUCT_SPEC.md` on branch `feat/royal-phoenix-3d-lab`.

| Phase | Intended outcome | Implementation slice | Verification | Status |
|---|---|---|---|---|
| 1 | Clean independent lab structure | modules, docs, CI, asset references | static contract check | verified |
| 2 | Volumetric phoenix | procedural mesh/group builder | syntax + source inspection | verified |
| 3 | Web optimization | instancing, density-scaled CPU/GPU work, quality tiers, GLB adapter contract | static checks | verified |
| 4 | Browser 3D | scene/camera/renderer/orbit | browser smoke after deploy | implemented; host runtime not verified |
| 5 | Royal visual system | PBR materials, bloom, fog, embers, lights | visual check | implemented; host visual not verified |
| 6 | 3D particle phoenix | targets emitted from the same geometry construction | source/contract checks | verified |
| 7 | Animation | wing/tail motion, breathing, auto-rotate, morph transitions | interaction check | implemented; host interaction not verified |
| 8 | Mobile performance | DPR caps, bloom tiers, density-scaled update loop | source/contract checks | verified |
| 9 | Lab controls | display mode, shape, density, quality, effects, reset | DOM/source checks | implemented; host interaction not verified |
| 10 | Morph worlds | phoenix / rose / crown / scatter | source/contract checks | verified |

## Dependency order
1 → 2 → 3/4 → 5 → 6 → 7 → 8 → 9 → 10.

## Scope deltas
None. The artist-grade external GLB is intentionally a future replacement option; the current accepted implementation uses procedural 3D so execution does not block on a third-party service.

## Verification boundary
GitHub Actions executes `npm run check`, including syntax checks for every module and repository contract validation. A real hosted visual/interaction pass is still required after deployment because the feature branch is intentionally not deployed and the public raw/CDN preview surfaces tested during implementation either served HTML as `text/plain` or required an interstitial form submission.

## Full acceptance
All ten implementation phases are present. Static and contract-verifiable acceptance items are verified. Host-specific visual and interaction acceptance remains explicitly unverified until an authorized preview or main deployment exists.
