# Roadmap

## Implemented

- GPUDeviceManager (can handle multiple renderers / canvases)
- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Object3D, ProjectedObject3D, DOMObject3D
- Camera
- Geometries
- Materials (Material, RenderMaterial, ComputeMaterial)
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

## Work in progress

- Examples & tests
- Documentation (typedoc)
- Build tool

## TODO

- constants for WebGPU flags/usages?
- Use render bundles?
- Mesh raycasting?
- More tests! (samplers, external video textures...)