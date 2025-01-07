---
title: The renderers, scene rendering and camera
group: Guides
category: About
---

# The renderers, scene rendering and camera

The scene rendering and eventually camera are taken care of by gpu-curtains renderers under the hood. But you can always render meshes and compute passes on demand if you prefer.

Let's see in detail how gpu-curtains handle internally the {@link core/scenes/Scene.Scene | Scene} class, the scene graph, the camera projection, and the lighting setup, and how you can decide to opt out of some of those features.

## The renderers

gpu-curtains’ library core exposes 2 renderers, the {@link core/renderers/GPURenderer.GPURenderer | GPURenderer} and the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} that extends the {@link core/renderers/GPURenderer.GPURenderer | GPURenderer}.

They both need at least a {@link core/renderers/GPUDeviceManager.GPUDeviceManager | GPUDeviceManager}, that handles the WebGPU device and adapter, and a canvas HTML element in order to be created.

### GPURenderer

This is the base renderer. When created it automatically uses a {@link core/scenes/Scene.Scene | Scene} class instance object, where all meshes, shader passes or compute passes will be added and automatically rendered in the right order.

It is mostly useful to render fullscreen quad meshes, shader passes (post processing effects) and/or compute passes.
It is therefore best suited for background effects or shadertoy like usage.

This renderer can handle:
- {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}
  - {@link core/renderPasses/ShaderPass.ShaderPass | ShaderPass}
  - {@link extras/meshes/PingPongPlane.PingPongPlane | PingPongPlane}
- {@link core/computePasses/ComputePass.ComputePass | ComputePass}

```javascript
// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a basic renderer
// no need for camera or DOM syncing here
const gpuRenderer = new GPURenderer({
  label: 'Basic GPU Renderer',
  deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
  container: document.querySelector('#canvas'),
})

// start rendering
const animate = () => {
  gpuDeviceManager.render()
  requestAnimationFrame(animate)
}

animate()
```

### GPUCameraRenderer

This is the renderer you’ll use if you want to render a typical 3D scene.
It internally creates a {@link core/camera/Camera.Camera | Camera} and a {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} for its matrices, as well as optional {@link core/bindings/BufferBinding.BufferBinding | buffer bindings} for the lights and shadows, a put all of them in a
{@link core/bindGroups/BindGroup.BindGroup | BindGroup}.
This bind group will be automatically added to all the meshes that should be projected onto the screen using the camera projection and view matrices.

This renderer can handle:
- {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}
    - {@link core/renderPasses/ShaderPass.ShaderPass | ShaderPass}
    - {@link extras/meshes/PingPongPlane.PingPongPlane | PingPongPlane}
- {@link core/meshes/Mesh.Mesh | Mesh}
- {@link core/computePasses/ComputePass.ComputePass | ComputePass}

```javascript
// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a camera renderer
const gpuCameraRenderer = new GPUCameraRenderer({
  label: 'GPU Camera Renderer',
  deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
  container: document.querySelector('#canvas'),
})

// start rendering
const animate = () => {
  gpuDeviceManager.render()
  requestAnimationFrame(animate)
}

animate()
```

### GPUCurtainsRenderer

Finally, there’s a third renderer available, even tho it’s not part of the core but of the “curtains” part. The
{@link curtains/renderers/GPUCurtainsRenderer.GPUCurtainsRenderer | GPUCurtainsRenderer} extends the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} and is used to keep track of the special DOM synced {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh} and {@link curtains/meshes/Plane.Plane | Plane} meshes.

This renderer can handle:
- {@link core/meshes/FullscreenPlane.FullscreenPlane | FullscreenPlane}
    - {@link core/renderPasses/ShaderPass.ShaderPass | ShaderPass}
    - {@link extras/meshes/PingPongPlane.PingPongPlane | PingPongPlane}
- {@link core/meshes/Mesh.Mesh | Mesh}
- {@link curtains/meshes/DOMMesh.DOMMesh | DOMMesh}
  - {@link curtains/meshes/Plane.Plane | Plane}
- {@link core/computePasses/ComputePass.ComputePass | ComputePass}

Most of the time, you'll be using the default one created by a {@link curtains/GPUCurtains.GPUCurtains} instance:

```javascript
// set our main GPUCurtains instance it will handle everything we need
// a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
const gpuCurtains = new GPUCurtains({
  container: '#canvas',
})

// set the GPU device (note this is asynchronous)
await gpuCurtains.setDevice()

// get the automatically created GPUCurtainsRenderer
const { renderer } = gpuCurtains
```

## The renderers’ scene

Each renderer is therefore responsible for its own scene, where the meshes will be automatically added and stacked using criterias such as:
- Unprotected vs projected (i.e. does it need to use the eventual renderer camera and light bind group)
- Opaque and transparent
- Render order property

Compute passes are executed before drawing the meshes, and shader passes after.

### Opt out of the scene stack

When creating any kind of meshes or compute pass, you can decide to not add it to the scene by setting the `autoRender` parameter to false.

That way, you’ll opt out of the scene rendering stack, but then you’d have to manually render the object somewhere in your code. It could be once on init, or once after an event happened, or each frame. It’s up to you.

```javascript
// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a camera renderer
const gpuCameraRenderer = new GPUCameraRenderer({
  label: 'GPU Camera Renderer',
  deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
  container: document.querySelector('#canvas'),
  lights: false // do not use lights
})

// start rendering
const animate = () => {
  gpuDeviceManager.render()
  requestAnimationFrame(animate)
}

animate()

// create a mesh that will be rendered just once
const mesh = new Mesh(gpuCameraRenderer, {
  label: 'Mesh rendered once',
  geometry: new BoxGeometry(),
  autoRender: false, // do not add it to the renderer scene
})

// compile its material
await mesh.material.compileMaterial()

// render once
gpuCameraRenderer.renderOnce([mesh])
```

### Increase or disable the lights buffers

The {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} and {@link curtains/renderers/GPUCurtainsRenderer.GPUCurtainsRenderer | GPUCurtainsRenderer} both create fixed size buffers for your lighting setup. You can increase each light type buffers capacities or even disable them if you don’t need lighting by using the `lights` parameter when creating them.

#### Custom lights buffers

```javascript
// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a basic renderer
// no need for camera or DOM syncing here
const gpuCameraRenderer = new GPUCameraRenderer({
  label: 'GPU Camera Renderer with custom lights setup',
  deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
  container: document.querySelector('#canvas'),
  lights: {
    maxAmbientLights: 5,
    maxDirectionalLights: 50,
    maxPointLights: 1,
  }
})

// start rendering
const animate = () => {
  gpuDeviceManager.render()
  requestAnimationFrame(animate)
}

animate()
```

#### Disable lights buffers

```javascript
// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a basic renderer
// no need for camera or DOM syncing here
const gpuCameraRenderer = new GPUCameraRenderer({
  label: 'GPU Camera Renderer without lights',
  deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
  container: document.querySelector('#canvas'),
  lights: false // do not use lights
})

// start rendering
const animate = () => {
  gpuDeviceManager.render()
  requestAnimationFrame(animate)
}

animate()
```
