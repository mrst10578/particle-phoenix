# Royal Phoenix V2 — Full Implementation Plan

Canonical authority: `docs/PRODUCT_SPEC_V2.md`.

| Slice | Requirements | Work | Verification | Status |
|---|---|---|---|---|
| V2-A | R1,R12 | preserve GLB adapter + fallback + animation-ready contract | static contract | in-progress |
| V2-B | R2,R3,R4 | physical shader pass + vertex deformation + animation mixer support | syntax/contract + deploy | planned |
| V2-C | R5 | GPU particle morph engine + multi-class point rendering | syntax/contract + API state | planned |
| V2-D | R6 | halo, crown rays, floor, aura, ash, petals | source/deploy | planned |
| V2-E | R7 | cinematic post-FX shader | source/deploy | planned |
| V2-F | R8,R9 | pointer/touch Royal Pulse, parallax, intro reveal, haptic/audio cue | source/deploy | planned |
| V2-G | R10,R11 | keep public surface menu-free and reduced-motion-safe | DOM/static checks | planned |
| V2-H | all | docs, self-review, CI, Pages deploy | GitHub Actions + deployed artifact | planned |

## Dependency order
V2-A → V2-B → V2-C → V2-D/V2-E → V2-F → V2-G → V2-H.

## Scope/order deltas
- Added V2 cinematic scope by explicit user instruction.
- Existing V1 lab-control requirement is superseded for the public surface by the later explicit instruction that no menu exist.
- Cross-repository LoPRax-Web2 integration is not executed in this repository; the hero contract is kept reusable for that later integration.

## Full acceptance
V2 is complete when all V2 requirements are implemented, current CI passes, Pages deploy succeeds, and host-runtime visual interaction is either freshly smoke-tested or explicitly marked not verified if browser execution is unavailable.
