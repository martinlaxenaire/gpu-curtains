# gpu-curtains

> :warning: WIP

gpu-curtains is an attempt at rewriting [curtains.js](https://github.com/martinlaxenaire/curtainsjs) in WebGPU.

The library has been rewritten to the core, so it is not just a port of the existing codebase but instead a new version based on the original concept.

## Roadmap

### Implemented

- Renderers (GPURenderer, GPUCameraRenderer, GPUCurtainsRenderer)
- Geometries
- Material
- Object3D, ProjectedObject3D, DOMObject3D
- Uniforms, BindGroups
- Render Pipelines
- Meshes (Mesh, DOMMesh, FullscreenPlane, Plane)
- Basic Scene class
- Scroll + resize, frustum culling check
- Texture & RenderTexture classes
- Shader passes 
- PingPong
- Plane raycasting
- Basic CacheManager
- GPUCurtains

### Work in progress

- Errors / warning handling
- Events / callbacks

### Todo

- Render targets?
- Compute pass
- TextureLoader class?
- Use async pipelines?
- Mesh raycasting?
- context lost handling
