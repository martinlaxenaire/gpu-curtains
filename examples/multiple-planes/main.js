window.addEventListener('DOMContentLoaded', async () => {
  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  // we will keep track of all our planes in an array
  const planes = []
  let planesDeformations = 0

  // get our planes elements
  let planeElements = document.querySelectorAll('.plane')

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
    onError: () => {
      document.body.classList.add('no-curtains')
    },
  })

  await gpuCurtains.setRendererContext()

  gpuCurtains
    .onRender(() => {
      // update our planes deformation
      // increase/decrease the effect
      planesDeformations = lerp(planesDeformations, 0, 0.075)
    })
    .onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = gpuCurtains.getScrollDeltas()

      // invert value for the effect
      delta.y = -delta.y

      // threshold
      if (delta.y > 60) {
        delta.y = 60
      } else if (delta.y < -60) {
        delta.y = -60
      }

      if (Math.abs(delta.y) > Math.abs(planesDeformations)) {
        planesDeformations = lerp(planesDeformations, delta.y, 0.5)
      }
    })

  const vertexShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(1) uv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
      
        var transformed: vec3f = attributes.position;
        var planeDeformation: f32 = sin((attributes.position.x * 0.5 + 0.5) * 3.141592) * sin(deformation.strength / 90.0);
        transformed.y += planeDeformation;
        
        vsOutput.position = getOutputPosition(camera, matrices, transformed);
        vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);
      
        return vsOutput;
      }
    `

  const fragmentShader = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(1) uv: vec2f,
      };
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {      
        return textureSample(planeTexture, planeTextureSampler, fsInput.uv);
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
    bindings: [
      {
        name: 'deformation', // could be something else, like "frames"...
        label: 'Deformation',
        uniforms: {
          strength: {
            type: 'f32', // this means our uniform is a float
            value: 0,
          },
        },
      },
    ],
    texturesOptions: {
      texture: {
        generateMips: true,
      },
      sampler: {
        mipmapFilter: 'nearest',
      },
    },
  }

  const handlePlane = (plane, planeIndex) => {
    // check if our plane is defined and use it
    plane
      .onReady(() => {
        // once everything is ready, display everything
        if (planeIndex === planes.length - 1) {
          document.body.classList.add('planes-loaded')
        }
      })
      .onRender(() => {
        // update the uniform
        plane.uniforms.strength.value = planesDeformations
      })
  }

  // add our planes and handle them
  planeElements.forEach((planeEl, planeIndex) => {
    const plane = new GPUCurtains.Plane(gpuCurtains, planeEl, params)
    planes.push(plane)

    handlePlane(plane, planeIndex)
  })

  // now handle additional planes
  const planeContainer = document.querySelector('#planes')

  const mutationObserver = new MutationObserver(() => {
    // reselect our plane elements
    planeElements = document.querySelectorAll('.plane')

    for (let i = planes.length; i < planeElements.length; i++) {
      const plane = new GPUCurtains.Plane(gpuCurtains, planeElements[i], params)
      planes.push(plane)

      handlePlane(plane, i)

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
      <div class="plane-wrapper"><span class="plane-title">Title ${
        index + 1
      }</span><div class="plane-inner"><div class="landscape-wrapper"><div class="landscape-inner"><div class="plane"><img src="https://source.unsplash.com/featured/1920x1280/?nature&${index}" crossorigin="" data-texture-name="planeTexture" /></div></div></div></div></div>
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
