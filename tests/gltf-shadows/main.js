// Goals of this test:
// - test various capacities of the gltf loader
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    EnvironmentMap,
    GLTFLoader,
    GLTFScenesManager,
    RenderBundle,
    AmbientLight,
    DirectionalLight,
    PointLight,
    OrbitControls,
    Vec3,
    Vec2,
  } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  const container = document.querySelector('#canvas')

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container,
    pixelRatio: Math.min(1, window.devicePixelRatio),
    camera: {
      near: 0.001,
      far: 150,
      fov: 75,
    },
  })

  gpuDeviceManager
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

  const { camera } = gpuCameraRenderer
  camera.position.set(7, 2.5, 0)

  const orbitControls = new OrbitControls({
    camera,
    element: container,
    target: new Vec3(0, 0.5, 0),
    zoomSpeed: 0.5,
    maxZoom: 40,
  })

  const envMaps = {
    cannon: {
      name: 'Cannon',
      url: '../../website/assets/hdr/cannon_1k.hdr',
    },
    colorfulStudio: {
      name: 'Colorful studio',
      url: '../../website/assets/hdr/Colorful_Studio.hdr',
    },
  }

  const currentEnvMapKey = 'cannon'
  let currentEnvMap = envMaps[currentEnvMapKey]

  const environmentMap = new EnvironmentMap(gpuCameraRenderer, {
    diffuseIntensity: 0.25,
    specularIntensity: 0.25,
  })
  await environmentMap.loadAndComputeFromHDR(currentEnvMap.url)

  let shadingModel = 'PBR' // 'PBR', 'Phong' or 'Lambert'

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 1,
    color: new Vec3(0.2, 0.4, 0.8),
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(-10, 30, 3),
    color: new Vec3(0.2, 0.4, 0.8),
    //intensity: 6,
    intensity: 3,
    shadow: {
      bias: 0.0001,
      normalBias: 0.0001,
      depthTextureSize: new Vec2(1500),
      pcfSamples: 2,
      camera: {
        left: -20,
        right: 20,
        bottom: -20,
        top: 20,
        near: 0.1,
        far: 100,
      },
      autoRender: false,
    },
  })

  const pointLights = []
  const pointLightsSettings = {
    color: new Vec3(0.85, 0.25, 0),
    intensity: 7.5,
    range: 10,
    shadow: {
      bias: 0.0001,
      pcfSamples: 1,
      depthTextureSize: new Vec2(512),
      camera: {
        near: 0.01,
        far: 20,
      },
      autoRender: false,
    },
  }

  // put point lights on the torches
  const pointLightsPos = [
    new Vec3(-4.45, 1.15, -1.45),
    new Vec3(-4.45, 1.15, 1.45),
    new Vec3(4.45, 1.15, -1.45),
    new Vec3(4.45, 1.15, 1.45),
  ]

  pointLightsPos.forEach((position) => {
    const pointLight = new PointLight(gpuCameraRenderer, {
      position,
      ...pointLightsSettings,
    })

    pointLights.push(pointLight)
  })

  let time = 0
  gpuCameraRenderer.onBeforeRender(() => {
    time++
    pointLights.forEach((pointLight, i) => {
      const sinusoidal = i % 2 === 0 ? Math.cos : Math.sin
      pointLight.intensity = 6 + (sinusoidal(time * 0.05) + 1) * 0.5 + (Math.random() * 2 + 1)
    })
  })

  // gltf
  const gltfLoader = new GLTFLoader()

  let gltfScenesManager = null

  const useRenderBundle = true
  let renderBundle = null

  const loadGLTF = async () => {
    container.classList.add('loading')

    //const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf'
    const url = 'https://raw.githubusercontent.com/toji/sponza-optimized/main/Sponza.gltf'

    const gltf = await gltfLoader.loadFromUrl(url)
    gltfScenesManager = new GLTFScenesManager({ renderer: gpuCameraRenderer, gltf })

    const { scenesManager } = gltfScenesManager
    const { scenes, boundingBox, node } = scenesManager
    container.classList.remove('loading')

    console.log({ gltf, scenesManager, scenes, boundingBox })

    if (useRenderBundle) {
      renderBundle = new RenderBundle(gpuCameraRenderer, {
        label: 'glTF render bundle',
        size: scenesManager.meshesDescriptors.length,
        useBuffer: true,
      })
    }

    const { center } = boundingBox

    // center model
    node.position.sub(center)
    node.position.y = 0

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // add render bundle
      if (useRenderBundle) {
        parameters.renderBundle = renderBundle

        // disable frustum culling
        parameters.frustumCulling = false
      }

      // shadows
      parameters.castShadows = true
      parameters.receiveShadows = true

      // debug
      const additionalContribution = `
        // color = vec4(vec3(metallic), color.a);
      `

      parameters.material.shading = shadingModel
      parameters.material.fragmentChunks = {
        additionalContribution,
      }
      parameters.material.environmentMap = environmentMap
    })

    // finally render shadows
    directionalLight.shadow.renderOnce()

    pointLights.forEach((pointLight) => {
      pointLight.shadow.renderOnce()
    })

    console.log(gpuCameraRenderer, meshes)
  }

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  gui
    .add(
      { [currentEnvMap.name]: currentEnvMapKey },
      currentEnvMap.name,
      Object.keys(envMaps).reduce((acc, v) => {
        return { ...acc, [envMaps[v].name]: v }
      }, {})
    )
    .onChange(async (value) => {
      if (envMaps[value].name !== currentEnvMap.name) {
        currentEnvMap = envMaps[value]
        await environmentMap.loadAndComputeFromHDR(envMaps[value].url)
      }
    })
    .name('Environment maps')

  gui
    .add({ shadingModel }, 'shadingModel', ['PBR', 'Phong', 'Lambert', 'Unlit'])
    .onChange(async (value) => {
      if (value !== shadingModel) {
        shadingModel = value

        if (renderBundle) {
          renderBundle.destroy()
        }

        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        renderBundle = null
        gltfScenesManager = null

        await loadGLTF()
      }
    })
    .name('Shading')

  const ambientLightFolder = gui.addFolder('Ambient light')
  ambientLightFolder.add(ambientLight, 'intensity', 0, 1, 0.01)
  ambientLightFolder
    .addColor({ color: { r: ambientLight.color.x, g: ambientLight.color.y, b: ambientLight.color.z } }, 'color')
    .onChange((value) => {
      ambientLight.color.set(value.r, value.g, value.b)
    })

  const directionalLightFolder = gui.addFolder('Directional light')
  directionalLightFolder.add(directionalLight, 'intensity', 0, 10, 0.01)
  directionalLightFolder
    .addColor(
      { color: { r: directionalLight.color.x, g: directionalLight.color.y, b: directionalLight.color.z } },
      'color'
    )
    .onChange((value) => {
      directionalLight.color.set(value.r, value.g, value.b)
    })

  const directionalLightPosFolder = directionalLightFolder.addFolder('Position')
  directionalLightPosFolder
    .add(directionalLight.position, 'x', -60, 60, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightPosFolder
    .add(directionalLight.position, 'y', 0, 200, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightPosFolder
    .add(directionalLight.position, 'z', -60, 60, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())

  const directionalLightTargetFolder = directionalLightFolder.addFolder('Target')
  directionalLightTargetFolder
    .add(directionalLight.target, 'x', -100, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightTargetFolder
    .add(directionalLight.target, 'y', -100, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightTargetFolder
    .add(directionalLight.target, 'z', -100, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())

  let isDebug = false

  const shadowFolder = gui.addFolder('Directional shadow')
  shadowFolder.add(directionalLight.shadow, 'intensity', 0, 1, 0.01)
  shadowFolder.add(directionalLight.shadow, 'bias', 0, 0.01, 0.0001)
  shadowFolder.add(directionalLight.shadow, 'normalBias', 0, 0.01, 0.0001)
  shadowFolder.add(directionalLight.shadow, 'pcfSamples', 1, 5, 1)
  const shadowTextureSizeFolder = shadowFolder.addFolder('Depth texture size')
  shadowTextureSizeFolder
    .add(directionalLight.shadow.depthTextureSize, 'x', 100, 2048, 2)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowTextureSizeFolder
    .add(directionalLight.shadow.depthTextureSize, 'y', 100, 2048, 2)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  const shadowCameraFolder = shadowFolder.addFolder('Camera')
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'left', -100, 1, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'right', 1, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'bottom', -100, 1, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'top', 1, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'near', 0.001, 1, 0.001)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'far', 20, 500, 1)
    .onChange(async () => await directionalLight.shadow.renderOnce())

  await loadGLTF()
})
