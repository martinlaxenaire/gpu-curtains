# gpu-curtains

<div align="center">
    <img src="https://raw.githubusercontent.com/martinlaxenaire/gpu-curtains/main/website/assets/gpu-curtains-logo-1080-720.jpg" width="500" alt="gpu-curtains" />
</div>


[Website](https://martinlaxenaire.github.io/gpu-curtains/) - [Documentation](https://martinlaxenaire.github.io/gpu-curtains/docs/) - [Examples](https://martinlaxenaire.github.io/gpu-curtains/examples/)

---

>
> :warning: WIP
>

---

<p align="center">
    <a href="https://npmjs.org/package/gpu-curtains">
        <img src="https://img.shields.io/npm/v/gpu-curtains" alt="version" />
    </a>
    <a href="https://bundlephobia.com/result?p=gpu-curtains">
        <img src="https://img.shields.io/bundlephobia/minzip/gpu-curtains" alt="size" />
    </a>
</p>

### DOM 2 WebGPU rendering engine

gpu-curtains is a small, lightweight WebGPU rendering engine library.

Although it can theoretically be used as a genuine 3D engine, its main purpose is to turn HTML elements into textured planes, allowing you to animate them via WGSL shaders.

The project was initially conceived as a WebGPU port of [curtains.js](https://github.com/martinlaxenaire/curtainsjs). It turned out to be a complete rewrite of the library instead, but with a very similar API.

## Usage

You can directly download the files and start using the ES6 modules:

#### ES modules

```javascript
import { GPUCurtains } from 'path/to/dist/esm/index.mjs'

window.addEventListener('load', async () => {
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

  // now create some magic!
})
```

You can also use one of your favorite package manager:

#### npm

```
npm i gpu-curtains
```

#### yarn

```
yarn add gpu-curtains
```

Finally, you can load the library from a CDN. You should always target a specific version (append `@x.x.x`) rather than the latest one in order to avoid breaking changes.

```javascript
import { ... } from 'https://esm.run/gpu-curtains'
// or
import { ... } from 'https://cdn.skypack.dev/gpu-curtains'
// or use another cdn...
```

#### UMD files

In a browser, you can use the UMD files located in the `dist` directory:

```html
<script src="path/to/dist/gpu-curtains.umd.min.js"></script>
```

Or use a CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/gpu-curtains"></script>
```

## Documentation and examples

- [API documentation](https://martinlaxenaire.github.io/gpu-curtains/docs/)
- [Official examples](https://martinlaxenaire.github.io/gpu-curtains/examples/)
- [Website](https://martinlaxenaire.github.io/gpu-curtains/)

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
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

#canvas {
  /* make the canvas wrapper fits the viewport */
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100lvh;
}
```

### Javascript

```javascript
import { Curtains, Mesh } from 'gpu-curtains';

window.addEventListener('load', async () => {
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

## Limitations

Since gpu-curtains is mostly made to create quads based on HTML elements, it may lack some common 3D engines features.

If you need a real 3D engine that could handle complex geometries or advanced rendering mechanics, then you should probably go with another library like [three.js](https://github.com/mrdoob/three.js) or [Babylon.js](https://github.com/BabylonJS).

## Contributing

Contribution are more than welcome! Please refer to the [contribution guidelines](CONTRIBUTING.md).

## Acknowledgements

Some parts of the code (mostly the math classes) have been ported or adapted from other existing open source libraries like [three.js](https://github.com/mrdoob/three.js) and [glmatrix](https://github.com/toji/gl-matrix).

Some examples are also ported and/or inspired by other online open-source WebGL or WebGPU examples. In any case the source should always be credited in the code. If a credit is missing, feel free to reach out or make a PR.

The [WebGPU samples](https://github.com/webgpu/webgpu-samples), [WebGPU fundamentals](https://webgpufundamentals.org/) and [WebGPU best practices](https://toji.dev/webgpu-best-practices/) were very helpful to help with the basic concepts of WebGPU. If you want to understand a bit more how it's working under the hood, do not hesitate to check those.

A big thanks to the members of the [WebGPU matrix chan](https://matrix.to/#/#WebGPU:matrix.org) that were always super kinds and very helpful as well.

## Changelog and roadmap

- [Releases](https://github.com/martinlaxenaire/gpu-curtains/releases)
- See the [roadmap](ROADMAP.md) for details on the current work in progress and possible improvements.
