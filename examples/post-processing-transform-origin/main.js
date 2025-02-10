import { GPUCurtains, Plane, ShaderPass } from '../../dist/esm/index.mjs'

// use 'DOMContentLoaded' so we don't wait for the images to be loaded
window.addEventListener('DOMContentLoaded', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  let rotationEffect = 0
  // used for touch devices
  let touch = {
    y: 0,
    lastY: 0,
  }

  // handle wheel event
  window.addEventListener(
    'wheel',
    (e) => {
      // normalize wheel event
      const delta = window.navigator.userAgent.indexOf('Firefox') !== -1 ? e.deltaY : e.deltaY / 40

      rotationEffect += delta
    },
    {
      passive: true,
    }
  )

  // handle touch
  window.addEventListener(
    'touchstart',
    (e) => {
      // reset our values on touch start
      if (e.targetTouches) {
        touch.y = e.targetTouches[0].clientY
      } else {
        touch.y = e.clientY
      }
      touch.lastY = touch.y
    },
    {
      passive: true,
    }
  )

  window.addEventListener(
    'touchmove',
    (e) => {
      touch.lastY = touch.y

      if (e.targetTouches) {
        touch.y = e.targetTouches[0].clientY
      } else {
        touch.y = e.clientY
      }

      rotationEffect += (touch.lastY - touch.y) / 10
    },
    {
      passive: true,
    }
  )

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onBeforeRender(() => {
    rotationEffect = lerp(rotationEffect, 0, 0.05)
  })

  // add the planes
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
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.planeTexture.matrix);
  
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

  const planeEls = document.querySelectorAll('.plane')

  planeEls.forEach((planeEl, index) => {
    const plane = new Plane(gpuCurtains, planeEl, {
      label: `Plane ${index}`,
      shaders: {
        vertex: {
          code: planeVs,
        },
        fragment: {
          code: planeFs,
        },
      },
    })

    const setPlaneTransformOrigin = (plane) => {
      // has to be set according to its css positions
      // (0, 0) means plane's top left corner
      // (1, 1) means plane's bottom right corner
      // for portrait mode we deliberately set the transform origin outside the viewport to give space to the planes
      plane.transformOrigin.x = gpuCurtains.boundingRect.width >= gpuCurtains.boundingRect.height ? -0.4 : -0.5
      plane.transformOrigin.y = 0.5
    }

    setPlaneTransformOrigin(plane)

    // set initial rotation based on plane index
    plane.rotation.z = (index / planeEls.length) * Math.PI * 2

    plane
      .onBeforeRender(() => {
        // update rotation based on rotation effect
        plane.rotation.z += rotationEffect / 100
      })
      .onAfterResize(() => {
        setPlaneTransformOrigin(plane)
      })
  })

  // post processing
  const rotationFs = `
      struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var uv: vec2f = fsInput.uv;
      
      // calculate an effect that spreads from the left-center point
      var rgbEffect: f32 = rotation.effect * distance(uv, vec2(0.0, 0.5));
    
      var red: vec4f = textureSample(renderTexture, defaultSampler, uv + rgbEffect * 0.005);
      var green: vec4f = textureSample(renderTexture, defaultSampler, uv);
      var blue: vec4f = textureSample(renderTexture, defaultSampler, uv - rgbEffect * 0.005);
    
      // use green channel alpha as this one does not have any displacement
      var color = vec4(red.r, green.g, blue.b, green.a);
      return color;
    }
  `

  const shaderPassParams = {
    shaders: {
      fragment: {
        code: rotationFs,
        entryPoint: 'main',
      },
    },
    uniforms: {
      rotation: {
        struct: {
          effect: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  }

  const shaderPass = new ShaderPass(gpuCurtains, shaderPassParams)

  shaderPass.onRender(() => {
    // update the uniform
    shaderPass.uniforms.rotation.effect.value = rotationEffect
  })
})
