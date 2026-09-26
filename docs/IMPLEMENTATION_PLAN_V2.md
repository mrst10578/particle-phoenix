# Royal Phoenix V2 — Full Implementation Plan

Canonical authority: `docs/PRODUCT_SPEC_V2.md`.

| Slice | Requirements | Work | Verification | Status |
|---|---|---|---|---|
| V2-A | R1,R12 | preserve GLB adapter + fallback + animation-ready contract | static contract + deployed adapter state | verified |
| V2-B | R2,R3,R4 | physical shader pass + vertex deformation + animation mixer support | syntax + live WebGL compile + deployed render probe | verified |
| V2-C | R5 | GPU particle morph engine + multi-class point rendering | static contract + deployed 36k particle state + morph smoke | verified |
| V2-D | R6 | halo, crown rays, floor, aura, ash, petals, feather accents | source + live shader compile + deploy | verified |
| V2-E | R7 | cinematic post-FX shader | source + live WebGL runtime | verified |
| V2-F | R8,R9 | Royal Pulse, pointer/touch choreography, audio/haptic cue, intro reveal | deployed Chromium interaction smoke | verified |
| V2-G | R10,R11 | menu-free public surface, reduced-motion and static-host contract | DOM/static checks + deployed state | verified |
| V2-H | all | docs, self-review, CI, Pages deploy, live render probe | Quality + Pages + Runtime Smoke | verified |

## Dependency order
V2-A → V2-B → V2-C → V2-D/V2-E → V2-F → V2-G → V2-H.

## Scope/order deltas
- Added V2 cinematic scope by explicit user instruction.
- Existing V1 lab-control requirement is superseded for the public surface by the later explicit instruction that no menu exist.
- Cross-repository LoPRax-Web2 integration is not executed in this repository; the hero contract is reusable for that later integration.
- A future higher-detail sculpt remains a **geometry-source upgrade**, not a missing runtime capability. The current external GLB is retained rather than automatically replacing it with a lower-detail free bird asset.

## Verification evidence
Final art-pass runtime revision: `77645000f42e2fe79f1c3fa7ecbcf2e1819e9c51`.

Fresh evidence:
- Quality workflow: success.
- GitHub Pages deployment: success.
- Runtime Smoke: success in headless Chromium against the exact Pages deployment.
- Active state: `quality=ultra`, `particles=36000`, `modelSource=external-glb`, `menu=false`.
- External model adapter source: `./models/royal-phoenix-external-v1.glb`.
- Isolated WebGL render-target probe: litRatio ≈ 0.10245, brightRatio ≈ 0.09524, meanLuma ≈ 6.87, maxLuma ≈ 249.95.
- Phoenix → Rose → Phoenix morph and Royal Pulse were exercised by the deployed smoke test.

## Full acceptance
The complete V2 runtime scope is implemented and verified on the deployed host. Future replacement of the current artist-authored GLB with a materially higher-quality sculpt is intentionally supported by the adapter and remains an asset-quality upgrade rather than a code-path rewrite.
