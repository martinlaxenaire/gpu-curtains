import { GPUCurtains, Plane } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize event...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    renderPass: {
      sampleCount: 1, // no need for MSAA here!
      useDepth: false,
    },
  })

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  // get our plane element
  const planeElements = document.querySelector('#multi-textures-plane')

  // here we will handle which texture is visible and the timer to transition between images
  const slideshowState = {
    activeTextureIndex: 0,
    nextTextureIndex: 1, // does not care for now
    maxTextures: planeElements.querySelectorAll('img, video').length - 1,

    isChanging: false,
    transitionTimer: 0,
    duration: 1.5, // in seconds
  }

  const vertexShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) activeUv: vec2f,
        @location(2) nextUv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
      
        vsOutput.position = getOutputPosition(attributes.position);
      
        // used for the transition effect
        vsOutput.uv = attributes.uv;
        vsOutput.activeUv = getUVCover(attributes.uv, activeTextureMatrix);
        vsOutput.nextUv = getUVCover(attributes.uv, nextTextureMatrix);
      
        return vsOutput;
      }
    `

  // port of https://gl-transitions.com/editor/windowslice
  const fragmentShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) activeUv: vec2f,
        @location(2) nextUv: vec2f,
      };
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var activeColor: vec4f = textureSample(activeTexture, defaultSampler, fsInput.activeUv);
        var nextColor: vec4f = textureSample(nextTexture, defaultSampler, fsInput.nextUv);
        
        var progress: f32 = transition.timer / transition.duration;
        
        var smoothProgress: f32 = smoothstep(
          -1.0 * transition.smoothness,
          0.0,
          fsInput.uv.x - progress * (1.0 + transition.smoothness)
        );
        
        var effectMix: f32 = step(smoothProgress, fract(transition.colsCount * fsInput.uv.x));
      
        return mix(activeColor, nextColor, effectMix);
      }
    `

  const params = {
    shaders: {
      vertex: {
        code: vertexShader,
        entryPoint: 'main',
      },
      fragment: {
        code: fragmentShader,
        entryPoint: 'main',
      },
    },
    texturesOptions: {
      // do not use external textures for videos
      // so we can copy them as regular textures
      useExternalTextures: false,
    },
    uniforms: {
      transition: {
        label: 'Transition',
        struct: {
          timer: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
          duration: {
            type: 'f32',
            value: slideshowState.duration * 60, // duration * 60fps
          },
          colsCount: {
            type: 'f32',
            value: 15,
          },
          smoothness: {
            type: 'f32',
            value: 0.75,
          },
        },
      },
    },
  }

  document.body.classList.add('is-waiting')

  const plane = new Plane(gpuCurtains, planeElements, params)

  // the idea here is to create two additional textures
  // the first one will contain our visible image
  // the second one will contain our entering (next) image
  // that way we will deal with only activeTexture and nextTexture in the fragment shader
  // and we could easily add more images in the slideshow...

  // first we set our very first image as the active texture
  const activeTex = plane.createDOMTexture({
    label: 'Active texture',
    name: 'activeTexture',
    fromTexture: plane.domTextures[slideshowState.activeTextureIndex],
  })

  // next we set the second image as next texture but this is not mandatory
  // as we will reset the next texture on slide change
  const nextTex = plane.createDOMTexture({
    label: 'Next texture',
    name: 'nextTexture',
    fromTexture: plane.domTextures[slideshowState.nextTextureIndex],
  })

  plane
    .onReady(() => {
      document.body.classList.remove('is-waiting')
      const button = planeElements.querySelector('button')
      button.classList.add('show')

      button.addEventListener('click', () => {
        if (!slideshowState.isChanging) {
          document.body.classList.add('is-waiting')
          slideshowState.isChanging = true

          // check what will be next image
          if (slideshowState.activeTextureIndex < slideshowState.maxTextures) {
            slideshowState.nextTextureIndex = slideshowState.activeTextureIndex + 1
          } else {
            slideshowState.nextTextureIndex = 0
          }

          // apply it to our next texture
          nextTex.copy(plane.domTextures[slideshowState.nextTextureIndex])

          if (nextTex.isVideoSource) {
            nextTex.source.play()
          }

          setTimeout(() => {
            document.body.classList.remove('is-waiting')
            slideshowState.isChanging = false
            slideshowState.activeTextureIndex = slideshowState.nextTextureIndex

            if (activeTex.isVideoSource) {
              activeTex.source.pause()
            }

            // our next texture becomes our active texture
            activeTex.copy(plane.domTextures[slideshowState.activeTextureIndex])

            // reset timer
            slideshowState.transitionTimer = 0
          }, slideshowState.duration * 1000 + 50) // add a bit of margin to the timer
        }
      })
    })
    .onRender(() => {
      // increase or decrease our timer based on the active texture value
      if (slideshowState.isChanging) {
        const fpsDuration = slideshowState.duration * 60 // duration * 60fps

        // use damping to smoothen transition
        slideshowState.transitionTimer += (fpsDuration - slideshowState.transitionTimer) * 0.04

        // force end of animation as damping is slower the closer we get from the end value
        if (slideshowState.transitionTimer >= fpsDuration * 0.99 && slideshowState.transitionTimer !== fpsDuration) {
          slideshowState.transitionTimer = fpsDuration
        }
      }

      // update our transition timer uniform
      plane.uniforms.transition.timer.value = slideshowState.transitionTimer
    })
})
