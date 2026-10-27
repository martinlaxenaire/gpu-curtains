import { volumetricLightingPass, gaussianBlurPassFs, blendPassFs } from './shaders.js'

// Volumetric lighting test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    AmbientLight,
    DirectionalLight,
    PointLight,
    BoxGeometry,
    LitMesh,
    Mesh,
    ShaderPass,
    SphereGeometry,
    Vec2,
    Vec3,
    Mat4,
    RenderTarget,
    Texture,
    MediaTexture,
  } = await import(/* @vite-ignore */ path)

  const systemSize = 15

  // here is an example of how we can use a simple renderer instead of GPUCurtains
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not related to DOM

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      minFeatureLevel: 'compatibility',
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const renderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      far: systemSize * 10,
    },
  })

  // force storing the main depth texture result
  // as we'll be using it in our volumetric passes
  renderer.renderPass.setDepthStoreOp('store', true)

  // get the camera
  const { camera } = renderer

  // set the camera initial position
  camera.position.z = systemSize * 3

  // orbit controls
  const orbitControls = new OrbitControls({
    camera,
    element: renderer.domElement.element,
  })
  orbitControls.zoomSpeed = 2
  orbitControls.maxZoom = systemSize * 6

  const white = new Vec3(1)
  const black = new Vec3(0)
  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)

  // LIGHTS

  const ambientLight = new AmbientLight(renderer, {
    intensity: 0.3,
  })

  const directionalLights = []

  directionalLights.push(
    new DirectionalLight(renderer, {
      position: new Vec3(200, 50, 100),
      intensity: 1.5,
    })
  )

  directionalLights.push(
    new DirectionalLight(renderer, {
      position: new Vec3(-200, -50, 100),
      intensity: 1.5,
    })
  )

  const pointLight = new PointLight(renderer, {
    intensity: systemSize * 4,
    range: 50 * systemSize,
    color: white,
    shadow: {
      // shadows are needed to compute volumetric lighting
      depthTextureSize: new Vec2(1024),
    },
  })

  // SCENE

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const randomDirection = new Vec3()

  const randomPosition = (position, minLength = 4, maxLength = systemSize * 1.5) => {
    // Random direction using spherical coordinates
    const theta = Math.random() * 2 * Math.PI
    const z = Math.random() * 2 - 1
    const r = Math.sqrt(1 - z * z)

    randomDirection.set(r * Math.cos(theta), r * Math.sin(theta), z)

    // Random length between minLength and maxLength
    const length = minLength + Math.random() * (maxLength - minLength)

    return position.copy(randomDirection.multiplyScalar(length))
  }

  for (let i = 0; i < 100; i++) {
    const randomColorPick = Math.random()
    const mesh = new LitMesh(renderer, {
      label: `Cube ${i}`,
      geometry: cubeGeometry,
      castShadows: true,
      material: {
        color: randomColorPick < 0.2 ? black : randomColorPick > 0.6 ? blue : pink,
        metallic: 0.7,
        roughness: 0.6,
      },
    })

    randomPosition(mesh.position)

    const rotationSpeed = Math.random() * 0.025

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }

  const sphereFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return vec4(params.color, 1.0);
    }
  `

  const sphere = new Mesh(renderer, {
    label: 'Sphere',
    geometry: sphereGeometry,
    shaders: {
      fragment: {
        code: sphereFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          color: {
            type: 'vec3f',
            value: white,
          },
        },
      },
    },
  })

  sphere.scale.set(2)

  // VOLUMETRIC LIGHTING

  const volumetricQuality = 0.5

  const volumetricOutputTarget = new RenderTarget(renderer, {
    label: 'Volumetric output render target',
    useDepth: false,
    sampleCount: 1,
    qualityRatio: volumetricQuality,
  })

  const blurInputTarget = new RenderTarget(renderer, {
    label: 'Blur input target',
    renderTextureName: 'volumetricTargetTexture',
    useDepth: false,
    sampleCount: 1,
  })

  const blurOutputTarget = new RenderTarget(renderer, {
    label: 'Blur output target',
    renderTextureName: 'blurTexture',
    useDepth: false,
    sampleCount: 1,
  })

  const depthTexture = new Texture(renderer, {
    label: 'Scene depth texture',
    name: 'depthTexture',
    type: 'depth',
    fromTexture: renderer.renderPass.depthTexture,
  })

  const blueNoiseTexture = new MediaTexture(renderer, {
    label: 'Blue noise texture',
    name: 'blueNoiseTexture',
    useTransform: false,
  })

  blueNoiseTexture.loadImage('../../website/assets/blue-noise-pattern.webp')

  const volumetricPass = new ShaderPass(renderer, {
    label: 'Volumetric pass',
    outputTarget: volumetricOutputTarget,
    sampleCount: 1,
    depth: false,
    shaders: {
      fragment: {
        code: volumetricLightingPass,
      },
    },
    bindings: [renderer.bindings.pointLights, renderer.bindings.pointShadows],
    textures: [depthTexture, pointLight.shadow.depthTexture, blueNoiseTexture],
    samplers: [pointLight.shadow.depthComparisonSampler],
    uniforms: {
      params: {
        struct: {
          qualityRatio: {
            type: 'f32',
            value: volumetricQuality,
          },
          lightColor: {
            type: 'vec3f',
            value: white,
          },
          density: {
            type: 'f32',
            value: systemSize * 0.5, // in world scale
          },
          frames: {
            type: 'f32',
            value: 0,
          },
          fogIntensity: {
            type: 'f32',
            value: 0.005,
          },
          anisotropy: {
            type: 'f32',
            value: 0.5,
          },
          nbSteps: {
            type: 'u32',
            value: 32,
          },
        },
      },
      camera: {
        struct: {
          position: {
            type: 'vec3f',
            value: renderer.camera.actualPosition,
          },
          near: {
            type: 'f32',
            value: renderer.camera.near,
          },
          far: {
            type: 'f32',
            value: renderer.camera.far,
          },
          inverseViewProjectionMatrix: {
            type: 'mat4x4f',
            value: new Mat4().multiplyMatrices(camera.projectionMatrix, camera.viewMatrix).invert(),
          },
        },
      },
    },
  })

  volumetricPass.onBeforeRender(() => {
    volumetricPass.uniforms.params.frames.value++

    // we need to be sure the camera matrices are up to date
    camera.updateMatrixStack()

    volumetricPass.uniforms.camera.inverseViewProjectionMatrix.value
      .multiplyMatrices(camera.projectionMatrix, camera.viewMatrix)
      .invert()

    // explicitly tell the uniform to update
    volumetricPass.uniforms.camera.inverseViewProjectionMatrix.shouldUpdate = true
  })

  // gaussian blur in 2 passes
  const horizontalGaussianBlurPass = new ShaderPass(renderer, {
    label: 'Horizontal gaussian blur',
    inputTarget: volumetricOutputTarget,
    outputTarget: blurInputTarget,
    renderTextureName: 'volumetricTargetTexture',
    shaders: {
      fragment: {
        code: gaussianBlurPassFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          direction: {
            type: 'vec2f',
            value: new Vec2(1, 0),
          },
          resolution: {
            type: 'vec2f',
            value: new Vec2(renderer.boundingRect.width, renderer.boundingRect.height),
          },
          radius: {
            type: 'f32',
            value: 3,
          },
        },
      },
    },
  })

  horizontalGaussianBlurPass.onAfterResize(() => {
    horizontalGaussianBlurPass.uniforms.params.resolution.value.set(
      renderer.boundingRect.width,
      renderer.boundingRect.height
    )
  })

  const verticalGaussianBlurPass = new ShaderPass(renderer, {
    label: 'Vertical gaussian blur',
    renderTextureName: 'volumetricTargetTexture',
    inputTarget: blurInputTarget,
    outputTarget: blurOutputTarget,
    shaders: {
      fragment: {
        code: gaussianBlurPassFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          direction: {
            type: 'vec2f',
            value: new Vec2(0, 1),
          },
          resolution: {
            type: 'vec2f',
            value: new Vec2(renderer.boundingRect.width, renderer.boundingRect.height),
          },
          radius: {
            type: 'f32',
            value: 3,
          },
        },
      },
    },
  })

  verticalGaussianBlurPass.onAfterResize(() => {
    verticalGaussianBlurPass.uniforms.params.resolution.value.set(
      renderer.boundingRect.width,
      renderer.boundingRect.height
    )
  })

  const blendPass = new ShaderPass(renderer, {
    label: 'Blend pass',
    textures: [blurOutputTarget.renderTexture],
    shaders: {
      fragment: {
        code: blendPassFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          debugView: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Volumetric lighting',
  })

  gui
    .add({ active: true }, 'active')
    .name('Active')
    .onChange((value) => {
      volumetricPass.visible = value
      blendPass.visible = value
      pointLight.shadow.intensity = value ? 1 : 0
    })

  const volumetricPassFolder = gui.addFolder('Volumetric pass')

  volumetricPassFolder
    .add({ debug: false }, 'debug')
    .name('Show volumetric view')
    .onChange((value) => {
      blendPass.uniforms.params.debugView.value = value ? 1 : 0
    })

  volumetricPassFolder
    .add({ quality: volumetricQuality }, 'quality', 0.1, 1, 0.05)
    .name('Quality')
    .onChange((value) => {
      volumetricOutputTarget.setQualityRatio(value)
      volumetricPass.uniforms.params.qualityRatio.value = value

      horizontalGaussianBlurPass.renderTexture.copy(volumetricOutputTarget.renderTexture)
    })

  volumetricPassFolder.add(volumetricPass.uniforms.params.nbSteps, 'value', 1, 80, 1).name('Nb steps')

  volumetricPassFolder.add(volumetricPass.uniforms.params.density, 'value', 0.1, systemSize, 0.05).name('Density')
  volumetricPassFolder.add(volumetricPass.uniforms.params.anisotropy, 'value', 0, 0.95, 0.01).name('Anisotropy')
  volumetricPassFolder
    .add(volumetricPass.uniforms.params.fogIntensity, 'value', 0.0001, 0.03, 0.0001)
    .name('Fog intensity')

  const blurPassFolder = gui.addFolder('Blur pass')

  blurPassFolder
    .add(horizontalGaussianBlurPass.uniforms.params.radius, 'value', 0.5, 4, 0.05)
    .name('Radius')
    .onChange((value) => {
      verticalGaussianBlurPass.uniforms.params.radius.value = value
    })
})
