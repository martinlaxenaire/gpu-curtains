window.addEventListener('DOMContentLoaded', async () => {
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
    maxTextures: planeElements[0].querySelectorAll('img').length - 1,

    isChanging: false,
    transitionTimer: 0,
  }

  const vertexShader = `
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(1) activeUv: vec2f,
            @location(2) nextUv: vec2f,
          };

          @vertex fn main(
            attributes: Attributes,
          ) -> VSOutput {
            var vsOutput: VSOutput;

            vsOutput.position = getOutputPosition(camera, matrices, attributes.position);

            vsOutput.activeUv = getScaledUV(attributes.uv, activeTextureMatrix);
            vsOutput.nextUv = getScaledUV(attributes.uv, nextTextureMatrix);

            return vsOutput;
          }
    `

  const fragmentShader = `
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(1) activeUv: vec2f,
            @location(2) nextUv: vec2f,
          };

          @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
            var activeColor: vec4f = textureSample(activeTexture, activeTextureSampler, fsInput.activeUv);
            var nextColor: vec4f = textureSample(nextTexture, nextTextureSampler, fsInput.nextUv);

            return mix(activeColor, nextColor, 1.0 - ((cos(transition.timer / (90.0 / 3.141592)) + 1.0) / 2.0));
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
    bindings: [
      {
        name: 'transition', // could be something else, like "frames"...
        label: 'Transition',
        uniforms: {
          timer: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
        },
      },
    ],
    onReady: () => {
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
          nextTex.copy(multiTexturesPlane.textures[slideshowState.nextTextureIndex])

          setTimeout(() => {
            slideshowState.isChanging = false
            slideshowState.activeTextureIndex = slideshowState.nextTextureIndex
            // our next texture becomes our active texture
            //activeTex.setSource(multiTexturesPlane.images[slideshowState.activeTextureIndex])
            activeTex.copy(multiTexturesPlane.textures[slideshowState.activeTextureIndex])
            // reset timer
            slideshowState.transitionTimer = 0
          }, 1700) // add a bit of margin to the timer
        }
      })
    },
    onRender: () => {
      // increase or decrease our timer based on the active texture value
      if (slideshowState.isChanging) {
        // use damping to smoothen transition
        slideshowState.transitionTimer += (90 - slideshowState.transitionTimer) * 0.04

        // force end of animation as damping is slower the closer we get from the end value
        if (slideshowState.transitionTimer >= 88.5 && slideshowState.transitionTimer !== 90) {
          slideshowState.transitionTimer = 90
        }
      }

      // update our transition timer uniform
      multiTexturesPlane.uniforms.timer.value = slideshowState.transitionTimer
    },
  }

  const multiTexturesPlane = new GPUCurtains.Plane(gpuCurtains, planeElements[0], params)

  // the idea here is to create two additionnal textures
  // the first one will contain our visible image
  // the second one will contain our entering (next) image
  // that way we will deal with only activeTex and nextTex samplers in the fragment shader
  // and we could easily add more images in the slideshow...
  // first we set our very first image as the active texture
  const activeTex = multiTexturesPlane.createTexture({
    label: 'Active texture',
    name: 'activeTexture',
    fromTexture: multiTexturesPlane.textures[slideshowState.activeTextureIndex],
  })
  // next we set the second image as next texture but this is not mandatory
  // as we will reset the next texture on slide change
  const nextTex = multiTexturesPlane.createTexture({
    label: 'Next texture',
    name: 'nextTexture',
    fromTexture: multiTexturesPlane.textures[slideshowState.nextTextureIndex],
  })

  console.log(multiTexturesPlane)
})
