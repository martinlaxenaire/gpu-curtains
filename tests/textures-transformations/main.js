// Goal of this test is to help debug texture transformations
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUCurtains, RenderBundle, Plane } = await import(/* @vite-ignore */ path)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
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

      vsOutput.position = getOutputPosition(attributes.position);
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
      var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);

      return color;
    }
  `

  const planeEls = document.querySelectorAll('.plane')

  const renderBundle = new RenderBundle(gpuCurtains, {
    label: 'Texture transformations render bundle',
    size: planeEls.length,
    useBuffer: true,
  })

  planeEls.forEach((planeEl, index) => {
    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Plane ' + index,
      renderBundle,
      shaders: {
        vertex: {
          code: vertexShader,
        },
        fragment: {
          code: fragmentShader,
        },
      },
    })

    plane.domTextures[0].scale.set(1.5, 1.5)

    if (index % 2 === 1) {
      plane.onBeforeRender(() => {
        plane.rotation.z += 0.01
        plane.domTextures[0].rotation -= 0.01
      })
    }
  })
})
