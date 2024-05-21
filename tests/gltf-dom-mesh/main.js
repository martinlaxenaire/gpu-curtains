import { GLTFLoader } from '../gltf-loader/GLTFLoader.js'
import { Vec3 } from '../../dist/esm/index.mjs'
import { buildShaders } from '../gltf-loader/utils.js'

// Goal of this test is to help debug any issue due to scroll or resize
window.addEventListener('load', async () => {
  //const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const path = '../../dist/esm/index.mjs'
  const { GPUCurtains, DOMMesh, DOMObject3D, Object3D, BoxGeometry } = await import(/* @vite-ignore */ path)

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
    console.log('after resize helper')
    // move our cube along the Z axis so the front face lies at (0, 0, 0) instead of the cube's center
    const { size } = helper.boundingBox

    // adjust depth
    helper.DOMObjectDepthScaleRatio =
      helper.size.document.width /
      helper.size.document.height /
      (helper.size.scaledWorld.size.y / helper.size.scaledWorld.size.x)

    helper.position.z = -0.5 * size.z * helper.DOMObjectWorldScale.z
  }

  helper.onAfterResize(updateTestCubeScale)

  const gltfLoader = new GLTFLoader({ renderer: gpuCurtains.renderer })

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

  let gltfScenes = null

  const loadGLTF = async (url) => {
    gltfScenes = await gltfLoader.loadFromUrl(url)
    const { gltf, sceneManager } = gltfScenes
    const { scenes, node, boundingBox } = sceneManager
    const { size, radius } = boundingBox

    node.parent = parentNode
    parentNode.rotation.y = 0

    gltfElement.style.aspectRatio = size.x / size.y

    //console.log('BBOX', boundingBox.size)

    parentNode.boundingBox.copy(boundingBox)

    gltfScenes.addMeshes({
      patchMeshParameters: (parameters) => {
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
      },
      setCustomMeshShaders: (meshDescriptor) => {
        const ambientContribution = /* wgsl */ `
        ambientContribution = ambientLight.intensity * ambientLight.color;
        `

        const lightContribution = /* wgsl */ `
        // An extremely simple directional lighting model, just to give our model some shape.
        let N = normalize(normal);
        let L = normalize(directionalLight.position);
        let NDotL = max(dot(N, L), 0.0);

        lightContribution = color.rgb * NDotL * directionalLight.color;
        `

        return buildShaders(meshDescriptor, { ambientContribution, lightContribution })
      },
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
        if (gltfScenes) {
          gltfScenes.destroy()
        }

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

  await loadGLTF(currentModel.url)
})
