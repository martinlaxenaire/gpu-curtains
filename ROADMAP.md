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
- Lights & Shadows
- Shader passes
- PingPongPlane
- RenderBundle
- Basic CacheManager
- Scroll + resize, frustum culling check
- GPUCurtains
- OrbitControls
- Raycaster
- GLTFLoader + GLTFScenesManager

## Work in progress

- Examples & tests

## TODO / possible improvements

- Add/improve GLTFScenesManager features (sparse accessors, animations, morphing, skinning...)
- Add more lights (SpotLight...)
- Improve typedoc documentation?
- Use indirect draw calls?
- More examples & tests?