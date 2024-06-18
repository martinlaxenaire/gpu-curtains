import {
  GPUCurtains,
  GLTFLoader,
  GLTFScenesManager,
  buildShaders,
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

  const gltfElement = document.querySelector('#gltf')

  // will hold our gltf scenes
  const parentNode = new DOMObject3D(gpuCurtains.renderer, gltfElement, {
    watchScroll: true,
  }).onAfterDOMElementResize(() => {
    parentNode.position.z = -0.5 * parentNode.boundingBox.size.z * parentNode.DOMObjectWorldScale.z
  })

  parentNode.parent = gpuCurtains.renderer.scene

  gpuCurtains.onRender(() => {
    parentNode.rotation.y += 0.02
  })

  // helper
  const helper = new DOMMesh(gpuCurtains, gltfElement, {
    label: 'Helper',
    geometry: new BoxGeometry({
      topology: 'line-list',
    }),
    visible: false,
  })

  const updateTestCubeScale = () => {
    const { size } = helper.boundingBox

    // adjust depth scale ratio to match our parent node
    helper.DOMObjectDepthScaleRatio =
      helper.size.document.width /
      helper.size.document.height /
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
    gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // add lights
      parameters.uniforms = {
        ...parameters.uniforms,
        ...{
          ambientLight: {
            struct: {
              intensity: {
                type: 'f32',
                value: 0.1,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
            },
          },
          directionalLight: {
            struct: {
              position: {
                type: 'vec3f',
                value: new Vec3(5),
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
              intensity: {
                type: 'f32',
                value: 2,
              },
            },
          },
        },
      }

      // shaders
      const ambientContribution = /* wgsl */ `
        lightContribution.ambient = ambientLight.intensity * ambientLight.color;
      `

      const lightContribution = /* wgsl */ `
        // An extremely simple directional lighting model, just to give our model some shape.
        // N is already defined as
        // let N = normalize(normal);
        let L = normalize(directionalLight.position);
        let NDotL = max(dot(N, L), 0.0);

        lightContribution.diffuse += NDotL * directionalLight.color;
      `

      parameters.shaders = buildShaders(meshDescriptor, { chunks: { ambientContribution, lightContribution } })
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
