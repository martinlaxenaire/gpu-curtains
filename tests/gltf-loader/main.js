// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
import { GLTFLoader } from './GLTFLoader.js'

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

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1, window.devicePixelRatio),
  })

  const { camera } = gpuCameraRenderer
  const orbitControls = new OrbitControls(gpuCameraRenderer)

  const models = {
    camera: {
      name: 'AntiqueCamera',
      url: 'assets/AntiqueCamera/glTF/AntiqueCamera.gltf',
    },
    damagedHelmet: {
      name: 'DamagedHelmet',
      url: 'assets/DamagedHelmet/glTF/DamagedHelmet.gltf',
    },
    buggy: {
      name: 'Buggy',
      url: 'assets/Buggy/glTF/Buggy.gltf',
    },
    flightHelmet: {
      name: 'FlightHelmet',
      url: 'assets/FlightHelmet/glTF/FlightHelmet.gltf',
    },
  }

  // gltf
  const gltfLoader = new GLTFLoader({
    renderer: gpuCameraRenderer,
  })

  let currentScenes = []

  const loadGLTF = async (url) => {
    const { gltf, scenes, boundingBox } = await gltfLoader.loadFromUrl(url)
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
        const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== 'position')

        const structAttributes = facultativeAttributes
          .map((attribute, index) => {
            return `@location(${index}) ${attribute.name}: ${attribute.type},`
          })
          .join('\n')

        const outputAttributes = facultativeAttributes
          .map((attribute) => {
            return `vsOutput.${attribute.name} = attributes.${attribute.name};`
          })
          .join('\n')

        let outputPosition = 'vsOutput.position = getOutputPosition(attributes.position);'

        if (meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances) {
          outputPosition = `
          var transformed: vec4f = instances.instanceMatrix[attributes.instanceIndex] * vec4f(attributes.position, 1.0);
          vsOutput.position = camera.projection * camera.view * transformed;`
        }

        const vs = /* wgsl */ `
          struct VertexOutput {
            @builtin(position) position: vec4f,
            ${structAttributes}
          };
          
          @vertex fn main(
            attributes: Attributes,
          ) -> VertexOutput {
            var vsOutput: VertexOutput;
          
            ${outputPosition}
            ${outputAttributes}
            
            return vsOutput;
          }
        `

        // not a PBR material for now, as it does not use roughness/metalness
        // we might want to implement it later
        // see https://github.com/oframe/ogl/blob/master/examples/load-gltf.html#L133
        const initColor = /* wgsl */ 'var color: vec4f = vec4();'
        const returnColor = /* wgsl */ 'return color;'

        // start with the base color
        let baseColor = /* wgsl */ 'var baseColor: vec4f = material.baseColorFactor;'

        const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === 'baseColorTexture')

        if (baseColorTexture) {
          baseColor = /* wgsl */ `
            var baseColor: vec4f = textureSample(baseColorTexture, ${baseColorTexture.sampler}, fsInput.uv) * material.baseColorFactor;
            
            if (baseColor.a < material.alphaCutoff) {
              discard;
            }
          `
        }

        // add lightning
        const surfaceColor = /* wgsl */ `
          // An extremely simple directional lighting model, just to give our model some shape.
          let N = normalize(fsInput.normal);
          let L = normalize(light.position);
          let NDotL = max(dot(N, L), 0.0);
          color = vec4((baseColor.rgb * light.ambient) + (baseColor.rgb * NDotL * light.color), baseColor.a);
        `

        // emissive and occlusion
        const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === 'emissiveTexture')
        const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === 'occlusionTexture')

        let emissiveOcclusion = ''

        if (emissiveTexture) {
          emissiveOcclusion = /* wgsl */ `
            let gamma = 2.2; // Gamma value typically used for encoding
            var emissive: vec4f = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.uv);
            emissive = vec4(material.emissiveFactor * pow(emissive.rgb, vec3(1.0 / gamma)), emissive.a);
          `
          if (occlusionTexture) {
            emissiveOcclusion += /* wgsl */ `
              var occlusion: vec4f = textureSample(occlusionTexture, ${occlusionTexture.sampler}, fsInput.uv);
              emissive *= occlusion.r;
            `
          }

          emissiveOcclusion += /* wgsl */ `
              color += emissive;
            `
        }

        const fs = /* wgsl */ `
          struct VSOutput {
            @builtin(position) position: vec4f,
            ${structAttributes}
          };
        
          @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {          
            ${initColor}
            ${baseColor}
            ${surfaceColor}
            ${emissiveOcclusion}
            ${returnColor}
          }
        `

        const mesh = new Mesh(gpuCameraRenderer, {
          ...meshDescriptor.parameters,
          shaders: {
            vertex: {
              code: vs,
            },
            fragment: {
              code: fs,
            },
          },
        })

        mesh.parent = parent.node

        meshDescriptor.mesh = mesh
      }
    }

    scenes.forEach((scene) => {
      // TODO real traverse
      scene.children.forEach((child) => {
        child.meshes.forEach((meshDescriptor) => {
          createMesh(child, meshDescriptor)
        })

        child.children.forEach((c) => {
          c.meshes.forEach((meshDescriptor) => {
            createMesh(c, meshDescriptor)
          })

          c.children.forEach((subChild) => {
            subChild.meshes.forEach((meshDescriptor) => {
              createMesh(subChild, meshDescriptor)
            })
          })
        })
      })
    })

    console.log(gpuCameraRenderer)

    const { center, radius } = boundingBox

    camera.position.y = center.y
    camera.position.z = radius * 2

    // reset orbit controls
    orbitControls.reset()
    orbitControls.zoomStep = radius * 0.005
    orbitControls.maxDistance = radius * 4
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
        currentScenes.forEach((scene) => {
          // TODO real traverse
          scene.children.forEach((child) => {
            child.meshes.forEach((meshDescriptor) => {
              if (meshDescriptor.mesh) {
                meshDescriptor.mesh.remove()
              }
            })

            child.children.forEach((c) => {
              c.meshes.forEach((meshDescriptor) => {
                if (meshDescriptor.mesh) {
                  meshDescriptor.mesh.remove()
                }
              })

              c.children.forEach((subChild) => {
                subChild.meshes.forEach((meshDescriptor) => {
                  if (meshDescriptor.mesh) {
                    meshDescriptor.mesh.remove()
                  }
                })
              })
            })
          })
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
  }

  animate()
})
