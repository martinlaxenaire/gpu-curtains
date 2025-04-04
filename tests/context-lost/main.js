// Goal of this test is checking if device lost/restoration works
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCurtains, IndirectBuffer, RenderBundle, Mesh, Plane, ShaderPass } = await import(
    /* @vite-ignore */ path
  )

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })
    .onError(() => {
      console.log('gpu curtains error!')
    })
    .onContextLost((info) => {
      // this won't be called if we intentionally destroyed the device
      console.log(info, gpuCurtains.renderer)
      gpuCurtains.restoreContext()
    })
    .onContextDestroyed((info) => {
      // this will be called when clicking the lose context button
      console.log('CONTEXT DESTROYED, most probably by clicking the button.', info)
    })

  //
  const adapter = await navigator.gpu.requestAdapter()
  const device = await adapter.requestDevice()

  gpuCurtains.setDevice({ adapter, device })
  // await gpuCurtains.setDevice()
  //

  //await gpuCurtains.setDevice()

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()

  const indirectBuffer = new IndirectBuffer(gpuCurtains, {
    geometries: [cubeGeometry],
  })

  indirectBuffer.create()

  const renderBundle = new RenderBundle(gpuCurtains, {
    size: 1,
    useBuffer: true,
    //useIndirectDraw: true,
  })

  const mesh = new Mesh(gpuCurtains, {
    geometry: cubeGeometry,
    renderBundle,
  })

  //mesh.position.z = -0.5

  mesh.onBeforeRender(() => {
    mesh.rotation.y += 0.01
  })

  const vertexShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;

     
      vsOutput.position = getOutputPosition(attributes.position);

      // 'getUVCover' is used to compute a texture UV based on UV attributes and texture matrix
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.planeTexture.matrix);

      return vsOutput;
    }
  `

  const fragmentShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var texture: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);

      return texture;
    }
  `

  const plane = new Plane(gpuCurtains, '.plane', {
    shaders: {
      vertex: {
        code: vertexShader,
      },
      fragment: {
        code: fragmentShader,
      },
    },
  })

  const postProShader = /* wgsl */ `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var texture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);

        return mix( vec4(texture.rgb, texture.a), vec4(1.0 - texture.rgb, texture.a), step(fsInput.uv.x, 0.5) );
      }
  `

  const postProPass = new ShaderPass(gpuCurtains, {
    shaders: {
      fragment: {
        code: postProShader,
      },
    },
    targets: [
      {
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
          },
        },
      },
    ],
  })

  console.log(gpuCurtains, plane, postProPass)

  // lost context

  const loseCtxButton = document.querySelector('#lose-context-button')

  let isContextActive = true

  loseCtxButton.addEventListener('click', () => {
    if (isContextActive) {
      gpuCurtains.renderer.device?.destroy()
      loseCtxButton.textContent = 'Restore context'
      console.log('lost', postProPass.material)
    } else {
      gpuCurtains.restoreContext()
      loseCtxButton.textContent = 'Lose context'
      console.log('restored', postProPass.material, mesh.material, plane.textures)
    }

    isContextActive = !isContextActive
  })
})
