import {
  GPUCurtains,
  GLTFLoader,
  AmbientLight,
  DirectionalLight,
  GLTFScenesManager,
  DOMMesh,
  DOMObject3D,
  Vec3,
  BoxGeometry,
} from '../../dist/esm/index.mjs'

// Load glTF meshes and sync them with a DOM element
window.addEventListener('load', async () => {
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

  // LIGHTS
  const ambientLight = new AmbientLight(gpuCurtains, {
    intensity: 0.1, // will be updated
  })

  const directionalLight = new DirectionalLight(gpuCurtains, {
    position: new Vec3(20),
    intensity: 1,
  })

  const gltfElement = document.querySelector('#gltf')

  // will hold our gltf scenes
  const parentNode = new DOMObject3D(gpuCurtains.renderer, gltfElement, {
    watchScroll: true,
  }).onAfterDOMElementResize(() => {
    parentNode.position.z = -0.5 * parentNode.boundingBox.size.z * parentNode.DOMObjectWorldScale.z
  })

  parentNode.parent = gpuCurtains.renderer.scene

  gpuCurtains.onBeforeRender(() => {
    parentNode.rotation.y += 0.02
  })

  // helper
  const helper = new DOMMesh(gpuCurtains, gltfElement, {
    label: 'Helper',
    geometry: new BoxGeometry({
      topology: 'line-strip',
    }),
    visible: false,
  })

  const updateTestCubeScale = () => {
    const { size } = helper.boundingBox

    // adjust depth scale ratio to match our parent node
    helper.DOMObjectDepthScaleRatio =
      helper.boundingRect.width /
      helper.boundingRect.height /
      (helper.size.scaledWorld.size.y / helper.size.scaledWorld.size.x)

    helper.position.z = -0.5 * size.z * helper.DOMObjectWorldScale.z
  }

  helper.onAfterResize(updateTestCubeScale)

  const gltfLoader = new GLTFLoader()

  const models = {
    boomBox: {
      name: 'Boom Box',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF/BoomBox.gltf',
    },
    duck: {
      name: 'Duck',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF/Duck.gltf',
    },
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
  }

  let gltfScenesManager = null

  const loadGLTF = async (url) => {
    const gltf = await gltfLoader.loadFromUrl(url)
    gltfScenesManager = new GLTFScenesManager({ renderer: gpuCurtains.renderer, gltf })
    const { scenesManager } = gltfScenesManager
    const { node, boundingBox } = scenesManager
    const { center, size } = boundingBox

    // center the scenes manager parent node
    // needed for accurate position and transform origin calculations
    node.position.sub(center)
    node.parent = parentNode

    // reset parent node rotation
    parentNode.rotation.y = 0

    // set the new DOM element aspect ratio
    // this will automatically resize our parentNode
    gltfElement.style.aspectRatio = size.x / size.y

    // copy new scenes bounding box into DOMObject3D own bounding box
    parentNode.boundingBox.copy(boundingBox)

    // add the meshes with a really basic lightning setup
    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      parameters.material.shading = 'Phong'
    })
  }

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  const currentModelKey = 'boomBox'
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
    .add({ visible: helper.visible }, 'visible')
    .onChange((value) => {
      helper.visible = value
    })
    .name('Show helper')

  // load first model
  await loadGLTF(currentModel.url)
})
