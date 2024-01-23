// Goal of this test is to help debug texture transformations
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.js' : '../../dist/gpu-curtains.js'
  const { GPUCurtains, Plane } = await import(path)

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

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
      var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);

      return color;
    }
  `

  const planeEls = document.querySelectorAll('.plane')

  planeEls.forEach((planeEl, index) => {
    const plane = new Plane(gpuCurtains, planeEl, {
      shaders: {
        vertex: {
          code: vertexShader,
        },
        fragment: {
          code: fragmentShader,
        },
      },
    })

    plane.textures[0].scale.set(1.5, 1.5, 1)

    if (index % 2 === 1) {
      plane.onRender(() => {
        plane.rotation.z += 0.01
        plane.textures[0].rotation.z -= 0.01
      })
    }
  })
})
