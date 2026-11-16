// Goal of this test is to help debug any issue due to scroll or resize
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, DOMMesh, Plane, GPUCurtains, MediaTexture, RenderBundle } = await import(/* @vite-ignore */ path)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    camera: {
      fov: 35,
    },
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    adapterOptions: {
      minFeatureLevel: 'compatibility',
    },
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  const NB_LAYERS = 6
  const canvases = []

  for (let i = 0; i < NB_LAYERS; i++) {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 300
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = `rgb(${(i / (NB_LAYERS - 1)) * 255}, ${(i / (NB_LAYERS - 1)) * 255}, ${
      (i / (NB_LAYERS - 1)) * 255
    })`
    ctx.fillRect(0, 0, 300, 300)

    ctx.fillStyle = '#ff0000'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '900 100px Arial'

    ctx.fillText(i, 150, 150)

    canvases.push(canvas)
  }

  const meshVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput : VSOutput;

      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.meshTexture.matrix);
      vsOutput.normal = attributes.normal;

      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(meshTexture, defaultSampler, fsInput.uv);
    }
  `

  const regularPlanesEls = document.querySelectorAll('.regular-plane')

  regularPlanesEls.forEach((planeEl, i) => {
    const texture = new MediaTexture(gpuCurtains, {
      label: 'Mesh texture ' + i,
      name: 'meshTexture',
      useTransform: true,
      cache: false,
    })

    texture.loadCanvas(canvases[i])

    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Plane ' + i,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshFs,
          entryPoint: 'main',
        },
      },
      textures: [texture],
    })
  })

  const meshFsArray = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(meshTexture, defaultSampler, fsInput.uv, params.textureIndex);
    }
  `

  const arrayPlanesEls = document.querySelectorAll('.array-plane')

  const arrayTexture = new MediaTexture(gpuCurtains, {
    label: 'Array texture',
    name: 'meshTexture',
    cache: false,
    // useTransform: true,
    viewDimension: '2d-array',
    generateMips: true,
    fixedSize: {
      width: 300,
      height: 300,
      depth: 6,
    },
  })

  arrayTexture.loadCanvases(canvases)

  console.log(arrayTexture)

  arrayPlanesEls.forEach((planeEl, i) => {
    let time = 0

    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Array plane ' + i,
      shaders: {
        // vertex: {
        //   code: meshVs,
        //   entryPoint: 'main',
        // },
        fragment: {
          code: meshFsArray,
          entryPoint: 'main',
        },
      },
      textures: [arrayTexture],
      uniforms: {
        params: {
          struct: {
            textureIndex: {
              type: 'u32',
              value: 0,
            },
          },
        },
      },
    })

    plane.onBeforeRender(() => {
      time++
      const textureIndex = Math.floor((time / 60) % 6)
      plane.uniforms.params.textureIndex.value = textureIndex
    })
  })

  const indexedArrayPlanesEls = document.querySelectorAll('.indexed-array-plane')

  indexedArrayPlanesEls.forEach((planeEl, i) => {
    const indexedArrayTexture = new MediaTexture(gpuCurtains, {
      label: 'Indexed array texture',
      name: 'meshTexture',
      cache: false,
      useTransform: true,
      fromTexture: arrayTexture,
      baseArrayLayer: i + 1,
      arrayLayerCount: 1,
    })

    console.log(indexedArrayTexture)

    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Indexed array plane ' + i,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshFsArray,
          entryPoint: 'main',
        },
      },
      textures: [indexedArrayTexture],
      uniforms: {
        params: {
          struct: {
            textureIndex: {
              type: 'u32',
              value: 0,
            },
          },
        },
      },
    })
  })
})
