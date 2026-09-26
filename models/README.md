# Phoenix model slot

The lab works today with the procedural model in `src/phoenix.js`.

To test an artist-grade GLB later:

1. Add a web-optimized `.glb` under this folder.
2. Open the lab with `?model=./models/your-model.glb`.
3. The GLB adapter loads the scene, samples mesh surfaces into the canonical particle target contract, and reuses the same Particle / Rose / Crown / UI systems.

Recommended web target: one GLB, compressed textures, sensible mesh count, and a total payload appropriate for mobile.
