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
- Texture & RenderTexture (with storage & depth) classes
- Sampler class
- Shader passes
- RenderTarget (render to textures)
- RenderPass (render pass descriptors)
- PingPong
- Plane raycasting
- Basic CacheManager
- GPUCurtains

## Work in progress

- Documentation (typedoc)
- Build tool

## TODO / possible improvements

- constants for WebGPU buffers and textures flags/usages + add to options/parameters?
- Use render bundles? Probably not suited to the library tho
- Use indirect draw calls?
- MRT (allow to write to multiple textures/output via the `targets` property of the RenderPipeline + colorAttachements of the RenderPass descriptor: see [deferred rendering example WebGPU samples example](https://webgpu.github.io/webgpu-samples/samples/deferredRendering))?
- Mesh raycasting?
- More examples & tests?