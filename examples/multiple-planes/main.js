import { GPUCurtains, Plane, Sampler } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  // we will keep track of all our planes in an array
  const planes = []
  let scrollEffect = 0

  // get our planes elements
  let planeElements = document.querySelectorAll('.plane')

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
  }).onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  gpuCurtains
    .onRender(() => {
      // update our planes deformation
      // increase/decrease the effect
      scrollEffect = lerp(scrollEffect, 0, 0.075)
    })
    .onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = gpuCurtains.scrollDelta

      // invert value for the effect
      delta.y = -delta.y

      // threshold
      if (delta.y > 60) {
        delta.y = 60
      } else if (delta.y < -60) {
        delta.y = -60
      }

      if (Math.abs(delta.y) > Math.abs(scrollEffect)) {
        scrollEffect = lerp(scrollEffect, delta.y, 0.5)
      }
    })

  const vertexShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
      
        var transformed: vec3f = attributes.position;
        var planeDeformation: f32 = sin((attributes.position.x * 0.5 + 0.5) * 3.141592) * sin(deformation.strength / 90.0);
        transformed.y += planeDeformation;
        
        vsOutput.position = getOutputPosition(transformed);
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
        return textureSample(planeTexture, mipmapNearestSampler, fsInput.uv);
      }
    `

  // some basic parameters
  const params = {
    widthSegments: 10,
    heightSegments: 10,
    DOMFrustumMargins: {
      top: 100,
      right: 0,
      bottom: 100,
      left: 0,
    },
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
    uniforms: {
      deformation: {
        label: 'Deformation',
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
    samplers: [
      // Use mipmap nearest filter
      new Sampler(gpuCurtains, {
        label: 'Nearest sampler',
        name: 'mipmapNearestSampler',
        mipmapFilter: 'nearest',
      }),
    ],
    texturesOptions: {
      generateMips: true,
    },
  }

  let planesLoaded = 0
  let loadComplete = false

  const updateLoader = () => {
    document.querySelector('#loader').textContent = `${(planesLoaded * 100) / planeElements.length}%`
  }

  updateLoader()

  const handlePlane = (plane) => {
    // check if our plane is defined and use it
    plane
      .onReady(() => {
        if (!loadComplete) {
          planesLoaded++

          updateLoader()

          // once everything is ready, display everything
          if (planesLoaded === planes.length) {
            loadComplete = true
            document.body.classList.add('planes-loaded')
          }
        }
      })
      .onRender(() => {
        // update the uniform
        plane.uniforms.deformation.strength.value = scrollEffect
      })
  }

  // add our planes and handle them
  planeElements.forEach((planeEl, index) => {
    params.label = 'Plane ' + index
    const plane = new Plane(gpuCurtains, planeEl, params)
    planes.push(plane)

    handlePlane(plane)
  })

  // now handle additional planes
  const planeContainer = document.querySelector('#planes')

  const mutationObserver = new MutationObserver(() => {
    // reselect our plane elements
    planeElements = document.querySelectorAll('.plane')

    for (let i = planes.length; i < planeElements.length; i++) {
      params.label = 'Plane ' + i
      const plane = new Plane(gpuCurtains, planeElements[i], params)
      planes.push(plane)

      handlePlane(plane)

      // 30 planes are enough, right ?
      if (planes.length >= 28) {
        document.getElementById('add-more-planes').style.display = 'none'
      }
    }
  })

  mutationObserver.observe(planeContainer, {
    childList: true,
  })

  // this will simulate an ajax lazy load call
  // additionnalPlanes string could be the response of our AJAX call
  document.getElementById('add-more-planes').addEventListener('click', () => {
    const createPlaneEl = (index) => {
      return `
      <div class="plane-wrapper">
        <h2 class="overlay-title plane-title">Title ${index + 1}</h2>
        <div class="plane-inner">
          <div class="plane">
            <img src="https://picsum.photos/1920/1080?random=${
              index + 1
            }" crossorigin="" data-texture-name="planeTexture" />
          </div>
        </div>
      </div>
    `
    }

    let additionnalPlanes = ''
    for (let i = planes.length; i < planes.length + 4; i++) {
      additionnalPlanes += createPlaneEl(i)
    }

    // append the response
    planeContainer.insertAdjacentHTML('beforeend', additionnalPlanes)
  })
})
