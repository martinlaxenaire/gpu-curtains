# gpu-curtains

> :warning: WIP

gpu-curtains is an attempt at rewriting [curtains.js](https://github.com/martinlaxenaire/curtainsjs) in WebGPU.

The library has been rewritten to the core, so it is not just a port of the existing codebase but instead a new version based on the original concept.

## Roadmap

### Implemented

- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Geometries
- Materials (Material, RenderMaterial, ComputeMaterial)
- Object3D, ProjectedObject3D, DOMObject3D
- Bindings & BindGroups
- Render + Compute Pipelines (async by default)
- Meshes (Mesh, DOMMesh, FullscreenPlane, Plane)
- Compute passes
- Scene class
- Scroll + resize, frustum culling check
- Texture & RenderTexture (with storage) classes
- Sampler class
- Shader passes 
- RenderTarget (render to textures)
- PingPong
- Plane raycasting
- Basic CacheManager
- GPUCurtains

### Work in progress

- Errors / warning handling
- Tests

### TODO

- ~~TextureLoader class?~~
- Cache compute pipelines
- Use render bundles?
- Mesh raycasting?
- Context lost handling
- More tests! (removing, samplers, external video textures, buffer offsets...)
- Documentation (using JSDoc?)
