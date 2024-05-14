import { GLTFLoader } from '../gltf-loader/GLTFLoader.js'
import { buildShaders, traverseScenes } from '../gltf-loader/utils.js'

// Goal of this test is to help debug any issue due to scroll or resize
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUCurtains, DOMMesh, Vec3, DOMObject3D, Mesh, BoxGeometry } = await import(/* @vite-ignore */ path)

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

  const gltfLoader = new GLTFLoader({ renderer: gpuCurtains.renderer })
  // const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF/Duck.gltf'
  // const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoomBox/glTF/BoomBox.gltf'
  // const url =
  //   'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF/DamagedHelmet.gltf'
  const url =
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AntiqueCamera/glTF/AntiqueCamera.gltf'
  const { gltf, scenes, boundingBox, node } = await gltfLoader.loadFromUrl(url)

  const gltfElement = document.querySelector('#gltf')
  const nodeParent = new DOMObject3D(gpuCurtains.renderer, gltfElement, {
    watchScroll: true,
  })

  nodeParent.parent = gpuCurtains.renderer.scene
  node.parent = nodeParent

  console.log(gltf, scenes, boundingBox, boundingBox.size, node)

  gltfElement.style.aspectRatio = boundingBox.size.x / boundingBox.size.y

  nodeParent.boundingBox = boundingBox

  const createMesh = (parent, meshDescriptor) => {
    if (meshDescriptor.parameters.geometry) {
      console.warn('>>> Create mesh. Those can help you write the correct shaders:', {
        meshDescriptor,
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

      //const mesh = new DOMMesh(gpuCurtains, gltfElement, {
      const mesh = new Mesh(gpuCurtains, {
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

      mesh.onBeforeRender(() => {
        mesh.rotation.y += 0.02
      })

      const test = new DOMMesh(gpuCurtains, gltfElement, {
        geometry: new BoxGeometry({
          topology: 'line-list',
        }),
      })

      const updateTestCubeScale = () => {
        test.DOMObjectDepthScale =
          (test.worldScale.y * test.geometry.boundingBox.size.z) / test.geometry.boundingBox.size.y
      }

      test.onAfterResize(updateTestCubeScale)
      updateTestCubeScale()

      console.log(mesh, nodeParent)

      meshDescriptor.mesh = mesh
    }
  }

  traverseScenes(scenes, ({ child, meshDescriptor }) => {
    createMesh(child, meshDescriptor)
  })
})
