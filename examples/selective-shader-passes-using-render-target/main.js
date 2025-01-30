import { GPUCurtains, Plane, RenderTarget, Sampler, ShaderPass } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  let scrollEffect = 0

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    renderPass: {
      //sampleCount: 1,
    },
  })

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  gpuCurtains
    .onBeforeRender(() => {
      // update our scroll effect
      // increase/decrease the effect
      scrollEffect = lerp(scrollEffect, 0, 0.075)
    })
    .onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = gpuCurtains.scrollDelta

      // invert value for the effect
      delta.y = -delta.y

      // clamp values
      delta.y = Math.min(100, Math.max(-100, delta.y))

      if (Math.abs(delta.y) > Math.abs(scrollEffect)) {
        scrollEffect = lerp(scrollEffect, delta.y, 0.5)
      }
    })

  // We don't want to see our pass texture top/bottom edges
  // so we're going to use a custom sampler with mirror repeat
  const mirrorSampler = new Sampler(gpuCurtains, {
    label: 'Mirror sampler',
    name: 'mirrorSampler',
    addressModeU: 'mirror-repeat',
    addressModeV: 'mirror-repeat',
  })

  const planeVs = /* wgsl */ `
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

  const planeFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(planeTexture, defaultSampler, fsInput.uv);
    }
  `

  // first we're going to render large planes into a grayscale pass
  const grayscaleTarget = new RenderTarget(gpuCurtains, {
    label: 'Large planes distortion render target',
    //sampleCount: 1,
  })

  const largePlaneEls = document.querySelectorAll('.large-plane')
  largePlaneEls.forEach((largePlaneEl, index) => {
    const largePlane = new Plane(gpuCurtains, largePlaneEl, {
      label: `Large plane ${index}`,
      //outputTarget: grayscaleTarget, // we could do that directly
      shaders: {
        vertex: {
          code: planeVs,
        },
        fragment: {
          code: planeFs,
        },
      },
    })

    largePlane.setOutputTarget(grayscaleTarget)
  })

  const grayscaleFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, mirrorSampler, fsInput.uv);
      var grayscale: vec3f = vec3(color.r * 0.3 + color.g * 0.59 + color.b * 0.11);
      var grayscaleColor: vec4f = vec4(grayscale, color.a);
    
      return mix(color, grayscaleColor, min(1.0, abs(scrollEffect.strength / 15.0)));
    }
  `

  const grayscalePass = new ShaderPass(gpuCurtains, {
    label: 'Large plane shader pass',
    //inputTarget: grayscaleTarget, // we could do that directly
    //renderOrder: 1, // uncomment to draw large planes above small planes
    shaders: {
      fragment: {
        code: grayscaleFs,
        entryPoint: 'main',
      },
    },
    uniforms: {
      scrollEffect: {
        label: 'ScrollEffect',
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },

    samplers: [mirrorSampler],
  })

  grayscalePass.setInputTarget(grayscaleTarget)

  grayscalePass.onRender(() => {
    // update the uniform
    grayscalePass.uniforms.scrollEffect.strength.value = scrollEffect
  })

  // now render the small planes into a RGB shift pass
  const rgbShiftTarget = new RenderTarget(gpuCurtains, {
    label: 'Small planes RGB render target',
    //sampleCount: 1,
  })

  const smallPlaneEls = document.querySelectorAll('.small-plane')
  smallPlaneEls.forEach((smallPlaneEl, index) => {
    const smallPlane = new Plane(gpuCurtains, smallPlaneEl, {
      label: `Small plane ${index}`,
      outputTarget: rgbShiftTarget,
      shaders: {
        vertex: {
          code: planeVs,
          entryPoint: 'main',
        },
        fragment: {
          code: planeFs,
          entryPoint: 'main',
        },
      },
    })
  })

  const rgbShiftFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var uv: vec2f = fsInput.uv;
    
      var red: vec4f = textureSample(renderTexture, mirrorSampler, vec2(uv.x, uv.y - scrollEffect.strength / 500.0));
      var green: vec4f = textureSample(renderTexture, mirrorSampler, vec2(uv.x, uv.y - scrollEffect.strength / 1000.0));
      var blue: vec4f = textureSample(renderTexture, mirrorSampler, vec2(uv.x, uv.y - scrollEffect.strength / 1500.0));
    
      var color = vec4(red.r, green.g, blue.b, min(1.0, red.a + blue.a + green.a));
      return color;
    }
  `

  const rgbShiftPass = new ShaderPass(gpuCurtains, {
    label: 'Small plane shader pass',
    inputTarget: rgbShiftTarget,
    shaders: {
      fragment: {
        code: rgbShiftFs,
        entryPoint: 'main',
      },
    },
    uniforms: {
      scrollEffect: {
        label: 'ScrollEffect',
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
    samplers: [mirrorSampler],
  })

  rgbShiftPass.onRender(() => {
    // update the uniform
    rgbShiftPass.uniforms.scrollEffect.strength.value = scrollEffect
  })

  // add a final pass that distort the whole scene on scroll
  const finalShaderPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var uv: vec2f = fsInput.uv;
      
      // uv = uv * 2 - 1;
      // uv = uv * (1 - abs(scrollEffect.strength) / 200.0);
      // uv = uv * 0.5 + 0.5;
      
      var horizontalStretch: f32 = 0.0;
      var scrollDeformation: f32 = scrollEffect.strength / 5.0;
      var effectStrength: f32 = 2.5;

      // branching on an uniform is ok
      if(scrollDeformation >= 0.0) {
        uv.y = uv.y * (1.0 + -scrollDeformation * 0.00625 * effectStrength);
        horizontalStretch = sin(uv.y);
      }
      else if(scrollDeformation < 0.0) {
        uv.y = uv.y + (uv.y - 1.0) * scrollDeformation * 0.00625 * effectStrength;
        horizontalStretch = sin(-1.0 * (1.0 - uv.y));
      }

      uv.x = uv.x * 2.0 - 1.0;
      uv.x = uv.x * (1.0 + scrollDeformation * 0.0035 * horizontalStretch * effectStrength);
      uv.x = (uv.x + 1.0) * 0.5;

      var color: vec4f = textureSample(renderTexture, defaultSampler, uv);      

      return color;
    }
  `

  const finalShaderPass = new ShaderPass(gpuCurtains, {
    label: 'Final shader pass',
    shaders: {
      fragment: {
        code: finalShaderPassFs,
        entryPoint: 'main',
      },
    },
    uniforms: {
      scrollEffect: {
        label: 'ScrollEffect',
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  finalShaderPass.onRender(() => {
    finalShaderPass.uniforms.scrollEffect.strength.value = scrollEffect
  })
})
