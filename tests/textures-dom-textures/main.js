// Goal of this test is to help debug any issue due to scroll or resize
import { Plane } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, DOMMesh, Plane, GPUCurtains, DOMTexture } = await import(/* @vite-ignore */ path)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    camera: {
      fov: 35,
    },
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  const meshVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.meshTexture.matrix);
      vsOutput.normal = attributes.normal;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // debug normals
      // return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
      return textureSample(meshTexture, defaultSampler, fsInput.uv);
    }
  `

  const meshExternalVideoFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // debug normals
      // return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
      return textureSampleBaseClampToEdge(meshTexture, defaultSampler, fsInput.uv);
    }
  `

  const images = [
    'https://picsum.photos/1024/1024?random=1',
    'https://picsum.photos/1024/1024?random=2',
    'https://picsum.photos/1024/1024?random=3',
    'https://picsum.photos/1024/1024?random=4',
    'https://picsum.photos/1024/1024?random=5',
    'https://picsum.photos/1024/1024?random=6',
  ]

  //const videos = ['https://cdn.coverr.co/videos/coverr-raglan-beach-in-new-zealand-958/1080p.mp4']
  const videos = [
    'https://static.vecteezy.com/system/resources/previews/054/892/911/mp4/loop-colorful-loght-in-motion-video.mp4',
  ]

  const planesEls = document.querySelectorAll('.plane')

  const autoplay = true

  planesEls.forEach((planeEl, i) => {
    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Plane ' + i,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: i > 1 ? meshExternalVideoFs : meshFs,
          //code: meshFs,
          entryPoint: 'main',
        },
      },
      texturesOptions: {
        useExternalTextures: i > 1,
        cache: false,
      },
    })

    if (autoplay) {
      plane.onLoading((texture) => {
        if(texture.isVideoSource(texture.source)) {
          texture.source.play()
        }
      })
    }

    console.log(plane)
  })

  // setup canvas from DOM
  const cubeCanvas = document.querySelector('#cube-canvas')
  const cubeCtx = cubeCanvas.getContext('2d')
  cubeCtx.fillStyle = 'green'
  cubeCtx.fillRect(0, 0, 300, 150)

  // create the geometries
  const cubeGeometry = new BoxGeometry()

  // now create the meshes
  const cubeEls = document.querySelectorAll('.cube-map')

  cubeEls.forEach((cubeEl, index) => {
    // texture.onAllSourcesLoaded(() => {
    //   console.log('all sources loaded!', texture.options.label)
    // })

    // if (index === 0) {
    //   console.log(texture)
    // }

    const cubeMesh = new DOMMesh(gpuCurtains, cubeEl, {
      label: 'Cube ' + index,
      geometry: cubeGeometry,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshFs,
          entryPoint: 'main',
        },
      },
      texturesOptions: {
        useExternalTextures: false,
      },
    })

    const updateCubeScaleAndPosition = () => {
      // adjust our cube depth scale ratio based on its height (Y axis)
      cubeMesh.DOMObjectDepthScaleRatio = cubeMesh.worldScale.y / cubeMesh.size.scaledWorld.size.z

      // move our cube along the Z axis so the front face lies at (0, 0, 0) instead of the cube's center
      cubeMesh.position.z = -1 * cubeMesh.worldScale.z
    }

    cubeMesh
      .onBeforeRender(() => {
        cubeMesh.rotation.x += 0.01
        cubeMesh.rotation.y += 0.015
      })
      .onAfterResize(() => {
        updateCubeScaleAndPosition()
      })

    // do it right away
    updateCubeScaleAndPosition()
  })

  const planesCachedEls = document.querySelectorAll('.plane-cached')

  planesCachedEls.forEach((planeEl, i) => {
    setTimeout(() => {
      const plane = new Plane(gpuCurtains, planeEl, {
        label: 'Plane cached ' + i,
        shaders: {
          vertex: {
            code: meshVs,
            entryPoint: 'main',
          },
          fragment: {
            code: meshFs,
            entryPoint: 'main',
          },
        },
        texturesOptions: {
          cache: true,
        },
      })
    }, i * 1000)
  })

  const planesTransformedEls = document.querySelectorAll('.plane-transform')

  const domTexture = new DOMTexture(gpuCurtains, {
    label: 'Mesh texture',
    name: 'meshTexture',
  })

  domTexture.loadImage(images[0])

  planesTransformedEls.forEach((planeEl, i) => {
    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Plane transformed ' + i,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshFs,
          entryPoint: 'main',
        },
      },
      domTextures: [domTexture],
    })

    plane.onBeforeRender(() => {
      plane.rotation.z += 0.005
      if (i === 0) {
        domTexture.rotation -= 0.005
      }
    })

    console.log(plane)
  })

  // SLIDES
  // get our plane element
  const slideshow = document.querySelector('#slideshow')

  // here we will handle which texture is visible and the timer to transition between images
  const slideshowState = {
    activeTextureIndex: 0,
    nextTextureIndex: 1, // does not care for now
    maxTextures: slideshow.querySelectorAll('img, video').length - 1,

    isChanging: false,
    transitionTimer: 0,
    duration: 0.5, // in seconds
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
        vsOutput.activeUv = getUVCover(attributes.uv, texturesMatrices.activeTexture.matrix);
        vsOutput.nextUv = getUVCover(attributes.uv, texturesMatrices.nextTexture.matrix);
      
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
    label: 'Slideshow',
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

  slideshow.classList.add('is-waiting')

  const plane = new Plane(gpuCurtains, slideshow, params)

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
      slideshow.classList.remove('is-waiting')

      slideshow.addEventListener('click', () => {
        if (!slideshowState.isChanging) {
          slideshow.classList.add('is-waiting')
          slideshowState.isChanging = true

          // check what will be next image
          if (slideshowState.activeTextureIndex < slideshowState.maxTextures) {
            slideshowState.nextTextureIndex = slideshowState.activeTextureIndex + 1
          } else {
            slideshowState.nextTextureIndex = 0
          }

          // apply it to our next texture
          nextTex.copy(plane.domTextures[slideshowState.nextTextureIndex])

          if (nextTex.isVideoSource(nextTex.source)) {
            nextTex.source.play()
          }

          setTimeout(() => {
            slideshow.classList.remove('is-waiting')
            slideshowState.isChanging = false
            slideshowState.activeTextureIndex = slideshowState.nextTextureIndex

            if (activeTex.isVideoSource(activeTex.source)) {
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
