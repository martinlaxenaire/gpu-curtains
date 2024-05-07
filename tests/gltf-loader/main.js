// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
import { GLTFLoader } from './GLTFLoader.js'
import { buildShaders, traverseScenes } from './utils.js'

window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUDeviceManager, GPUCameraRenderer, OrbitControls, Object3D, Box3, Mesh, Vec3, BoxGeometry } = await import(
    /* @vite-ignore */ path
  )

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

  const models = {
    damagedHelmet: {
      name: 'Damaged Helmet',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF/DamagedHelmet.gltf',
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
    sponza: {
      name: 'Sponza',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf',
    },
    optimizedSponza: {
      name: 'Sponza (optimized / interleaved)',
      url: 'https://raw.githubusercontent.com/toji/sponza-optimized/main/Sponza.gltf',
    },
  }

  // gltf
  const gltfLoader = new GLTFLoader({
    renderer: gpuCameraRenderer,
  })

  let currentScenes = []

  const loadGLTF = async (url) => {
    container.classList.add('loading')
    const { gltf, scenes, boundingBox } = await gltfLoader.loadFromUrl(url)
    container.classList.remove('loading')
    console.log({ gltf, scenes, boundingBox })

    currentScenes = scenes

    const createMesh = (parent, meshDescriptor) => {
      if (meshDescriptor.parameters.geometry) {
        console.warn('>>> Create mesh. Those can help you write the correct shaders:', {
          attributes: meshDescriptor.attributes,
          textures: meshDescriptor.textures,
          parameters: meshDescriptor.parameters,
          nodes: meshDescriptor.nodes,
        })

        // merge uniforms
        meshDescriptor.parameters.uniforms = {
          ...meshDescriptor.parameters.uniforms,
          ...{
            light: {
              struct: {
                position: {
                  type: 'vec3f',
                  value: new Vec3(10),
                },
                color: {
                  type: 'vec3f',
                  value: new Vec3(1),
                },
                ambient: {
                  type: 'f32',
                  value: 0.1,
                },
              },
            },
          },
        }

        // now generate the shaders
        const { vs, fs } = buildShaders(meshDescriptor)

        const mesh = new Mesh(gpuCameraRenderer, {
          ...meshDescriptor.parameters,
          frustumCulled: false,
          shaders: {
            vertex: {
              code: vs,
            },
            fragment: {
              code: fs,
            },
          },
        })

        if (meshDescriptor.nodes.length > 1) {
          // if we're dealing with instances
          // we must patch the mesh updateWorldMatrix method
          // in order to update the instanceMatrix binding each time the mesh world matrix change
          const originalWorldUpdateMatrix = mesh.updateWorldMatrix.bind(mesh)
          mesh.updateWorldMatrix = () => {
            originalWorldUpdateMatrix()

            meshDescriptor.nodes.forEach((node, i) => {
              mesh.storages.instances.instanceMatrix.value.set(node.worldMatrix.elements, i * 16)
            })

            mesh.storages.instances.instanceMatrix.shouldUpdate = true
          }
        }

        mesh.parent = parent.node

        meshDescriptor.mesh = mesh
      }
    }

    traverseScenes(scenes, ({ child, meshDescriptor }) => {
      createMesh(child, meshDescriptor)
    })

    console.log(gpuCameraRenderer)

    const { center, radius } = boundingBox

    // reset orbit controls
    orbitControls.reset()

    if (url.includes('Sponza')) {
      camera.position.y = center.y * 0.25
      camera.position.z = radius * 0.225
      camera.fov = 75

      orbitControls.zoomStep = radius * 0.001
      orbitControls.minZoom = radius * -0.225
    } else {
      camera.position.y = center.y
      camera.position.z = radius * 2
      camera.fov = 50

      orbitControls.zoomStep = radius * 0.0025
      orbitControls.minZoom = radius * -0.5
    }

    orbitControls.maxZoom = radius * 2
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
        traverseScenes(currentScenes, ({ meshDescriptor }) => {
          if (meshDescriptor.mesh) {
            meshDescriptor.mesh.remove()
          }
        })

        currentScenes = []

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

    // currentScenes.forEach((scene) => {
    //   scene.node.rotation.y += 0.01
    // })
  }

  animate()
})
