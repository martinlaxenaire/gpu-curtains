window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  const videoVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(1) uv: vec2f,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
  
      var strength: f32 = 0.05;
      var nbWaves: f32 = 3.0;
  
      // map vertices coordinates to the 0->1 range on the X axis
      var normalizeXPos: f32 = (attributes.position.x + 0.5) * 0.5;
  
      // notice how the "uniforms" struct name matches our bindings object name property
      var time: f32 = uniforms.time * 0.0375;
  
      var waveSinusoid: f32 = sin(3.141595 * nbWaves * normalizeXPos - time);
  
      var transformed: vec3f = vec3(
          attributes.position.x,
          attributes.position.y,
          attributes.position.z - waveSinusoid * strength
      );
  
      vsOutput.position = getOutputPosition(camera, matrices, transformed);
      vsOutput.uv = getUVCover(attributes.uv, videoTextureMatrix);
  
      return vsOutput;
    }
  `

  const videoFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(1) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(videoTexture, videoTextureSampler, fsInput.uv);
    }
  `

  const videoExternalFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(1) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSampleBaseClampToEdge(videoTexture, videoTextureSampler, fsInput.uv);
    }
  `

  // set our initial parameters (basic uniforms)
  const params = {
    widthSegments: 20,
    bindings: [
      {
        name: 'uniforms', // could be something else, like "frames"...
        label: 'Uniforms',
        uniforms: {
          time: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
        },
      },
    ],
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

  const externalVideoPlane = new GPUCurtains.Plane(gpuCurtains, '#external-video-plane', externalVideoParams)

  externalVideoPlane
    .onLoading((texture) => console.log('external texture loaded', texture))
    .onReady(() => console.log('external video plane ready'))
    .onRender(() => {
      // update our time uniform value
      externalVideoPlane.uniforms.time.value++
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
        texture: {
          useExternalTextures: false,
        },
      },
    },
  }

  const videoPlane = new GPUCurtains.Plane(gpuCurtains, '#video-plane', videoParams)

  videoPlane
    .onLoading((texture) => console.log('video texture loaded', texture))
    .onReady(() => console.log('video plane ready'))
    .onRender(() => {
      // update our time uniform value
      videoPlane.uniforms.time.value++
    })
})
