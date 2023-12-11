# Roadmap

## Implemented

- Object3D, ProjectedObject3D, DOMObject3D
- Camera
- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
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

- Errors / warning handling
- Context lost handling
- Examples & tests

## TODO

- ~~TextureLoader class?~~
- constants for WebGPU flags
- Use render bundles?
- Mesh raycasting?
- Handle multiple canvas / renderers?
- More tests! (removing, samplers, external video textures, context lost/restored...)
- Documentation (using JSDoc?)