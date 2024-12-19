// Basic rotating cube for most simple tests
import { RenderTarget, ShaderPass } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, RenderBundle, Mesh, ShaderPass, Vec2 } = await import(
    /* @vite-ignore */ path
  )

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  gpuCameraRenderer.camera.position.z = 15

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
    useBuffer: true,
    useIndirectDraw: true,
    renderOrder: 1,
    //transparent: true,
  })

  console.log('INDIRECT DRAW RENDER BUNDLE', renderBundle)

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      return vec4(normalize(fsInput.normal) * 0.5 + 0.5, shading.opacity);
    }
  `

  const boxGeometry = new BoxGeometry()

  for (let i = 0; i < nbMeshes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: boxGeometry,
      renderBundle,
      transparent: i > 1,
      shaders: {
        fragment: {
          code: fs,
        },
      },
      uniforms: {
        shading: {
          struct: {
            opacity: {
              type: 'f32',
              value: i > 1 ? 0.5 : 1,
            },
          },
        },
      },
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.y += 0.02
    })

    mesh.position.x = i % 2 === 0 ? -2 : 2
    mesh.position.y = i < 2 ? -2 : 2

    meshes.push(mesh)
  }

  const nbRegularMeshes = 2
  const regularMeshes = []

  for (let i = 0; i < nbRegularMeshes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + (nbMeshes + i),
      geometry: new BoxGeometry(),
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.x += 0.02
    })

    mesh.position.x = i % 2 === 0 ? -6 : 6
    mesh.position.y = -2

    regularMeshes.push(mesh)

    mesh.scale.set(1.25)

    console.log(mesh)
  }

  const postProRenderBundle = new RenderBundle(gpuCameraRenderer, {
    label: 'Post processing render bundle',
  })

  const nbGrayscaleMeshes = 2

  const grayscaleTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Grayscale render target',
  })

  const grayscaleRenderBundle = new RenderBundle(gpuCameraRenderer, {
    label: 'Grayscale render bundle',
    size: nbGrayscaleMeshes,
    useBuffer: true,
    renderPass: grayscaleTarget.renderPass,
  })

  for (let i = 0; i < nbGrayscaleMeshes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + (nbMeshes + nbRegularMeshes + i),
      geometry: new BoxGeometry(),
      outputTarget: grayscaleTarget,
      renderBundle: grayscaleRenderBundle,
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.z += 0.02
    })

    mesh.position.x = i % 2 === 0 ? -6 : 6
    mesh.position.y = 2
  }

  const grayscaleFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      var grayscale: vec3f = vec3(color.r * 0.3 + color.g * 0.59 + color.b * 0.11);
      var grayscaleColor: vec4f = vec4(grayscale, color.a);
    
      return grayscaleColor;
    }
  `

  const grayscalePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Grayscale shader pass',
    inputTarget: grayscaleTarget,
    //renderBundle: postProRenderBundle,
    shaders: {
      fragment: {
        code: grayscaleFs,
        entryPoint: 'main',
      },
    },
  })

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

  console.log(gpuCameraRenderer, postProRenderBundle)

  const postProPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Post processing pass',
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

  console.log(postProPass)

  postProPass.onRender(() => {
    postProPass.uniforms.params.frames.value++
  })

  setTimeout(() => {
    //renderBundle.removeMesh(meshes[1])
    // console.log(renderBundle)
    //meshes[1].remove()

    // meshes.forEach((mesh) => {
    //   //mesh.remove()
    //   renderBundle.removeMesh(mesh)
    // })

    //renderBundle.destroy()
    //renderBundle.empty()

    //console.log(gpuCameraRenderer.scene.getObjectRenderPassEntry(meshes[0]))
    //gpuCameraRenderer.destroy()
    //console.log(gpuCameraRenderer)

    //postProRenderBundle.destroy()
    //postProPass.remove()

    // regularMeshes[0].setRenderBundle(renderBundle)
    // console.log(regularMeshes[0], renderBundle)

    console.log(gpuCameraRenderer.scene)
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
