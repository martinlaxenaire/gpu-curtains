// Goal of this test is to help debug any issue due to scroll or resize
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, DOMMesh, Plane, GPUCurtains, MediaTexture, RenderBundle } = await import(/* @vite-ignore */ path)

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

  planesEls.forEach((planeEl, i) => {
    const texture = new MediaTexture(gpuCurtains, {
      label: 'Mesh texture ' + i,
      name: 'meshTexture',
      useTransform: true,
      useExternalTextures: i > 1,
      cache: false,
    })

    if (i === 0) {
      //texture.loadImage(images[i])
      texture.loadImage(
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/refs/heads/main/Models/SheenWoodLeatherSofa/glTF/Frame_BaseColor.webp'
      )
    } else {
      texture.loadVideo(videos[0])

      texture.onSourceLoaded((source) => {
        source.play()

        // setTimeout(() => {
        //   texture.sources[sourceIndex].source.pause()
        // }, 2000)
      })

      // console.log(texture)
    }

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
      textures: [texture],
    })
  })

  // CUBE MAPS
  const cubeMapVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) direction: vec3f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;

     
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.direction = normalize(attributes.position);

      return vsOutput;
    }
  `

  const cubeMapFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) direction: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {    
      return textureSample(cubeMapTexture, defaultSampler, fsInput.direction);
    }
  `

  // create the geometries
  const cubeGeometry = new BoxGeometry()

  // now create the meshes
  const cubeEls = document.querySelectorAll('.cube-map')

  cubeEls.forEach((cubeEl, index) => {
    const texture = new MediaTexture(gpuCurtains, {
      label: 'Cube map texture ' + index,
      name: 'cubeMapTexture',
      viewDimension: 'cube',
      useTransform: false,
      placeholderColor: Math.random() > 0.5 ? [255, 0, 255, 255] : [255, 255, 0, 255],
      //useExternalTextures: false,
      cache: false,
    })

    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024

    const ctx = canvas.getContext('2d')

    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 1024, 1024)

    if (index === 0) {
      texture.loadImages(images)
    } else if (index === 1) {
      texture.loadImages([images[0], images[1], images[2], images[3], images[4]])
      texture.loadCanvas(canvas)
    } else {
      texture.loadVideo(videos[0])
      texture.loadImage(images[0])
      texture.loadImage(images[1])
      texture.loadCanvas(canvas)
      texture.loadImage(images[2])
      texture.loadImage(images[3])

      texture.onSourceLoaded((source) => {
        if (source instanceof HTMLVideoElement) {
          source.play()
        }
      })
    }

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
          code: cubeMapVs,
          entryPoint: 'main',
        },
        fragment: {
          code: cubeMapFs,
          entryPoint: 'main',
        },
      },
      textures: [texture],
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
      const texture = new MediaTexture(gpuCurtains, {
        label: 'Mesh texture ' + i,
        name: 'meshTexture',
        useTransform: true,
      })

      texture.loadImage(images[5])

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
        textures: [texture],
      })
    }, i * 1000)
  })

  const planesBundleEls = document.querySelectorAll('.plane-bundle')

  const renderBundle = new RenderBundle(gpuCurtains, {
    label: 'Media textures render bundle',
    size: planesBundleEls.length,
    useBuffer: true,
  })

  planesBundleEls.forEach((planeEl, i) => {
    const texture = new MediaTexture(gpuCurtains, {
      label: 'Mesh texture ' + i,
      name: 'meshTexture',
      useTransform: true,
      cache: false, // force loading
    })

    texture.loadImage(images[i])

    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Plane bundled ' + i,
      renderBundle,
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
      textures: [texture],
    })
  })

  const lonelyTexture = new MediaTexture(gpuCurtains, {
    label: 'Lonely texture',
    name: 'meshTexture',
    viewDimension: 'cube',
  })
    .onSourceLoaded((source) => console.log('lonely texture loaded this source', source))
    .onAllSourcesLoaded(() => console.log('lonely texture loaded all its sources'))
    .onSourceUploaded((source) => console.log('lonely texture UPLOADED this source', source))
    .onAllSourcesUploaded(() => console.log('lonely texture UPLOADED all its sources'))

  lonelyTexture.loadImages(images)
})
