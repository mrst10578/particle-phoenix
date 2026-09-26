# Phoenix models

`royal-phoenix-v1.glb` is the canonical default model for the Royal Phoenix 3D Lab.

It is generated reproducibly by `scripts/build_phoenix_glb.py` and currently uses seven material-merged geometries to keep browser draw calls low while preserving the layered Phoenix / crimson rose / crown visual language.

## Runtime behavior

- Default: the Lab loads `./models/royal-phoenix-v1.glb`.
- `?procedural=1`: force the original procedural Three.js fallback.
- `?model=<url-or-relative-path>`: load a replacement GLB through the same surface-sampling adapter.

Any replacement model is sampled into the canonical particle target contract, so Phoenix / Rose / Crown / Scatter morphing and the Lab UI do not need to be rewritten.
