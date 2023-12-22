# gpu-curtains

> :warning: WIP

#### WebGPU rendering engine

gpu-curtains is a small, lightweight WebGPU rendering engine library.

Although it can theoretically be used as a genuine 3D engine, its main purpose is to turn HTML elements into textured planes, allowing you to animate them via WGSL shaders.

The project was initially conceived as a WebGPU port of [curtains.js](https://github.com/martinlaxenaire/curtainsjs). It turned out to be a complete rewrite of the library instead, but with a very similar API.

## Basic example

### HTML

```html
<body>
    <!-- div that will hold our WebGPU canvas -->
    <div id="canvas"></div>
</body>
```

### CSS

```css
body {
    /* make the body fits our viewport */
    position: relative;
    width: 100%;
    height: 100vh;
    margin: 0;
    overflow: hidden;
}

#canvas {
    /* make the canvas wrapper fits the viewport as well */
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}
```

### Javascript

```javascript
import { Curtains, Mesh } from 'gpu-curtains';

window.addEventListener('DOMContentLoaded', async () => {
  // set our main GPUCurtains instance
  // it will handle everything we need
  // a WebGPU device and a renderer with its scene,
  // requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas'
  })

  // set the GPU device
  // note this is asynchronous
  await gpuCurtains.setDevice()

  // create a cube mesh
  const mesh = new Mesh(gpuCurtains, {
    geometry: new BoxGeometry(),
  })

  // make it rotate
  mesh.onRender(() => {
    mesh.rotation.x += 0.01
    mesh.rotation.y += 0.02
  })
})
```

### Roadmap

See the [roadmap](ROADMAP.md) for details on the current work in progress.
