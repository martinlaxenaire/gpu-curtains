---
title: DOM syncing usage
group: Guides
category: Tutorials
---

# Use gpu-curtains for DOM syncing

## HTML & CSS setup

### HTML

```html
<body>
  <div id="canvas"></div>
  
  <div id="page">
    <div id="plane">
      <img src="path/to/image.jpg" crossorigin="" data-texture-name="planeTexture" />
    </div>
  </div>
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

#page {
  padding: 20vh 0;
}

#plane {
  width: 80%;
  height: 80vh;
  margin: 0 auto;
}

#plane img {
  visibility: hidden;
}
```

## Basic plane scene

```javascript
import { GPUCurtains, Plane } from 'gpu-curtains'

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
  })

  // set the GPU device (note this is asynchronous)
  await gpuCurtains.setDevice()

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      let texture: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);
    
      return texture;
    }`

  // create a plane
  const plane = new Plane(gpuCurtains, document.querySelector('#plane'), {
    shaders: {
      fragment: {
        code: fs
      },
    },
  })
})
```

## DOMMesh usage

```javascript
import { GPUCurtains, DOMMesh, BoxGeometry } from 'gpu-curtains'

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
  })

  // set the GPU device (note this is asynchronous)
  await gpuCurtains.setDevice()

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      let texture: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);
    
      return texture;
    }`

  // create a mesh synced with the DOM element
  const mesh = new DOMMesh(gpuCurtains, document.querySelector('#plane'), {
    geometry: new BoxGeometry(),
    shaders: {
      fragment: {
        code: fs
      },
    },
  })

  // rotate it along X axis
  mesh.onBeforeRender(() => {
    mesh.rotation.x += 0.01
  })
})
```

## More examples

Have a look at all the possibilities in the [example section](https://martinlaxenaire.github.io/gpu-curtains/examples/).