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
    // animations
    animatedCube: {
      name: 'Animated Cube',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AnimatedCube/glTF/AnimatedCube.gltf',
    },
    boxAnimated: {
      name: 'Box Animated',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxAnimated/glTF/BoxAnimated.gltf',
    },
    interpolationTest: {
      name: 'Interpolation Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/InterpolationTest/glTF/InterpolationTest.gltf',
    },
    // sparse accessors
    simpleSparseAccessor: {
      name: 'Simple Sparse Accessor',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleSparseAccessor/glTF/SimpleSparseAccessor.gltf',
    },
    // interleaved data
    boxInterleaved: {
      name: 'Box Interleaved',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxInterleaved/glTF/BoxInterleaved.gltf',
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
    console.log(gltfScenesManager)

    const { center, radius } = boundingBox

    // center model
    node.position.sub(center)

    const isSponza = url.includes('Sponza')

    if (isSponza) {
      node.position.y = 0
      camera.fov = 75
      camera.far = radius * 6

      orbitControls.reset({
        zoomSpeed: radius * 0.025,
        minZoom: 0,
        maxZoom: radius * 2,
        position: new Vec3(radius * 0.25, center.y * 0.25, 0),
        target: new Vec3(0, center.y * 0.1, 0),
      })
    } else if (url.includes('Animated')) {
      camera.fov = 50
      camera.far = radius * 20

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius,
        maxZoom: radius * 10,
        position: new Vec3(0, 0, radius * 5),
        target: new Vec3(),
      })
    } else if (url.includes('Interpolated')) {
      camera.fov = 50
      camera.far = radius * 200

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 10),
        target: center,
      })
    } else {
      camera.fov = 50
      camera.far = radius * 6

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 2.5),
        target: new Vec3(),
      })
    }

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

    // test for gltf cameras
    // if (scenesManager.cameras.length) {
    //   setTimeout(() => {
    //     console.log('switching camera')
    //     const newCamera = scenesManager.cameras[0]
    //     gpuCameraRenderer.useCamera(newCamera)
    //     orbitControls.useCamera(newCamera)
    //   }, 2000)
    // }

    console.log(gpuCameraRenderer, meshes)

    // meshes[0].onReady(() => console.log(meshes[0].material.getShaderCode('fragment')))
  }

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  const currentModelKey = 'interpolationTest'
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

/*
buggy:
position: {
    "0": -1,
    "1": 1,
    "2": 1,
    "3": -1,
    "4": 0,
    "5": 0,
    "6": -1,
    "7": -1,
    "8": -1,
    "9": -1,
    "10": 0,
    "11": 0,
    "12": -1,
    "13": -1,
    "14": 1,
    "15": -1,
    "16": 0,
    "17": 0,
    "18": -1,
    "19": 1,
    "20": -1,
    "21": -1,
    "22": 0,
    "23": 0,
    "24": -1,
    "25": 1,
    "26": -1,
    "27": 0,
    "28": 0,
    "29": -1,
    "30": 1,
    "31": -1,
    "32": -1,
    "33": 0,
    "34": 0,
    "35": -1,
    "36": -1,
    "37": -1,
    "38": -1,
    "39": 0,
    "40": 0,
    "41": -1,
    "42": 1,
    "43": 1,
    "44": -1,
    "45": 0,
    "46": 0,
    "47": -1,
    "48": 1,
    "49": 1,
    "50": -1,
    "51": 1,
    "52": 0,
    "53": 0,
    "54": 1,
    "55": -1,
    "56": 1,
    "57": 1,
    "58": 0,
    "59": 0,
    "60": 1,
    "61": -1,
    "62": -1,
    "63": 1,
    "64": 0,
    "65": 0,
    "66": 1,
    "67": 1,
    "68": 1,
    "69": 1,
    "70": 0,
    "71": 0
}

indices: {
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 0,
    "4": 3,
    "5": 1,
    "6": 4,
    "7": 5,
    "8": 6,
    "9": 4,
    "10": 7,
    "11": 5,
    "12": 8,
    "13": 9,
    "14": 10,
    "15": 8,
    "16": 11,
    "17": 9,
    "18": 12,
    "19": 13,
    "20": 14,
    "21": 12,
    "22": 15,
    "23": 13,
    "24": 16,
    "25": 17,
    "26": 18,
    "27": 16,
    "28": 19,
    "29": 17,
    "30": 20,
    "31": 21,
    "32": 22,
    "33": 20,
    "34": 23,
    "35": 21
}
 */
