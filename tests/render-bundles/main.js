// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, RenderBundle, Mesh, ShaderPass } = await import(
    /* @vite-ignore */ path
  )

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    // adapterOptions: {
    //   compatibilityMode: true,
    // },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  const meshes = []

  const nbMeshes = 4

  const renderBundle = new RenderBundle(gpuCameraRenderer, {
    label: 'Basic render bundle',
    size: nbMeshes,
    useTransformationBuffer: true,
  })

  for (let i = 0; i < nbMeshes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
      renderBundle,
      //transparent: i % 2 === 1,
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.y += 0.02
    })

    mesh.position.x = i % 2 === 0 ? -2 : 2
    mesh.position.y = i < 2 ? -2 : 2

    meshes.push(mesh)
  }

  const postProShader = /* wgsl */ `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var texture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
        
        let stepValue: f32 = cos(params.frames * 0.025) * 0.5 + 0.5;

        return mix( vec4(texture.rgb, texture.a), vec4(1.0 - texture.rgb, texture.a), step(fsInput.uv.x, stepValue) );
      }
  `

  const postProRenderBundle = new RenderBundle(gpuCameraRenderer, {
    label: 'Post processing render bundle',
    size: 1,
    renderPass: gpuCameraRenderer.postProcessingPass,
  })

  console.log(gpuCameraRenderer)

  const postProPass = new ShaderPass(gpuCameraRenderer, {
    shaders: {
      fragment: {
        code: postProShader,
      },
    },
    renderBundle: postProRenderBundle,
    targets: [
      {
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
          },
        },
      },
    ],
    uniforms: {
      params: {
        struct: {
          frames: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  postProPass.onRender(() => {
    postProPass.uniforms.params.frames.value++
  })

  setTimeout(() => {
    //renderBundle.removeMesh(meshes[1])
    //renderBundle.remove()
    //console.log(gpuCameraRenderer.scene)
    //console.log(gpuCameraRenderer.scene.getObjectRenderPassEntry(meshes[0]))
    //gpuCameraRenderer.destroy()
    //console.log(gpuCameraRenderer)
  }, 2000)

  console.log(renderBundle, meshes, gpuCameraRenderer.scene)

  // lost context

  const loseCtxButton = document.querySelector('#lose-context-button')

  let isContextActive = true

  loseCtxButton.addEventListener('click', () => {
    if (isContextActive) {
      gpuCameraRenderer.device?.destroy()
      loseCtxButton.textContent = 'Restore context'
      console.log('lost', gpuCameraRenderer)
    } else {
      gpuCameraRenderer.deviceManager?.restoreDevice()
      loseCtxButton.textContent = 'Lose context'
      console.log('restored', meshes[0].material, gpuCameraRenderer, renderBundle)
    }

    isContextActive = !isContextActive
  })
})
