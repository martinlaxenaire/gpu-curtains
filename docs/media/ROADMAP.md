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
- Meshes (Mesh, DOMMesh, FullscreenPlane, Plane, LitMesh)
- Compute passes
- Texture (including storage & depth) & DOMTexture classes
- Sampler class
- RenderTarget (render to textures)
- RenderPass (render pass descriptors) with MRT support
- Lights & Shadows
- Shader passes and Compute shader passes
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

## TODO / possible improvements

- Improve/add more GLTFScenesManager extensions
- MSDF fonts
- Compute skinning?
- Clustered shading?
- Eventual shader custom preprocessor?
- Improve typedoc documentation?
- Cascaded shadow maps/Variance shadow maps?
- More examples & tests?
