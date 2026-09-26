# Phoenix models

`royal-phoenix-external-v1.glb` is the canonical hero model for the Royal Phoenix 3D Lab.

It is an optimized derivative of the external CC BY Phoenix model by **rononono** from Sketchfab. For web performance, the downloaded geometry was consolidated from hundreds of mesh parts into one GLB mesh while preserving the sculpted silhouette. Runtime code applies LoPRax royal vertex coloring, PBR material tuning, automatic centering/scaling, and surface sampling for particles.

`royal-phoenix-v1.glb` is the internally generated fallback model.

## Runtime order

1. `?model=<url-or-relative-path>` when explicitly provided.
2. `./models/royal-phoenix-external-v1.glb` as the default.
3. `./models/royal-phoenix-v1.glb` as the internal GLB fallback.
4. Procedural Three.js phoenix as the final fallback.

Use `?procedural=1` to force the procedural model.

All GLB paths are normalized into the same particle target contract, so Phoenix / Rose / Crown / Scatter morphing uses the active model without changing the particle engine.

See `ASSET_CREDITS.md` for attribution and modification notes.
