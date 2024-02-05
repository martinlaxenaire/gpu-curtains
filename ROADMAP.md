# Roadmap

## Implemented

- GPUDeviceManager (can handle multiple renderers / canvases)
- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Scene graph with Object3D, ProjectedObject3D, DOMObject3D
- Camera
- Geometries
- Materials (Material, RenderMaterial, ComputeMaterial)
- Bindings & BindGroups
- Render + Compute Pipelines (async by default)
- Meshes (Mesh, DOMMesh, FullscreenPlane, Plane)
- Compute passes
- Scene class
- Texture & RenderTexture (with storage & depth) classes
- Sampler class
- RenderTarget (render to textures)
- RenderPass (render pass descriptors) with MRT support
- Shader passes
- PingPongPlane
- Plane raycasting
- Basic CacheManager
- Scroll + resize, frustum culling check
- GPUCurtains

## Work in progress

- Shadow mapping implementation
- Examples & tests

## TODO / possible improvements

- Improve typedoc documentation?
- Use constants for WebGPU buffers and textures flags/usages? Add to options/parameters?
- Use render bundles? Probably not suited to the library tho
- Use indirect draw calls?
- Mesh raycasting?
- More examples & tests?