// Goal of this test is to help debug texture transformations
window.addEventListener('DOMContentLoaded', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUCurtains, Plane } = await import(/* @vite-ignore */ path)

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

  const plane = new Plane(gpuCurtains, '#first-plane', {
    shaders: {
      vertex: {
        code: vertexShader,
      },
      fragment: {
        code: fragmentShader,
      },
    },
  })

  const switchButton = document.querySelector('#switch-plane')
  let isFirst = true

  switchButton.addEventListener('click', () => {
    plane.resetDOMElement(isFirst ? '#second-plane' : '#first-plane')
    isFirst = !isFirst
  })
})
