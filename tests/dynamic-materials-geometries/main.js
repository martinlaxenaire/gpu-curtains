// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    Geometry,
    PlaneGeometry,
    BoxGeometry,
    SphereGeometry,
    GPUCameraRenderer,
    GPUDeviceManager,
    Mesh,
    Sampler,
    Texture,
    RenderMaterial,
    Vec2,
  } = await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  const mesh = new Mesh(gpuCameraRenderer, {
    label: 'Dynamic mesh',
    geometry: new BoxGeometry(),
    cullMode: 'none', // so we can always see the plane geometry
  })

  mesh.scale.set(1.5)

  let time = 0

  mesh.onBeforeRender(() => {
    //mesh.rotation.x += 0.005
    mesh.rotation.y += 0.02

    mesh.position.x = Math.cos(time * 0.02) * 2

    time++
  })

  console.log(mesh)

  // ---------------
  // GEOMETRIES
  // ---------------

  // prettier-ignore
  const vertices = new Float32Array([
    // front face
    1, -1, 1,
    0, 1, 0,
    -1, -1, 1,

    // right face
    1, -1, -1,
    0, 1, 0,
    1, -1, 1,

    // back face
    -1, -1, -1,
    0, 1, 0,
    1, -1, -1,

    // left face
    -1, -1, 1,
    0, 1, 0,
    -1, -1, -1,

    // bottom first
    -1, -1, -1,
    1, -1, -1,
    -1, -1, 1,
    // bottom second
    1, -1, 1,
    -1, -1, 1,
    1, -1, -1
  ])

  // prettier-ignore
  const uvs = new Float32Array([
    // front face
    1, 1,
    0.5, 0,
    0, 1,

    // right face
    1, 1,
    0.5, 0,
    0, 1,

    // back face
    1, 1,
    0.5, 0,
    0, 1,

    // left face
    1, 1,
    0.5, 0,
    0, 1,

    // bottom first
    0, 1,
    1, 1,
    0, 0,
    // bottom second
    1, 0,
    0, 0,
    1, 1,
  ])

  // prettier-ignore
  const normals = new Float32Array([
    // front face
    0, 0.33, 0.66,
    0, 0.33, 0.66,
    0, 0.33, 0.66,

    // right face
    0.33, 0, 0.66,
    0.33, 0, 0.66,
    0.33, 0, 0.66,

    // back face
    0, 0.33, -0.66,
    0, 0.33, -0.66,
    0, 0.33, -0.66,

    // left face
    -0.33, 0, 0.66,
    -0.33, 0, 0.66,
    -0.33, 0, 0.66,

    // bottom first
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    // bottom second
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
  ])

  const customGeometry = new Geometry({
    vertexBuffers: [
      {
        name: 'attributes',
        stepMode: 'vertex', // explicitly set the stepMode even if not mandatory
        attributes: [
          {
            name: 'position',
            type: 'vec3f',
            bufferFormat: 'float32x3',
            size: 3,
            array: vertices,
          },
          {
            name: 'uv',
            type: 'vec2f',
            bufferFormat: 'float32x2',
            size: 2,
            array: uvs,
          },
          {
            name: 'normal',
            type: 'vec3f',
            bufferFormat: 'float32x3',
            size: 3,
            array: normals,
          },
        ],
      },
    ],
  })

  const geometries = {
    box: mesh.geometry,
    plane: new PlaneGeometry(),
    sphere: new SphereGeometry(),
    custom: customGeometry,
  }

  // ---------------
  // MATERIALS
  // ---------------

  // checker board material
  const checkerboardFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var c: vec2f = floor(fsInput.uv * checkerboard.scale) * 0.5;
      var checker: f32 = 2.0 * fract(c.x + c.y);
    
      var color: vec4f = vec4(vec3(checker) * 0.5, 1.0);
      return color;
    }
  `

  // textured material
  const anisotropicSampler = new Sampler(gpuCameraRenderer, {
    label: 'Anisotropic sampler',
    name: 'anisotropicSampler',
    maxAnisotropy: 16,
  })

  const texture = new Texture(gpuCameraRenderer, {
    label: 'Image texture',
    name: 'imageTexture',
    generateMips: true,
  })

  texture.loadImage('https://source.unsplash.com/featured/1920x1280/?nature&1')

  const texturedFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(imageTexture, anisotropicSampler, fsInput.uv);
    }
  `

  // needed to match the rendering options with mesh normal material
  // copy rendering options and default (matrices) bindings
  const commonMaterialProps = {
    ...mesh.material.options.rendering, // rendering options
    bindings: Array.from(mesh.material.inputsBindings, ([name, value]) => value), // default matrices
  }

  const materials = {
    normal: mesh.material,
    checkerboard: new RenderMaterial(gpuCameraRenderer, {
      ...commonMaterialProps,
      shaders: {
        fragment: {
          code: checkerboardFs,
        },
      },
      uniforms: {
        checkerboard: {
          struct: {
            scale: {
              type: 'vec2f',
              value: new Vec2(4),
            },
          },
        },
      },
    }),
    textured: new RenderMaterial(gpuCameraRenderer, {
      ...commonMaterialProps,
      shaders: {
        fragment: {
          code: texturedFs,
        },
      },
      textures: [texture],
      samplers: [anisotropicSampler],
    }),
  }

  // ---------------
  // GUI
  // ---------------

  const options = {
    geometry: 'box',
    material: 'normal',
  }

  const gui = new lil.GUI({
    title: 'Dynamic materials and geometries',
  })

  gui
    .add(options, 'geometry', geometries)
    .name('Geometry')
    .onChange((value) => {
      mesh.useGeometry(value)
    })

  gui
    .add(options, 'material', materials)
    .name('Material')
    .onChange((value) => {
      mesh.useMaterial(value)
    })
})
