window.addEventListener('DOMContentLoaded', async () => {
  const buildPlaneHTMLElement = (index) => {
    return `<div class="plane">
          <img
            src="https://source.unsplash.com/featured/720x720/?nature&${index}"
            crossorigin=""
            data-texture-name="planeTexture"
          />
        </div>`
  }

  // how many planes do you want?
  const nbPlanes = 60
  let planesHTMLString = ''

  for (let i = 0; i < nbPlanes; i++) {
    planesHTMLString += buildPlaneHTMLElement(i)
  }

  // append the response
  document.querySelector('#planes').insertAdjacentHTML('beforeend', planesHTMLString)

  const lenis = new Lenis()

  // get our planes elements
  let planeElements = document.querySelectorAll('.plane')

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
    watchScroll: false,
  })

  await gpuCurtains.setRendererContext()

  gpuCurtains
    .onRender(() => {
      lenis.raf(performance.now())
    })
    .onError(() => {
      // display original images
      document.body.classList.add('no-curtains')
    })

  lenis.on('scroll', (scroll) => {
    gpuCurtains.updateScrollValues({ x: 0, y: scroll.scroll })
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

      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
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
      var color: vec4f = textureSample(planeTexture, mipmapNearestSampler, fsInput.uv);

      return color;
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
    DOMFrustumMargins: {
      top: 200,
      right: 0,
      bottom: 200,
      left: 0,
    },
    inputs: {
      uniforms: {
        scroll: {
          label: 'Scroll',
          bindings: {
            strength: {
              type: 'f32',
              value: 0,
            },
          },
        },
      },
    },
    samplers: [
      // Use mipmap nearest filter
      new GPUCurtains.Sampler(gpuCurtains, {
        label: 'Nearest sampler',
        name: 'mipmapNearestSampler',
        mipmapFilter: 'nearest',
      }),
    ],
    texturesOptions: {
      generateMips: true,
    },
  }

  // add our planes and handle them
  planeElements.forEach((planeEl, planeIndex) => {
    params.label = 'Plane' + planeIndex
    const plane = new GPUCurtains.Plane(gpuCurtains, planeEl, params)

    // check if our plane is defined and use it
    plane
      .onLoading((texture) => {
        texture.scale.x = 1.5
        texture.scale.y = 1.5
      })
      .onRender(() => {
        const planeCenter = new GPUCurtains.Vec2(
          plane.boundingRect.left + plane.boundingRect.width * 0.5,
          plane.boundingRect.top + plane.boundingRect.height * 0.5
        )

        const distanceFromCenter = new GPUCurtains.Vec2(
          // -1 when planeCenter.x hits the left of the screen, 1 when planeCenter.x hits the right of the screen
          (2 * (planeCenter.x - gpuCurtains.boundingRect.width * 0.5)) / gpuCurtains.boundingRect.width,
          // -1 when planeCenter.y hits the top of the screen, 1 when planeCenter.y hits the bottom of the screen
          (2 * (planeCenter.y - gpuCurtains.boundingRect.height * 0.5)) / gpuCurtains.boundingRect.height
        )

        const halfScreenEffect = Math.max(0, distanceFromCenter.y)
        const scrollEffect = Math.pow(halfScreenEffect, 2) * Math.sign(distanceFromCenter.x)
        plane.rotation.z = -scrollEffect
        plane.textures[0].rotation.z = scrollEffect

        plane.scale.x = 1 - halfScreenEffect * 0.25
        plane.scale.y = 1 - halfScreenEffect * 0.25

        plane.documentPosition.x = scrollEffect * gpuCurtains.boundingRect.width * 0.25
      })
  })
})