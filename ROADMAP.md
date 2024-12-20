# Roadmap

## Implemented

- GPUDeviceManager (can handle multiple renderers / canvases)
- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Scene class with scene graph for Object3D, ProjectedObject3D, DOMObject3D
- Camera
- Geometries
- Materials (Material, RenderMaterial, ComputeMaterial)
- Buffers & Bindings & BindGroups
- Render + Compute Pipelines (async by default)
- PipelineManager to cache RenderPipelineEntry and ComputePipelineEntry + set only needed BindGroup
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
- IndirectBuffer (indirect drawing)
- Basic CacheManager
- Scroll + resize, frustum culling check
- GPUCurtains
- OrbitControls
- Raycaster
- GLTFLoader + GLTFScenesManager
- HDRLoader + EnvironmentMap

## Work in progress

- Examples & tests

## TODO / possible improvements

- Add/improve GLTFScenesManager features (sparse accessors, animations, morphing, skinning...)
- Add more lights (SpotLight...)
- MSDF fonts
- Better shader chunks system and/or custom preprocessor
- Implement different lit extras RenderMaterial (i.e. RenderLambertMaterial, RenderPhongMaterial, RenderPBRMaterial, etc.)?
- Improve typedoc documentation?
- More examples & tests?