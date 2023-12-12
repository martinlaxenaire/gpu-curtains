window.addEventListener('DOMContentLoaded', async () => {
  // https://glitch.com/edit/#!/simple-set-demos?path=2-slow-cross-fade%2Fscript.js%3A1%3A0
  onLinkNavigate(async ({ toPath }) => {
    const content = await getPageContent(toPath)

    startViewTransition(() => {
      // This is a pretty heavy-handed way to update page content.
      // In production, you'd likely be modifying DOM elements directly,
      // or using a framework.
      // innerHTML is used here just to keep the DOM update super simple.
      document.body.innerHTML = content
    })
  })

  // const links = document.querySelectorAll('#navigation a')
  // links.forEach((link) => {
  //   link.addEventListener('click', async () => {
  //     const toPath = link.getAttribute('href')
  //
  //     const content = await getPageContent(toPath)
  //
  //     startViewTransition(() => {
  //       // This is a pretty heavy-handed way to update page content.
  //       // In production, you'd likely be modifying DOM elements directly,
  //       // or using a framework.
  //       // innerHTML is used here just to keep the DOM update super simple.
  //       document.body.innerHTML = content
  //     })
  //   })
  // })

  // A little helper function like this is really handy
  // to handle progressive enhancement.
  const startViewTransition = (callback) => {
    console.log(document.startViewTransition)
    if (!document.startViewTransition) {
      callback()
      return
    }

    document.startViewTransition(callback)
  }

  // curtains
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: '#canvas',
    camera: {
      fov: 35,
    },
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  // usually data come from a CMS but here it's hardcoded for more simplicity
  const images = [
    // beach
    'https://source.unsplash.com/HfIex7qwTlI/1920x1280/',
    'https://source.unsplash.com/n7DY58YFg9E/1920x1280/',
    'https://source.unsplash.com/Rl9l9mL6Pvs/1920x1280/',
    'https://source.unsplash.com/sGRMspZmfPE/1920x1280/',
    // mountain
    'https://source.unsplash.com/ePpaQC2c1xA/1920x1280/',
    'https://source.unsplash.com/cqbLg3lZEpk/1920x1280/',
    'https://source.unsplash.com/Y8lCoTRgHPE/1920x1280/',
    'https://source.unsplash.com/ahYX46whD8s/1920x1280/',
  ]

  const textures = []
  let percentLoaded = 0

  const loaderEl = document.querySelector('#loader')
  loaderEl.innerText = '0%'

  images.forEach((image) => {
    const texture = new GPUCurtains.Texture(gpuCurtains)
    texture.loadImage(image)

    textures.push(texture)

    texture.onSourceLoaded(() => {
      console.log('texture source loaded', texture)

      percentLoaded++

      loaderEl.innerText = Math.round((100 * percentLoaded) / images.length) + '%'

      // we have finished loading our textures
      if (percentLoaded === images.length) {
        document.body.classList.add('images-loaded')
      }
    })
  })

  const planeVs = /* wgsl */ `
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

  const planeFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSample(planeTexture, planeTextureSampler, fsInput.uv);
    }
  `

  const assignTexture = (plane) => {
    // set the right texture
    const planeImage = plane.domElement.element.querySelector('img')
    const planeTexture = textures.find((element) => element.source && element.source.src === planeImage.src)

    // we got a texture that matches the plane img element, add it
    if (planeTexture) {
      // exactly the same as planeTexture.addParent(plane)
      plane.addTexture(planeTexture)
    }
  }

  const planes = []

  const addPlanes = () => {
    const planeEls = document.querySelectorAll('.plane')

    planeEls.forEach((planeEl, index) => {
      const plane = new GPUCurtains.Plane(gpuCurtains, planeEl, {
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

      // if the textures are already created, proceed
      if (textures.length === images.length) {
        assignTexture(plane)
      } else {
        // it's also possible that the planes were created before the textures sources were loaded
        // so we'll use our nextRender method with its keep parameter to true to act as a setInterval
        // once our textures are ready, cancel the nextRender call by setting the keep flag to false
        // const waitForTexture = curtains.nextRender(() => {
        //   if(textures.length === images.length) {
        //     // textures are ready, stop executing the callback
        //     waitForTexture.keep = false;
        //
        //     // assign the texture
        //     assignTexture(plane);
        //   }
        // }, true);
        const interval = setInterval(() => {
          if (textures.length === images.length) {
            // textures are ready, stop executing the callback
            clearInterval(interval)

            // assign the texture
            assignTexture(plane)
          }
        }, 20)
      }

      plane.onRender(() => {})

      planes.push(plane)
    })
  }

  addPlanes()

  console.log(textures, planes)
})
