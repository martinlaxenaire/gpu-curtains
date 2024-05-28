import { getPageContent, onLinkNavigate } from './view-transitions-api-utils.js'
import { GPUCurtains, Plane, DOMTexture } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  const transitionDuration = 0.5 // in seconds
  document.documentElement.style.setProperty('--transition-duration', `${transitionDuration}s`)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  // usually data come from a CMS but here it's hardcoded for more simplicity
  const images = [
    // beach
    'https://picsum.photos/id/179/1920/1080',
    'https://picsum.photos/id/199/1920/1080',
    'https://picsum.photos/id/218/1920/1080',
    'https://picsum.photos/id/374/1920/1080',
    // mountain
    'https://picsum.photos/id/29/1920/1080',
    'https://picsum.photos/id/177/1920/1080',
    'https://picsum.photos/id/231/1920/1080',
    'https://picsum.photos/id/235/1920/1080',
  ]

  const textures = []
  let percentLoaded = 0

  const loaderEl = document.querySelector('#loader')
  loaderEl.innerText = '0%'

  await Promise.all(
    images.map(async (image) => {
      const texture = new DOMTexture(gpuCurtains, {
        name: 'planeTexture',
      })

      texture.onSourceLoaded(() => {
        percentLoaded++

        loaderEl.innerText = Math.round((100 * percentLoaded) / images.length) + '%'

        // we have finished loading our textures
        if (percentLoaded === images.length) {
          document.body.classList.add('images-loaded')
        }
      })

      await texture.loadImage(image)

      textures.push(texture)
    })
  )

  const planeVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
      
      var strength: f32 = 0.3;
      var nbWaves: f32 = 3.0;

      // map vertices coordinates to the 0->1 range on the X axis
      var normalizeXPos: f32 = (attributes.position.x + 0.5) * 0.5;

      // notice how the "uniforms" struct name matches our bindings object name property
      var time: f32 = frames.elapsed * 0.0375;

      var waveSinusoid: f32 = sin(3.141595 * nbWaves * normalizeXPos - time);

      var transformed: vec3f = vec3(
          attributes.position.x,
          attributes.position.y,
          attributes.position.z - waveSinusoid * strength
      );
  
      vsOutput.position = getOutputPosition(transformed);
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
      var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);
      color.a *= global.opacity;
      return color;
    }
  `

  let planes = []

  const addPlanes = () => {
    const planeEls = document.querySelectorAll('.plane')

    planeEls.forEach((planeEl, index) => {
      const plane = new Plane(gpuCurtains, planeEl, {
        widthSegments: 20,
        autoloadSources: false,
        label: `Plane ${index}`,
        shaders: {
          vertex: {
            code: planeVs,
          },
          fragment: {
            code: planeFs,
          },
        },
        uniforms: {
          frames: {
            struct: {
              elapsed: {
                type: 'f32',
                value: 0,
              },
            },
          },
          global: {
            struct: {
              opacity: {
                type: 'f32',
                value: 0,
              },
            },
          },
        },
        domTextures: (() => {
          // set the right texture
          const planeImage = planeEl.querySelector('img')
          const planeTexture = textures.find((texture) => texture.options && texture.options.source === planeImage.src)

          // we got a texture that matches the plane img element, add it
          if (planeTexture) {
            return [planeTexture]
          } else {
            const texture = new DOMTexture(gpuCurtains, {
              name: 'planeTexture',
            })

            texture.loadImage(planeImage)

            return [texture]
          }
        })(),
      })

      plane.onRender(() => plane.uniforms.frames.elapsed.value++)

      gsap.to(plane.uniforms.global.opacity, {
        value: 1,
        duration: transitionDuration,
      })

      planes.push(plane)
    })
  }

  const removePlanes = () => {
    planes.forEach((plane) => plane.remove())
    planes = []
  }

  addPlanes()

  // navigation
  // https://glitch.com/edit/#!/simple-set-demos?path=2-slow-cross-fade%2Fscript.js%3A1%3A0
  onLinkNavigate(async ({ toPath }) => {
    // first remove planes
    removePlanes()

    const content = await getPageContent(toPath)

    startViewTransition(() => {
      // Convert the HTML string into a document object
      const parser = new DOMParser()
      const newDocument = parser.parseFromString(content, 'text/html')
      const currentPage = document.querySelector('#page')
      const newPage = newDocument.querySelector('#page')

      currentPage.replaceWith(newPage)

      addPlanes()
    })
  })

  // A little helper function like this is really handy
  // to handle progressive enhancement.
  const startViewTransition = (callback) => {
    if (!document.startViewTransition) {
      callback()
      return
    }

    document.startViewTransition(callback)
  }
})
