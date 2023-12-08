window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })
    .onError(() => {
      console.log('gpu curtains error!')
    })
    .onContextLost((info) => {
      console.log(info, gpuCurtains.renderer)
    })

  await gpuCurtains.setRendererContext()

  // now add objects to our scene
  const cubeGeometry = new GPUCurtains.BoxGeometry()

  const mesh = new GPUCurtains.Mesh(gpuCurtains, {
    geometry: cubeGeometry,
  })

  mesh.onRender(() => {
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

       
        vsOutput.position = getOutputPosition(camera, matrices, attributes.position);

        // 'getUVCover' is used to compute a texture UV based on UV attributes and texture matrix
        vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);

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

  const plane = new GPUCurtains.Plane(gpuCurtains, '.plane', {
    shaders: {
      vertex: {
        code: vertexShader,
      },
      fragment: {
        code: fragmentShader,
      },
    },
  })

  const loseCtxButton = document.querySelector('#lose-context-button')

  let isContextActive = true

  loseCtxButton.addEventListener('click', () => {
    if (isContextActive) {
      gpuCurtains.renderer.device?.destroy()
      loseCtxButton.textContent = 'Restore context'
      console.log('lost', plane.material)
    } else {
      gpuCurtains.restoreContext()
      loseCtxButton.textContent = 'Lose context'
      console.log('restored', plane.material)
    }

    isContextActive = !isContextActive
  })
})
