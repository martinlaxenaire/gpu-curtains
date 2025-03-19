// Goal of this test is to help debug any issue due to scroll or resize
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { Plane, GPUCurtains, DOMTexture } = await import(/* @vite-ignore */ path)

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
      
      return vsOutput;
    }
  `

  const meshExternalVideoFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return textureSampleBaseClampToEdge(meshTexture, defaultSampler, fsInput.uv);
    }
  `

  const videos = [
    'https://cdn.coverr.co/videos/coverr-premium-woman-traces-on-sand/720p.mp4',
    'https://cdn.coverr.co/videos/coverr-premium-surfer-gets-into-waves/720p.mp4',
    'https://cdn.coverr.co/videos/coverr-raglan-beach-in-new-zealand-958/1080p.mp4',
    'https://cdn.coverr.co/videos/coverr-serene-beach-escape/720p.mp4',
    'https://cdn.coverr.co/videos/coverr-man-gazes-at-hollywood-hills/720p.mp4',
    'https://cdn.coverr.co/videos/coverr-surfer-films-a-video/720p.mp4',
    'https://cdn.coverr.co/videos/coverr-temp-ntwvgen-3-alpha-3828681274-a-young-woman-with-v-mp4-4631/720p.mp4',
    'https://cdn.coverr.co/videos/coverr-premium-surfers-prepare-for-adventure/720p.mp4',
    'https://static.vecteezy.com/system/resources/previews/054/892/911/mp4/loop-colorful-loght-in-motion-video.mp4',
  ]

  const planesEls = document.querySelectorAll('.plane')

  const autoplay = true

  planesEls.forEach((planeEl, i) => {
    const domTexture = new DOMTexture(gpuCurtains, {
      label: 'External video texture ' + i,
      name: 'meshTexture',
      useExternalTextures: true,
    })

    const plane = new Plane(gpuCurtains, planeEl, {
      label: 'Plane ' + i,
      shaders: {
        vertex: {
          code: meshVs,
          entryPoint: 'main',
        },
        fragment: {
          code: meshExternalVideoFs,
          entryPoint: 'main',
        },
      },
      domTextures: [domTexture],
    })

    if (autoplay) {
      domTexture.onAllSourcesUploaded(() => {
        if (domTexture.isVideoSource(domTexture.source)) {
          domTexture.source.play()

          setTimeout(() => {
            domTexture.source.pause()

            setTimeout(() => {
              domTexture.source.play()
            }, 1000)
          }, 1000)
        }
      })
    }

    domTexture.loadVideo(videos[i])

    console.log(plane)
  })
})
