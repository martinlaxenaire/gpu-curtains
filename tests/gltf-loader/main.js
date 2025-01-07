// Goals of this test:
// - test various capacities of the gltf loader

window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    Texture,
    HDRLoader,
    EnvironmentMap,
    Sampler,
    GLTFLoader,
    GLTFScenesManager,
    buildShaders,
    AmbientLight,
    PointLight,
    DirectionalLight,
    OrbitControls,
    Vec3,
  } = await import(/* @vite-ignore */ path)

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
      far: 2000,
    },
  })

  const { camera } = gpuCameraRenderer
  const orbitControls = new OrbitControls({
    camera,
    element: container,
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

  const environmentMap = new EnvironmentMap(gpuCameraRenderer)
  await environmentMap.loadAndComputeFromHDR(currentEnvMap.url)

  console.log(environmentMap)

  const models = {
    damagedHelmet: {
      name: 'Damaged Helmet',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF/DamagedHelmet.gltf',
    },
    avocado: {
      name: 'Avocado',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF/Avocado.gltf',
    },
    antiqueCamera: {
      name: 'Antique Camera',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/glTF/AntiqueCamera.gltf',
    },
    buggy: {
      name: 'Buggy',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Buggy/glTF/Buggy.gltf',
    },
    flightHelmet: {
      name: 'Flight Helmet',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF/FlightHelmet.gltf',
    },
    suzanne: {
      name: 'Suzanne',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Suzanne/glTF/Suzanne.gltf',
    },
    boxVertexColors: {
      name: 'Box with vertex colors',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxVertexColors/glTF/BoxVertexColors.gltf',
    },
    cameras: {
      name: 'Cameras',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Cameras/glTF/Cameras.gltf',
    },
    multiUVTest: {
      name: 'Multiple UVs',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MultiUVTest/glTF/MultiUVTest.gltf',
    },
    metalRoughSpheresTextureless: {
      name: 'Metal-Rough Spheres (textureless)',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MetalRoughSpheresNoTextures/glTF/MetalRoughSpheresNoTextures.gltf',
    },
    metalRoughSpheres: {
      name: 'Metal-Rough Spheres',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf',
    },
    sponza: {
      name: 'Sponza',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf',
    },
    optimizedSponza: {
      name: 'Sponza (optimized / interleaved)',
      url: 'https://raw.githubusercontent.com/toji/sponza-optimized/main/Sponza.gltf',
    },
  }

  let shadingModel = 'IBL' // 'IBL', 'PBR', 'Phong' or 'Lambert'
  const lightType = 'DirectionalLight' // or 'PointLight'

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0, // will be updated
  })

  const light =
    lightType === 'DirectionalLight'
      ? new DirectionalLight(gpuCameraRenderer, {
          position: new Vec3(), // will be updated when model changes
          intensity: 2,
        })
      : new PointLight(gpuCameraRenderer, {
          position: new Vec3(), // will be updated when model changes
          intensity: 1,
          range: -1,
        })

  // gltf
  const gltfLoader = new GLTFLoader()

  let gltfScenesManager = null

  const loadGLTF = async (url) => {
    container.classList.add('loading')
    const gltf = await gltfLoader.loadFromUrl(url)
    gltfScenesManager = new GLTFScenesManager({ renderer: gpuCameraRenderer, gltf })

    const { scenesManager } = gltfScenesManager
    const { scenes, boundingBox, node } = scenesManager
    container.classList.remove('loading')
    console.log({ gltf, scenesManager, scenes, boundingBox })

    const { center, radius } = boundingBox

    // center model
    node.position.sub(center)

    const isSponza = url.includes('Sponza')

    if (isSponza) {
      node.position.y = 0
      camera.fov = 75

      orbitControls.reset({
        zoomSpeed: radius * 0.025,
        minZoom: 0,
        maxZoom: radius * 2,
        position: new Vec3(radius * 0.25, center.y * 0.25, 0),
        target: new Vec3(0, center.y * 0.1, 0),
      })
    } else {
      camera.fov = 50

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 2.5),
        target: new Vec3(),
      })
    }

    camera.far = radius * 6

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      light.position.set(radius * 2)

      if (shadingModel === 'IBL') {
        ambientLight.intensity = 0
        light.intensity = 0
      } else {
        ambientLight.intensity = 0.1

        if (light instanceof PointLight) {
          const lightPositionLengthSq = light.position.lengthSq()
          light.intensity = lightPositionLengthSq * 3
        } else {
          light.intensity = 2
        }
      }

      // debug
      const additionalColorContribution = `
        // color = vec4(vec3(metallic), color.a);
      `

      parameters.shaders = buildShaders(meshDescriptor, {
        shadingModel,
        chunks: {
          additionalColorContribution,
        },
        iblParameters: {
          diffuseStrength: 1,
          specularStrength: 1,
          environmentMap,
        },
      })
    })

    console.log(gpuCameraRenderer, meshes)

    // meshes[0].onReady(() => console.log(meshes[0].material.getShaderCode('fragment')))
  }

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  const currentModelKey = 'damagedHelmet'
  let currentModel = models[currentModelKey]

  gui
    .add(
      { [currentModel.name]: currentModelKey },
      currentModel.name,
      Object.keys(models).reduce((acc, v) => {
        return { ...acc, [models[v].name]: v }
      }, {})
    )
    .onChange(async (value) => {
      if (models[value].name !== currentModel.name) {
        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        gltfScenesManager = null

        currentModel = models[value]
        await loadGLTF(currentModel.url)
      }
    })
    .name('Models')

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
    .add({ shadingModel }, 'shadingModel', ['IBL', 'PBR', 'Phong', 'Lambert'])
    .onChange(async (value) => {
      if (value !== shadingModel) {
        shadingModel = value

        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        gltfScenesManager = null

        await loadGLTF(currentModel.url)
      }
    })
    .name('Shading')

  await loadGLTF(currentModel.url)
})
