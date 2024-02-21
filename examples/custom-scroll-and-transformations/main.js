import { GPUCurtains, Plane, Sampler, Vec2 } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  const buildPlaneHTMLElement = (index) => {
    return `<div class="plane">
          <img
            src="https://source.unsplash.com/featured/720x720/?nature&${index}"
            crossorigin=""
            loading="lazy"
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
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
    watchScroll: false, // we're going to do it manually with lenis 'scroll' callback
  })

  gpuCurtains.onError(() => {
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  // should be hooked on a gsap ticker instead
  gpuCurtains.onRender(() => {
    lenis.raf(performance.now())
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

      vsOutput.position = getOutputPosition(attributes.position);
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
    uniforms: {
      scroll: {
        label: 'Scroll',
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

  // add our planes and handle them
  planeElements.forEach((planeEl, planeIndex) => {
    params.label = 'Plane' + planeIndex
    // random placeholder color while textures are loading
    params.texturesOptions.placeholderColor = Math.random() > 0.5 ? [255, 0, 255, 1] : [0, 255, 255, 1]

    const plane = new Plane(gpuCurtains, planeEl, { ...params, renderOrder: -planeIndex })

    // check if our plane is defined and use it
    plane
      .onLoading((texture) => {
        texture.scale.x = 1.5
        texture.scale.y = 1.5
      })
      .onRender(() => {
        const planeCenter = new Vec2(
          plane.boundingRect.left + plane.boundingRect.width * 0.5,
          plane.boundingRect.top + plane.boundingRect.height * 0.5
        )

        const distanceFromCenter = new Vec2(
          // -1 when planeCenter.x hits the left of the screen, 1 when planeCenter.x hits the right of the screen
          (2 * (planeCenter.x - gpuCurtains.boundingRect.width * 0.5)) / gpuCurtains.boundingRect.width,
          // -1 when planeCenter.y hits the top of the screen, 1 when planeCenter.y hits the bottom of the screen
          (2 * (planeCenter.y - gpuCurtains.boundingRect.height * 0.5)) / gpuCurtains.boundingRect.height
        )

        const halfScreenEffect = Math.pow(Math.max(0, distanceFromCenter.y), 2)
        const scrollEffect = halfScreenEffect * Math.sign(distanceFromCenter.x)
        plane.rotation.z = -scrollEffect
        plane.textures[0].rotation.z = scrollEffect

        plane.rotation.y = -scrollEffect * 0.5

        plane.scale.x = 1 + halfScreenEffect * 0.25
        plane.scale.y = 1 + halfScreenEffect * 0.25

        plane.documentPosition.x = scrollEffect * gpuCurtains.boundingRect.width * 0.25
        plane.documentPosition.y = halfScreenEffect * gpuCurtains.boundingRect.height * 0.125
      })
  })
})
