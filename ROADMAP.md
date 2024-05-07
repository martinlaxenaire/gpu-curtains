# Roadmap

## Implemented

- GPUDeviceManager (can handle multiple renderers / canvases)
- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Scene class with scene graph for Object3D, ProjectedObject3D, DOMObject3D
- Camera
- Geometries
- Materials (Material, RenderMaterial, ComputeMaterial)
- Buffer & Bindings & BindGroups
- Render + Compute Pipelines (async by default)
- PipelineManager to cache RenderPipeline + set only needed BindGroup
- Meshes (Mesh, DOMMesh, FullscreenPlane, Plane)
- Compute passes
- Texture (including storage & depth) & DOMTexture classes
- Sampler class
- RenderTarget (render to textures)
- RenderPass (render pass descriptors) with MRT support
- Shader passes
- PingPongPlane
- Plane raycasting
- Basic CacheManager
- Scroll + resize, frustum culling check
- GPUCurtains
- OrbitControls

## Work in progress

- Examples & tests
- glTF loading

## TODO / possible improvements

- Add Mat3 class + normalMatrix to ProjectedObject3D?
- Mesh raycasting
- Improve typedoc documentation?
- Use render bundles? Probably not suited to the library tho
- Use indirect draw calls?
- More examples & tests?