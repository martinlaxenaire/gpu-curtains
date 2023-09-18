window.addEventListener('DOMContentLoaded', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  let scrollEffect = 0

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  gpuCurtains
    .onRender(() => {
      // update our scroll effect
      // increase/decrease the effect
      scrollEffect = lerp(scrollEffect, 0, 0.075)
    })
    .onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = gpuCurtains.getScrollDeltas()

      // invert value for the effect
      delta.y = -delta.y

      // clamp values
      delta.y = Math.min(100, Math.max(-100, delta.y))

      if (Math.abs(delta.y) > Math.abs(scrollEffect)) {
        scrollEffect = lerp(scrollEffect, delta.y, 0.5)
      }
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
  
      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
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
      return textureSample(planeTexture, planeTextureSampler, fsInput.uv);
    }
  `

  // first we're going to render large planes into a grayscale pass
  const grayscaleTarget = new GPUCurtains.RenderTarget(gpuCurtains, { label: 'Large planes distortion render target' })

  const largePlaneEls = document.querySelectorAll('.large-plane')
  largePlaneEls.forEach((largePlaneEl, index) => {
    const largePlane = new GPUCurtains.Plane(gpuCurtains, largePlaneEl, {
      label: `Large plane ${index}`,
      //renderTarget: grayscaleTarget, // we could do that directly
      shaders: {
        vertex: {
          code: planeVs,
        },
        fragment: {
          code: planeFs,
        },
      },
    })

    largePlane.setRenderTarget(grayscaleTarget)
  })

  const grayscaleFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, renderTextureSampler, fsInput.uv);
      var grayscale: vec3f = vec3(color.r * 0.3 + color.g * 0.59 + color.b * 0.11);
      var grayscaleColor: vec4f = vec4(grayscale, color.a);
    
      return mix(color, grayscaleColor, min(1.0, abs(scrollEffect.strength / 15.0)));
    }
  `

  const grayscalePass = new GPUCurtains.ShaderPass(gpuCurtains, {
    label: 'Large plane shader pass',
    //renderTarget: grayscaleTarget, // we could do that directly
    shaders: {
      fragment: {
        code: grayscaleFs,
        entryPoint: 'main',
      },
    },
    bindings: [
      {
        name: 'scrollEffect',
        label: 'ScrollEffect',
        uniforms: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    ],
  })

  grayscalePass.setRenderTarget(grayscaleTarget)

  grayscalePass.onRender(() => {
    // update the uniform
    grayscalePass.uniforms.strength.value = scrollEffect
  })

  // setTimeout(() => {
  //   grayscaleTarget.remove()
  //   console.log(gpuCurtains.renderer.scene)
  // }, 5000)

  // now render the small planes into a RGB shift pass
  const rgbShiftTarget = new GPUCurtains.RenderTarget(gpuCurtains, {
    label: 'Small planes RGB render target',
  })

  const smallPlaneEls = document.querySelectorAll('.small-plane')
  smallPlaneEls.forEach((smallPlaneEl, index) => {
    const smallPlane = new GPUCurtains.Plane(gpuCurtains, smallPlaneEl, {
      label: `Small plane ${index}`,
      renderTarget: rgbShiftTarget,
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
    
      var red: vec4f = textureSample(renderTexture, renderTextureSampler, vec2(uv.x, uv.y - scrollEffect.strength / 500.0));
      var green: vec4f = textureSample(renderTexture, renderTextureSampler, vec2(uv.x, uv.y - scrollEffect.strength / 1000.0));
      var blue: vec4f = textureSample(renderTexture, renderTextureSampler, vec2(uv.x, uv.y - scrollEffect.strength / 1500.0));
    
      var color = vec4(red.r, green.g, blue.b, min(1.0, red.a + blue.a + green.a));
      return color;
    }
  `

  const rgbShiftPass = new GPUCurtains.ShaderPass(gpuCurtains, {
    label: 'Small plane shader pass',
    renderTarget: rgbShiftTarget,
    shaders: {
      fragment: {
        code: rgbShiftFs,
        entryPoint: 'main',
      },
    },
    bindings: [
      {
        name: 'scrollEffect',
        label: 'ScrollEffect',
        uniforms: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    ],
  })

  rgbShiftPass.onRender(() => {
    // update the uniform
    rgbShiftPass.uniforms.strength.value = scrollEffect
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

      var color: vec4f = textureSample(renderTexture, renderTextureSampler, uv);      

      return color;
    }
  `

  const finalShaderPass = new GPUCurtains.ShaderPass(gpuCurtains, {
    label: 'Final shader pass',
    shaders: {
      fragment: {
        code: finalShaderPassFs,
        entryPoint: 'main',
      },
    },
    bindings: [
      {
        name: 'scrollEffect',
        label: 'ScrollEffect',
        uniforms: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    ],
  })

  finalShaderPass.onRender(() => {
    finalShaderPass.uniforms.strength.value = scrollEffect
  })

  // const largePlaneDebugTexture = finalShaderPass.createRenderTexture({
  //   label: 'Large plane debug render texture',
  //   name: 'largePlaneDebugTexture',
  //   fromTexture: grayscalePass.renderTarget.renderTexture,
  // })
  //
  // const smallPlaneDebugTexture = finalShaderPass.createRenderTexture({
  //   label: 'Small plane debug render texture',
  //   name: 'smallPlaneDebugTexture',
  //   fromTexture: rgbShiftPass.renderTarget.renderTexture,
  // })

  console.log(gpuCurtains.renderer.scene)
})
