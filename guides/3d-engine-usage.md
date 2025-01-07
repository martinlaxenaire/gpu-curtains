---
title: 3D engine usage
group: Guides
category: Tutorials
---

# Use gpu-curtains as a 3D engine

gpu-curtains can be used as a genuine 3D engine.
Here are a few examples on how to render a basic rotating cube.

## HTML & CSS setup

### HTML

```html
<body>
  <div id="canvas"></div>
</body>
```

### CSS

```css
body {
  margin: 0;
  height: 100%;
}

#canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
}
```

## Basic rotating cube scene

#### Using the library default shaders

```javascript
import { GPUDeviceManager, GPUCameraRenderer, Mesh, BoxGeometry } from 'gpu-curtains'

// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a camera renderer
const renderer = new GPUCameraRenderer({
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

// render a mesh using its normals as shading colors
// which are gpu-curtains fallback default shaders
const mesh = new Mesh(renderer, {
  label: 'Cube mesh',
  geometry: new BoxGeometry()
})

// rotate it along Y axis
mesh.onBeforeRender(() => {
  mesh.rotation.y += 0.01
})
```

#### Using custom shaders

```javascript
import { GPUDeviceManager, GPUCameraRenderer, Mesh, BoxGeometry, Vec3 } from 'gpu-curtains'

// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a camera renderer
const renderer = new GPUCameraRenderer({
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

const vs = /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  // gpu-curtains built-in WGSL functions
  // to get output position and normals in world space
  vsOutput.position = getOutputPosition(attributes.position);
  vsOutput.normal = getWorldNormal(attributes.normal);
  vsOutput.uv = attributes.uv;
  
  return vsOutput;
}`

const fs = /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  // simple directional lighting model
  let N: vec3f = normalize(fsInput.normal);
  let L: vec3f = normalize(lighting.lightDirection);
  let NDotL: f32 = max(dot(N, L), 0.0);
  
  let outColor: vec3f = (shading.color * lighting.ambient) + (shading.color * NDotL);
  
  return vec4(outColor, 1.0);
}`

// render a mesh with a basic lighting shading
const mesh = new Mesh(renderer, {
  label: 'Cube mesh',
  geometry: new BoxGeometry(),
  shaders: {
    vertex: {
      code: vs,
    },
    fragment: {
      code: fs,
    },
  },
  uniforms: {
    shading: {
      visibility: ['fragment'],
      struct: {
        color: {
          type: 'vec3f',
          value: new Vec3(1, 0, 1),
        },
      },
    },
    lighting: {
      visibility: ['fragment'],
      struct: {
        ambient: {
          type: 'vec3f',
          value: new Vec3(0.03),
        },
        lightDirection: {
          type: 'vec3f',
          value: new Vec3(10),
        },
        lightColor: {
          type: 'vec3f',
          value: new Vec3(1),
        },
      },
    },
  },
})

// rotate it along Y axis
mesh.onBeforeRender(() => {
  mesh.rotation.y += 0.01
})
```

#### Using built-in lights and lambert shading

```javascript
import {
  GPUDeviceManager,
  GPUCameraRenderer,
  AmbientLight,
  DirectionalLight,
  getLambert,
  Mesh,
  BoxGeometry,
  Vec3
} from 'gpu-curtains'

// first, we need a WebGPU device, that's what GPUDeviceManager is for
const gpuDeviceManager = new GPUDeviceManager({
  label: 'Custom device manager',
})

// we need to wait for the device to be created
await gpuDeviceManager.init()

// then we can create a camera renderer
const renderer = new GPUCameraRenderer({
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

// add an ambient light
const ambientLight = new AmbientLight(renderer, {
  intensity: 0.03
})

// add a directional light
const directionalLight = new DirectionalLight(renderer, {
  position: new Vec3(10)
})

const fs = /* wgsl */ `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPosition: vec3f,
};

// lambert shading helpers
${getLambert()}

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  var outColor: vec3f = shading.color;
  
  let normal = normalize(fsInput.normal);
  let worldPosition = fsInput.worldPosition;
  
  // lambert
  outColor = getLambert(normal, worldPosition, outColor);
  
  return vec4(outColor, 1.0);
}`

// render the mesh
const mesh = new Mesh(renderer, {
  label: 'Cube mesh',
  geometry: new BoxGeometry(),
  shaders: {
    fragment: {
      code: fs,
    },
  },
  uniforms: {
    shading: {
      visibility: ['fragment'],
      struct: {
        color: {
          type: 'vec3f',
          value: new Vec3(1, 0, 1),
        },
      },
    },
  },
})

// rotate it along Y axis
mesh.onBeforeRender(() => {
  mesh.rotation.y += 0.01
})
```

## More examples

Have a look at all the possibilities in the [example section](https://martinlaxenaire.github.io/gpu-curtains/examples/).