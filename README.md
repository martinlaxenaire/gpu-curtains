# gpu-curtains

WIP

## Implemented
- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Geometries
- Material
- Object3D, ProjectedObject3D, DOMObject3D
- Uniforms, BindGroups
- Pipelines
- Meshes (Mesh, DOMMesh, FullscreenPlane, Plane)
- Basic Scene class
- Scroll + resize, frustum culling check
- Basic Texture class
- GPUCurtains
- Basic CacheManager
- Shader passes + PingPong

## Roadmap / TODO

- Scene class (in progress)
- Render targets? (+ compute pass?), PingPong (does it really need a separate class?)
- TextureLoader class
- Use async pipelines?
- Plane raycasting (almost done)
- context lost handling
- Errors / warning handling
