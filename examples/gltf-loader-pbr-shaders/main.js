import {
  GPUDeviceManager,
  GPUCameraRenderer,
  AmbientLight,
  PointLight,
  GLTFLoader,
  GLTFScenesManager,
  buildShaders,
  OrbitControls,
  Vec3,
} from '../../dist/esm/index.mjs'

// Basic glTF loader with PBR shaders
window.addEventListener('load', async () => {
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
      near: 0.01,
      far: 2000,
    },
  })

  const { camera } = gpuCameraRenderer
  const orbitControls = new OrbitControls(gpuCameraRenderer)

  // LIGHTS
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1, // will be updated
  })

  const pointLight = new PointLight(gpuCameraRenderer, {
    position: new Vec3(), // will be updated when model changes
    intensity: 1, // will be updated when model changes
    range: -1,
  })

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
    flightHelmet: {
      name: 'Flight Helmet',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/FlightHelmet/glTF/FlightHelmet.gltf',
    },
    optimizedSponza: {
      name: 'Sponza (optimized / interleaved)',
      url: 'https://raw.githubusercontent.com/toji/sponza-optimized/main/Sponza.gltf',
    },
  }

  // gltf
  const gltfLoader = new GLTFLoader()

  let gltfScenesManager = null

  const loadGLTF = async (url) => {
    container.classList.add('loading')
    const gltf = await gltfLoader.loadFromUrl(url)
    gltfScenesManager = new GLTFScenesManager({ renderer: gpuCameraRenderer, gltf })

    const { scenesManager } = gltfScenesManager
    const { boundingBox, node } = scenesManager
    container.classList.remove('loading')

    const { center, radius } = boundingBox

    // center model
    node.position.sub(center)

    // reset orbit controls
    orbitControls.reset()

    const isSponza = url.includes('Sponza')

    if (isSponza) {
      camera.position.x = 0
      camera.position.y = center.y * 0.25 + node.position.y
      camera.position.z = radius * 0.225
      camera.fov = 75

      orbitControls.zoomStep = radius * 0.00025
      orbitControls.minZoom = radius * -0.225
    } else {
      camera.position.x = 0
      camera.position.y = 0
      camera.position.z = radius * 2.5
      camera.fov = 50

      orbitControls.zoomStep = radius * 0.0025
      orbitControls.minZoom = radius * -1
    }

    orbitControls.maxZoom = radius * 2
    camera.far = radius * 6

    gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      pointLight.position.set(radius * 2)
      const lightPositionLengthSq = pointLight.position.lengthSq()
      pointLight.intensity = lightPositionLengthSq * 3

      parameters.shaders = buildShaders(meshDescriptor, {
        shadingModel: 'PBR', // default anyway
      })
    })
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

  await loadGLTF(currentModel.url)

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()
})
