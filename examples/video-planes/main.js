import { GPUCurtains, Plane } from '../../dist/esm/index.mjs'

window.addEventListener('DOMContentLoaded', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    // display original videos
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  const videoVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
  
      var strength: f32 = 0.2;
      var nbWaves: f32 = 3.0;
  
      // map vertices coordinates to the 0->1 range on the X axis
      var normalizeXPos: f32 = (attributes.position.x + 0.5) * 0.5;
  
      // notice how the "uniforms" struct name matches our bindings object name property
      var time: f32 = frames.elapsed * 0.015;
  
      var waveSinusoid: f32 = sin(3.141595 * nbWaves * normalizeXPos - time);
  
      var transformed: vec3f = vec3(
          attributes.position.x,
          attributes.position.y,
          attributes.position.z - waveSinusoid * strength
      );
  
      vsOutput.position = getOutputPosition(transformed);
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.videoTexture.matrix);
  
      return vsOutput;
    }
  `

  const videoFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(videoTexture, defaultSampler, fsInput.uv);
    }
  `

  const videoExternalFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSampleBaseClampToEdge(videoTexture, defaultSampler, fsInput.uv);
    }
  `

  // set our initial parameters (basic uniforms)
  const params = {
    widthSegments: 20,
    uniforms: {
      frames: {
        label: 'Frames',
        struct: {
          elapsed: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
        },
      },
    },
  }

  const externalVideoParams = {
    ...params,
    ...{
      label: 'External video texture plane',
      shaders: {
        vertex: {
          code: videoVs,
          entryPoint: 'main',
        },
        fragment: {
          code: videoExternalFs,
          entryPoint: 'main',
        },
      },
    },
  }

  const externalVideoPlane = new Plane(gpuCurtains, '#external-video-plane', externalVideoParams)

  externalVideoPlane
    .onLoading((texture) => {
      texture.source.play()
    })
    .onRender(() => {
      // update our time uniform value
      externalVideoPlane.uniforms.frames.elapsed.value++
    })

  const videoParams = {
    ...params,
    ...{
      label: 'Video texture plane',
      shaders: {
        vertex: {
          code: videoVs,
          entryPoint: 'main',
        },
        fragment: {
          code: videoFs,
          entryPoint: 'main',
        },
      },
      texturesOptions: {
        useExternalTextures: false, // do not use external textures
      },
    },
  }

  const videoPlane = new Plane(gpuCurtains, '#video-plane', videoParams)

  videoPlane
    .onLoading((texture) => {
      texture.source.play()
    })
    .onRender(() => {
      // update our time uniform value
      videoPlane.uniforms.frames.elapsed.value++
    })
})
