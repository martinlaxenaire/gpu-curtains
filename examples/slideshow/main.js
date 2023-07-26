window.addEventListener('DOMContentLoaded', async () => {
  console.log(window)

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  // get our plane element
  const planeElements = document.getElementsByClassName('multi-textures')

  // here we will handle which texture is visible and the timer to transition between images
  const slideshowState = {
    activeTextureIndex: 0,
    nextTextureIndex: 1, // does not care for now
    maxTextures: planeElements[0].querySelectorAll('img, video').length - 1,

    isChanging: false,
    transitionTimer: 0,
    duration: 1.5, // 1.5s
  }

  const vertexShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(1) uv: vec2f,
        @location(2) activeUv: vec2f,
        @location(3) nextUv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
      
        vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
      
        // used for the transition effect
        vsOutput.uv = attributes.uv;
        vsOutput.activeUv = getUVCover(attributes.uv, activeTextureMatrix);
        vsOutput.nextUv = getUVCover(attributes.uv, nextTextureMatrix);
      
        return vsOutput;
      }
    `

  const fragmentShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(1) uv: vec2f,
        @location(2) activeUv: vec2f,
        @location(3) nextUv: vec2f,
      };
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var activeColor: vec4f = textureSample(activeTexture, activeTextureSampler, fsInput.activeUv);
        var nextColor: vec4f = textureSample(nextTexture, nextTextureSampler, fsInput.nextUv);
        
        // port of https://gl-transitions.com/editor/windowslice
        var progress: f32 = transition.timer / transition.duration;
        
        var pr: f32 = smoothstep(
          -1.0 * transition.smoothness,
          0.0,
          fsInput.uv.x - progress * (1.0 + transition.smoothness)
        );
        
        var s: f32 = step(pr, fract(transition.colsCount * fsInput.uv.x));
      
        return mix(activeColor, nextColor, s);
      }
    `

  // some basic parameters
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
      texture: {
        useExternalTextures: false,
      },
    },
    bindings: [
      {
        name: 'transition', // could be something else, like "frames"...
        label: 'Transition',
        uniforms: {
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
    ],
  }

  const plane = new GPUCurtains.Plane(gpuCurtains, planeElements[0], params)

  // the idea here is to create two additionnal textures
  // the first one will contain our visible image
  // the second one will contain our entering (next) image
  // that way we will deal with only activeTex and nextTex samplers in the fragment shader
  // and we could easily add more images in the slideshow...
  // first we set our very first image as the active texture
  const activeTex = plane.createTexture({
    label: 'Active texture',
    name: 'activeTexture',
    fromTexture: plane.textures[slideshowState.activeTextureIndex],
  })
  // next we set the second image as next texture but this is not mandatory
  // as we will reset the next texture on slide change
  const nextTex = plane.createTexture({
    label: 'Next texture',
    name: 'nextTexture',
    fromTexture: plane.textures[slideshowState.nextTextureIndex],
  })

  plane
    .onLoading((texture) => {
      console.log('texture uploaded!', texture)
    })
    .onReady(() => {
      planeElements[0].addEventListener('click', () => {
        if (!slideshowState.isChanging) {
          slideshowState.isChanging = true

          // check what will be next image
          if (slideshowState.activeTextureIndex < slideshowState.maxTextures) {
            slideshowState.nextTextureIndex = slideshowState.activeTextureIndex + 1
          } else {
            slideshowState.nextTextureIndex = 0
          }

          // apply it to our next texture
          //nextTex.setSource(multiTexturesPlane.images[slideshowState.nextTextureIndex])
          nextTex.copy(plane.textures[slideshowState.nextTextureIndex])

          setTimeout(() => {
            slideshowState.isChanging = false
            slideshowState.activeTextureIndex = slideshowState.nextTextureIndex
            // our next texture becomes our active texture
            //activeTex.setSource(multiTexturesPlane.images[slideshowState.activeTextureIndex])
            activeTex.copy(plane.textures[slideshowState.activeTextureIndex])
            // reset timer
            slideshowState.transitionTimer = 0
          }, slideshowState.duration * 1000 + 100) // add a bit of margin to the timer
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
      plane.uniforms.timer.value = slideshowState.transitionTimer
    })
})
