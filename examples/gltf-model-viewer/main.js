import {
  GPUDeviceManager,
  GPUCameraRenderer,
  EnvironmentMap,
  GLTFLoader,
  GLTFPointerAnimationsManager,
  GLTFScenesManager,
  OrbitControls,
  Vec3,
  RenderBundle,
  FullscreenPlane,
  constants,
  common,
  toneMappingUtils,
  Mat4,
} from '../../dist/esm/index.mjs'

import { loadGLTFFromFileInput } from './loading-helpers.js'

// glTF loader with environment maps and IBL shaders
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
      near: 0.1,
      far: 2000,
    },
    context: {
      format: 'rgba16float', // allow HDR output
      toneMapping: { mode: 'extended' },
    },
    renderPass: {
      // since transmission need a solid background color to be blended with
      // just clear the renderer renderPass color values to match the css background
      colorAttachments: [
        {
          clearValue: [34 / 255, 34 / 255, 34 / 255, 1],
        },
      ],
    },
  })

  const { camera } = gpuCameraRenderer
  const defaultCamera = camera

  const orbitControls = new OrbitControls({
    camera,
    element: container,
  })

  let envMaps = {
    none: {
      name: 'None',
      url: null,
    },
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
    // useLutTexture: false,
  })
  environmentMap.loadAndComputeFromHDR(currentEnvMap.url)
  let useEnvMap = true

  let toneMapping = 'Khronos' // 'Khronos', 'Reinhard', 'Cineon' or false

  // load model from 'model' query params if defined
  const url = new URL(window.location)
  const searchParams = new URLSearchParams(url.search)
  const modelUrl = searchParams.get('model')
  let modelUrlName = null

  const gltFSampleModelsRes = await fetch(
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/model-index.json'
  )
  const gltfSampleModels = await gltFSampleModelsRes.json()
  let availableSampleModels = gltfSampleModels.reduce((acc, current) => {
    const variants = current.variants
    const variant = variants['glTF-Binary'] || variants['glTF']

    const baseUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models'

    const availableVariants = Object.keys(variants).reduce((v, variantType) => {
      // draco is not yet supported
      return variantType === 'glTF-Draco'
        ? { ...v }
        : { ...v, [variantType]: `${baseUrl}/${current.name}/${variantType}/${variants[variantType]}` }
    }, {})

    return {
      ...acc,
      [current.name]: {
        name: current.label,
        url: `${baseUrl}/${current.name}/${variant.endsWith('.glb') ? 'glTF-Binary' : 'glTF'}/${variant}`,
        currentVariant: variants['glTF-Binary'] ? 'glTF-Binary' : 'glTF',
        variants: availableVariants,
      },
    }
  }, {})

  if (modelUrl) {
    const modelName = modelUrl
      .substring(modelUrl.lastIndexOf('/') + 1)
      .replace('.gltf', '')
      .replace('.glb', '')
    modelUrlName = modelName + 'FromURL' //  avoid duplicate keys

    availableSampleModels = {
      ...availableSampleModels,
      [modelUrlName]: {
        name: modelName + ' (from URL)',
        url: modelUrl,
        currentVariant: 'From URL',
        variants: { 'From URL': modelUrl },
      },
    }
  }

  const currentModelKey = modelUrlName ?? 'DamagedHelmet'
  let currentModel = availableSampleModels[currentModelKey]

  let usePunctualLighting = true

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  // folders
  const gltfFolder = gui.addFolder('glTF')
  const lightingFolder = gui.addFolder('Lighting')
  const renderingFolder = gui.addFolder('Rendering')

  // gltf
  const modelField = gltfFolder
    .add(
      { [currentModel.name]: currentModelKey },
      currentModel.name,
      Object.keys(availableSampleModels).reduce((acc, v) => {
        return { ...acc, [availableSampleModels[v].name]: v }
      }, {})
    )
    .name('Available models')

  const modelTypeField = gltfFolder
    .add(
      {
        [currentModel.currentVariant]: currentModel.variants[currentModel.currentVariant],
      },
      currentModel.currentVariant,
      currentModel.variants
    )
    .listen()
    .name('File type')

  const loadGLTFInput = document.querySelector('#load-gltf')
  gltfFolder.add({ loadGLTF: () => loadGLTFInput.click() }, 'loadGLTF').name('Load model')

  const scenesFolder = gltfFolder.addFolder('Scenes')

  const camerasFolder = gltfFolder.addFolder('Cameras')

  const useCamera = (camera) => {
    gpuCameraRenderer.useCamera(camera)
    // enable orbit controls only for default camera
    orbitControls.enabled = camera.uuid === defaultCamera.uuid
  }

  const animationsFolder = gltfFolder.addFolder('Animations')
  let playAnimations = true
  let playAnimationsField = animationsFolder.add({ playAnimations }, 'playAnimations').name('Play/pause animations')
  const availableAnimationsFolder = animationsFolder.addFolder('Available animations')

  let animationsFields = []

  const variantsFolder = gltfFolder.addFolder('Variants')

  // lighting
  // gltf lights
  let lightVisibilities = []
  const gltfPunctualLightingFolder = lightingFolder.addFolder('glTF asset punctual lights')
  const usePunctualLightingField = gltfPunctualLightingFolder
    .add({ usePunctualLighting }, 'usePunctualLighting')
    .name('Active')

  const envMapFolder = lightingFolder.addFolder('Environment map')

  const envMapField = envMapFolder
    .add(
      { [currentEnvMap.name]: currentEnvMapKey },
      currentEnvMap.name,
      Object.keys(envMaps).reduce((acc, v) => {
        return { ...acc, [envMaps[v].name]: v }
      }, {})
    )
    .name('Current')

  const loadHDRInput = document.querySelector('#load-hdr')
  envMapFolder.add({ loadHDR: () => loadHDRInput.click() }, 'loadHDR').name('Load HDR')

  const envMapRotationField = envMapFolder.add({ rotation: 90 }, 'rotation', 0, 360, 1).name('Rotation')
  const envMapDiffuseField = envMapFolder
    .add(environmentMap.options, 'diffuseIntensity', 0, 1.25, 0.05)
    .name('Diffuse intensity')
  const envMapSpecularField = envMapFolder
    .add(environmentMap.options, 'specularIntensity', 0, 1.25, 0.05)
    .name('Specular intensity')
  const envMapBackgroundField = envMapFolder
    .add({ background: 0 }, 'background', { Diffuse: 0, Specular: 1 })
    .name('Skybox background')

  // rendering
  let useRenderBundles = true
  let useTransparentRenderBundles = true
  let regularRenderBundle = null
  let transparentRenderBundle = null
  let transmissiveRenderBundle = null

  const renderBundlesFolder = renderingFolder.addFolder('Render bundles')
  const renderBundlesField = renderBundlesFolder.add({ useRenderBundles }, 'useRenderBundles').name('Active')
  const transparentRenderBundlesField = renderBundlesFolder
    .add({ useTransparentRenderBundles }, 'useTransparentRenderBundles')
    .name('Active for transparent objects')

  const toneMappingField = renderingFolder
    .add({ toneMapping }, 'toneMapping', { Khronos: 'Khronos', Reinhard: 'Reinhard', Cineon: 'Cineon', None: false })
    .name('Tone mapping')

  const debugChannels = [
    'None',
    'Texture Coordinates 0',
    'Texture Coordinates 1',
    'Normal texture',
    'Geometry Normal',
    'Geometry Tangent',
    'Geometry Bitangent',
    'Shading Normal',
    'Alpha',
    'Occlusion',
    'Emissive',
    'Base Color',
    'Metallic',
    'Roughness',
    'Specular Intensity',
    'Specular Color',
    // PBR only
    'Clearcoat Strength',
    'Clearcoat roughness',
    'Clearcoat normal',
    'Sheen Color',
    'Sheen Roughness',
    'Iridescence Strength',
    'Iridescence Thickness',
    'Anisotropy Strength',
    'Anisotropy Direction',
    'Diffuse Transmission Strength',
    'Diffuse Transmission Color',
    // multi scattering
    'Dielectric single scattering',
    'Dielectric multi scattering',
    'Metallic single scattering',
    'Metallic multi scattering',
  ]

  let debugChannel = 0

  const debugField = renderingFolder
    .add(
      { ['None']: debugChannel },
      'None',
      debugChannels.reduce((acc, v, index) => {
        return { ...acc, [debugChannels[index]]: index }
      }, {})
    )
    .name('Debug channels')

  // gltf
  const gltfLoader = new GLTFLoader()
  // pointer animations
  const gltfPointerAnimationsManager = new GLTFPointerAnimationsManager()

  let gltfScenesManager = null

  const loadGLTF = async (currentModel) => {
    const { url, json, arrayBuffer } = currentModel
    container.classList.add('loading')
    let gltf
    if (url) {
      gltf = await gltfLoader.loadFromUrl(url)
      if (currentModel.currentVariant === 'From URL') {
        modelTypeField.disable()
      } else {
        modelTypeField.enable()
      }
    } else if (json) {
      gltf = await gltfLoader.loadFromJson(json, '')
      modelTypeField.disable()
    } else if (arrayBuffer) {
      gltf = await gltfLoader.loadFromBinary(arrayBuffer, '')
      modelTypeField.disable()
    } else {
      // bail
      return
    }

    gltfScenesManager = new GLTFScenesManager({ renderer: gpuCameraRenderer, gltf })

    // create pointer animations if any
    gltfPointerAnimationsManager.createPointerAnimations(gltfScenesManager)

    const { scenesManager } = gltfScenesManager
    const { scenes, boundingBox, node } = scenesManager
    container.classList.remove('loading')
    console.log({ gltf, scenesManager, scenes, boundingBox })

    const hasScenes = gltf.scenes.length > 1

    if (hasScenes) {
      renderBundlesFolder.hide()
      renderBundlesField.disable()
      transparentRenderBundlesField.disable()
    } else {
      renderBundlesFolder.show()
      renderBundlesField.enable()
      transparentRenderBundlesField.enable()
    }

    if (useRenderBundles && !hasScenes) {
      const nbRegularMeshes = scenesManager.meshesDescriptors.filter(
        (meshDescriptor) => !meshDescriptor.parameters.transmissive && !meshDescriptor.parameters.transparent
      ).length

      const nbTransparentMeshes = scenesManager.meshesDescriptors.filter(
        (meshDescriptor) => !meshDescriptor.parameters.transmissive && meshDescriptor.parameters.transparent
      ).length

      const nbTransmissiveMeshes = scenesManager.meshesDescriptors.filter(
        (meshDescriptor) => meshDescriptor.parameters.transmissive
      ).length

      if (nbRegularMeshes > 0) {
        regularRenderBundle = new RenderBundle(gpuCameraRenderer, {
          label: 'glTF non transmissive opaque render bundle',
          size: nbRegularMeshes,
          useBuffer: true,
        })
      }

      if (nbTransparentMeshes > 0 && useTransparentRenderBundles) {
        transparentRenderBundle = new RenderBundle(gpuCameraRenderer, {
          label: 'glTF non transmissive transparent render bundle',
          size: nbTransparentMeshes,
          useBuffer: true,
        })
      }

      if (nbTransmissiveMeshes > 0) {
        transmissiveRenderBundle = new RenderBundle(gpuCameraRenderer, {
          label: 'glTF transmissive render bundle',
          size: nbTransmissiveMeshes,
          useBuffer: true,
        })
      }
    }

    const { center, radius } = boundingBox

    // center model
    node.position.sub(center)

    const isSponza = url && url.includes('Sponza')

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
    } else {
      camera.fov = 50
      camera.far = radius * 6
      camera.near = radius * 0.01

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius * 0.25,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 2.5),
        target: new Vec3(),
      })
    }

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      if (useRenderBundles) {
        if (parameters.transmissive) {
          parameters.renderBundle = transmissiveRenderBundle
        } else if (parameters.transparent) {
          if (transparentRenderBundle) {
            parameters.renderBundle = transparentRenderBundle
          } else {
            parameters.renderBundle = null
          }
        } else {
          parameters.renderBundle = regularRenderBundle
        }
      }

      // debug
      if (!parameters.uniforms) parameters.uniforms = {}

      parameters.uniforms = {
        ...parameters.uniforms,
        ...{
          debug: {
            visibility: ['fragment'],
            struct: {
              channel: {
                type: 'f32',
                value: debugChannel,
              },
            },
          },
        },
      }

      parameters.material.toneMapping = toneMapping
      parameters.material.shading = 'PBR'

      if (parameters.material.transmissive) {
        parameters.material.transmissiveInputToneMapping = toneMapping
      }

      if (useEnvMap) {
        parameters.material.environmentMap = environmentMap
      }

      // debug output
      const isUnlit = meshDescriptor.extensionsUsed.includes('KHR_materials_unlit')
      const hasTBN =
        meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'normalTexture') ||
        meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'clearcoatNormalTexture') ||
        meshDescriptor.extensionsUsed.includes('KHR_materials_anisotropy')

      let output = `
        if(debug.channel == 1.0) {
          ${
            parameters.geometry.getAttributeByName('uv')
              ? 'outputColor = vec4(fsInput.uv.x, fsInput.uv.y, 0.0, 1.0);'
              : 'outputColor = vec4(0.0, 0.0, 0.0, 1.0);'
          }
        } else if(debug.channel == 2.0) {
          ${
            parameters.geometry.getAttributeByName('uv1')
              ? 'outputColor = vec4(fsInput.uv.x, fsInput.uv.y, 0.0, 1.0);'
              : 'outputColor = vec4(0.0, 0.0, 0.0, 1.0);'
          }
        } else if(debug.channel == 3.0) {
          ${
            meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'normalTexture') && !isUnlit
              ? 'outputColor = vec4(normalSample.rgb, 1.0);'
              : 'outputColor = vec4(0.0, 0.0, 0.0, 1.0);'
          }
        } else if(debug.channel == 4.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(geometryNormal * 0.5 + 0.5, 1.0);'
              : 'outputColor = vec4(normal * 0.5 + 0.5, 1.0);'
          }
        } else if(debug.channel == 5.0) {
          ${hasTBN && !isUnlit ? 'outputColor = vec4(tbn[0] * 0.5 + 0.5, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 6.0) {
          ${hasTBN && !isUnlit ? 'outputColor = vec4(tbn[1] * 0.5 + 0.5, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 7.0) {
          outputColor = vec4(normal * 0.5 + 0.5, 1.0);
        } else if(debug.channel == 8.0) {
          outputColor = vec4(vec3(outputColor.a), 1.0);
        } else if(debug.channel == 9.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(occlusion), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 10.0) {
          ${!isUnlit ? 'outputColor = vec4(emissive, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 11.0) {
          outputColor = linearTosRGB_4(baseColor);
        } else if(debug.channel == 12.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(metallic), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 13.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(roughness), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 14.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(specularIntensity), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 15.0) {
          ${!isUnlit ? 'outputColor = vec4(specularColor, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 16.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(clearcoat), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 17.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(clearcoatRoughness), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 18.0) {
          ${!isUnlit ? 'outputColor = vec4(clearcoatNormal * 0.5 + 0.5, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 19.0) {
          ${!isUnlit ? 'outputColor = vec4(sheenColor, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 20.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(sheenRoughness), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 21.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(iridescence), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 22.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(vec3(iridescenceThickness / 1200.0), 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 23.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(anisotropy), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 24.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(vec2((anisotropyVector + vec2(1.0)) * 0.5), 0.0, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 25.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(diffuseTransmission), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 26.0) {
          ${!isUnlit ? 'outputColor = vec4(diffuseTransmissionColor, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 27.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(dielectricScattering.singleScattering, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 28.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(dielectricScattering.multiScattering, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 29.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(metallicScattering.singleScattering, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 30.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(metallicScattering.multiScattering, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        }
      `

      output += `
      var output: FSOutput;
      output.color = outputColor;
      return output;`

      parameters.material.fragmentOutput = {
        output,
      }
    })

    // punctual lighting
    lightVisibilities = []
    if (scenesManager.lights.length) {
      scenesManager.lights.forEach((light) => {
        lightVisibilities.push(light.visible)
        if (!usePunctualLighting) {
          light.visible = false
        }
      })
      gltfPunctualLightingFolder.open()
      usePunctualLightingField.enable()
    } else {
      gltfPunctualLightingFolder.close()
      usePunctualLightingField.disable()
    }

    // variants
    variantsFolder.children.forEach((child) => child.destroy())

    let availableVariants = []
    if (
      gltf.extensions &&
      gltf.extensions['KHR_materials_variants'] &&
      gltf.extensions['KHR_materials_variants'].variants
    ) {
      availableVariants = gltf.extensions['KHR_materials_variants'].variants.map((variant) => variant.name)
    }

    const variantsField = variantsFolder
      .add({ variants: 'Default' }, 'variants', ['Default', ...availableVariants])
      .name('Active variant')
      .onChange((value) => {
        debugField.reset()

        scenesManager.meshesDescriptors.forEach((meshDescriptor, index) => {
          const alternateMaterial = meshDescriptor.alternateMaterials.get(value)
          if (alternateMaterial) {
            meshes[index].useMaterial(alternateMaterial)
          }
        })
      })

    if (availableVariants.length) {
      variantsFolder.open()
      variantsField.enable()
    } else {
      variantsFolder.close()
      variantsField.disable()
    }

    // animations
    animationsFields = []
    availableAnimationsFolder.children.forEach((child) => child.destroy())
    if (scenesManager.animations.length) {
      animationsFolder.open()
      playAnimationsField.enable()

      const hasSkins = gltf.skins && gltf.skins.length
      if (playAnimations) {
        if (hasSkins) {
          scenesManager.animations[0].play()
        } else {
          scenesManager.animations.forEach((animation) => animation.play())
        }
      }

      scenesManager.animations.forEach((animation, id) => {
        const animationField = availableAnimationsFolder
          .add(animation, 'isPlaying')
          .name(animation.label)
          .onChange((value) => {
            if (value) {
              if (hasSkins) {
                scenesManager.animations.forEach((a, aId) => {
                  if (aId !== id) {
                    a.stop()
                  }
                })
              }

              animation.play()
            } else {
              animation.stop()
            }
          })
          .listen()

        animationsFields.push(animationField)
      })
    } else {
      animationsFolder.close()
      playAnimationsField.disable()
    }

    // cameras
    camerasFolder.children.forEach((child) => child.destroy())

    const availableCameras = {}
    availableCameras['Default camera'] = defaultCamera
    if (scenesManager.cameras.length) {
      scenesManager.cameras.forEach((gltfCamera, index) => {
        availableCameras[`Camera ${index} - ${gltfCamera.label}`] = gltfCamera
      })
    }

    const cameraField = camerasFolder
      .add({ ['camera']: 'Default camera' }, 'camera', availableCameras)
      .onChange((value) => {
        useCamera(value)
      })
      .name('Active camera')

    if (Object.keys(availableCameras).length > 1) {
      camerasFolder.open()
      cameraField.enable()
    } else {
      camerasFolder.close()
      cameraField.disable()
    }

    // scenes
    scenesFolder.children.forEach((child) => child.destroy())

    const availableScenes = []
    if (gltf.scenes) {
      gltf.scenes.forEach((scene, index) => availableScenes.push(scene.name ?? 'Scene ' + index))
      const activeScene = gltf.scene ?? 0
      const scenesField = scenesFolder
        .add({ scene: availableScenes[activeScene] }, 'scene', availableScenes)
        .onChange((value) => {
          const sceneIndex = availableScenes.findIndex((s) => s === value)
          scenesManager.meshesDescriptors.forEach((meshDescriptor, index) => {
            const mesh = meshes[index]
            if (meshDescriptor.scenes.find((s) => s.index === sceneIndex)) {
              mesh.visible = true
            } else {
              mesh.visible = false
            }
          })
        })
        .name('Active scene')

      if (gltf.scenes.length > 1) {
        scenesFolder.open()
        scenesField.enable()
      } else {
        scenesFolder.close()
        scenesField.disable()
      }
    }

    console.log(gpuCameraRenderer, meshes)

    // meshes[0].onReady(async () => {
    //   console.log('VS', await meshes[0].material.getShaderCode('vertex'))
    //   console.log('FS', await meshes[0].material.getShaderCode('fragment'))
    // })
  }

  // sky box
  const skyBoxFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    ${constants}
    ${common}
    ${toneMappingUtils}
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var uv: vec2f = fsInput.uv;
      uv.y = 1.0 - uv.y;
      
      uv = uv * 2.0 - 1.0;
      
      var position: vec4f = params.inverseViewProjectionMatrix * vec4(uv, 1.0, 1.0);
      let samplePosition: vec3f = normalize(position.xyz / position.w);
      
      var color: vec4f = select(
        textureSample(${environmentMap.specularTexture.options.name}, clampSampler, samplePosition * params.envRotation),
        textureSample(${environmentMap.diffuseTexture.options.name}, clampSampler, samplePosition * params.envRotation),
        params.useSpecular < 1
      );
      
      color = vec4(KhronosToneMapping(color.rgb), color.a);
      color = linearTosRGB_4(color);
      
      return color;
    }
  `

  const skybox = new FullscreenPlane(gpuCameraRenderer, {
    textures: [environmentMap.specularTexture, environmentMap.diffuseTexture],
    samplers: [environmentMap.sampler],
    shaders: {
      fragment: {
        code: skyBoxFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          envRotation: {
            type: 'mat3x3f',
            value: environmentMap.rotationMatrix,
          },
          inverseViewProjectionMatrix: {
            type: 'mat4x4f',
            value: new Mat4()
              .multiplyMatrices(gpuCameraRenderer.camera.projectionMatrix, gpuCameraRenderer.camera.viewMatrix)
              .invert(),
          },
          useSpecular: {
            type: 'u32',
            value: 0,
          },
        },
      },
    },
  })

  skybox.onRender(() => {
    skybox.uniforms.params.inverseViewProjectionMatrix.value
      .multiplyMatrices(gpuCameraRenderer.camera.projectionMatrix, gpuCameraRenderer.camera.viewMatrix)
      .invert()

    skybox.uniforms.params.envRotation.value = environmentMap.rotationMatrix

    // explicitly tell the uniform to update
    skybox.uniforms.params.inverseViewProjectionMatrix.shouldUpdate = true
  })

  // GUI updates

  const cleanUpScene = () => {
    // render bundles
    if (regularRenderBundle) {
      regularRenderBundle.destroy()
    }
    regularRenderBundle = null

    if (transparentRenderBundle) {
      transparentRenderBundle.destroy()
    }
    transparentRenderBundle = null

    if (transmissiveRenderBundle) {
      transmissiveRenderBundle.destroy()
    }
    transmissiveRenderBundle = null

    if (animationsFields.length) {
      animationsFields.forEach((animationField) => animationField.destroy())
    }

    // scenes manager
    if (gltfScenesManager) {
      gltfScenesManager.destroy()
    }

    gltfScenesManager = null
  }

  renderBundlesField.onChange(async (value) => {
    useRenderBundles = value

    if (!useRenderBundles) {
      transparentRenderBundlesField.disable()
    } else {
      transparentRenderBundlesField.enable()
    }

    cleanUpScene()

    await loadGLTF(currentModel)
  })

  transparentRenderBundlesField.onChange(async (value) => {
    useTransparentRenderBundles = value

    cleanUpScene()

    await loadGLTF(currentModel)
  })

  modelField.onChange(async (value) => {
    if (availableSampleModels[value].name !== currentModel.name) {
      currentModel = availableSampleModels[value]
      const variant = Object.keys(currentModel.variants).find((v) => currentModel.variants[v] === value)
      currentModel.currentVariant = variant

      await modelTypeField.options(currentModel.variants).setValue(currentModel.url)
    }
  })

  modelTypeField.onChange(async (value) => {
    currentModel.url = value

    cleanUpScene()

    useCamera(defaultCamera)

    await loadGLTF(currentModel)
  })

  envMapField.onChange(async (value) => {
    if (envMaps[value] && envMaps[value].url) {
      if (envMaps[value].name !== currentEnvMap.name) {
        currentEnvMap = envMaps[value]
        await environmentMap.loadAndComputeFromHDR(envMaps[value].url)
      }

      if (!useEnvMap) {
        useEnvMap = true
        skybox.visible = true

        envMapRotationField.enable()
        envMapDiffuseField.enable()
        envMapSpecularField.enable()

        cleanUpScene()

        await loadGLTF(currentModel)
      }
    } else if (useEnvMap) {
      useEnvMap = false
      skybox.visible = false

      envMapRotationField.disable()
      envMapDiffuseField.disable()
      envMapSpecularField.disable()

      cleanUpScene()

      await loadGLTF(currentModel)
    }
  })

  envMapRotationField.onChange((value) => {
    if (useEnvMap) {
      environmentMap.rotation = value * (Math.PI / 180)
    }
  })

  envMapDiffuseField.onChange(() => {
    if (useEnvMap && gltfScenesManager && gltfScenesManager.scenesManager) {
      gltfScenesManager.scenesManager.meshes.forEach((mesh) => {
        if (mesh.uniforms.material.envDiffuseIntensity) {
          mesh.uniforms.material.envDiffuseIntensity.value = environmentMap.options.diffuseIntensity
        }
      })
    }
  })

  envMapSpecularField.onChange(() => {
    if (useEnvMap && gltfScenesManager && gltfScenesManager.scenesManager) {
      gltfScenesManager.scenesManager.meshes.forEach((mesh) => {
        if (mesh.uniforms.material.envSpecularIntensity) {
          mesh.uniforms.material.envSpecularIntensity.value = environmentMap.options.specularIntensity
        }
      })
    }
  })

  envMapBackgroundField.onChange((value) => {
    skybox.uniforms.params.useSpecular.value = value
  })

  usePunctualLightingField.onChange((value) => {
    usePunctualLighting = value
    if (gltfScenesManager && gltfScenesManager.scenesManager) {
      gltfScenesManager.scenesManager.lights.forEach((light, index) => {
        light.visible = value ? lightVisibilities[index] : false
      })
    }
  })

  toneMappingField.onChange(async (value) => {
    if (value !== toneMapping) {
      toneMapping = value

      cleanUpScene()

      await loadGLTF(currentModel)
    }
  })

  debugField.onChange((value) => {
    debugChannel = value

    gltfScenesManager?.scenesManager?.meshes?.forEach((mesh) => {
      mesh.uniforms.debug.channel.value = value
    })
  })

  playAnimationsField.onChange((value) => {
    playAnimations = value

    gltfScenesManager?.scenesManager?.animations.forEach((animation) => {
      if (playAnimations) {
        animation.play()
        availableAnimationsFolder.children.forEach((child) => child.enable())
      } else {
        animation.pause()
        availableAnimationsFolder.children.forEach((child) => child.disable())
      }
    })
  })

  // file inputs
  // glTF
  loadGLTFInput.addEventListener('change', async () => {
    let loadedGLTFFile = null
    for (const file of loadGLTFInput.files) {
      if (file.name.includes('.gltf') || file.name.includes('.glb')) {
        loadedGLTFFile = file
      }
    }

    if (loadedGLTFFile) {
      const loadedModelName = loadedGLTFFile.name.replace('.gltf', '').replace('.glb', '')
      const loadedModelUrlName = loadedModelName + 'FromFile' //  avoid duplicate keys

      const files = Array.from(loadGLTFInput.files)
      const result = await loadGLTFFromFileInput(files)

      let data = {}
      if (result instanceof ArrayBuffer) {
        data.arrayBuffer = result
      } else {
        data.json = result
      }

      availableSampleModels = {
        ...availableSampleModels,
        [loadedModelUrlName]: {
          name: loadedModelName + ' (from files)',
          ...data,
          currentVariant: 'From File',
          variants: { 'From File': data },
        },
      }

      modelField
        .options(
          Object.keys(availableSampleModels).reduce((acc, v) => {
            return { ...acc, [availableSampleModels[v].name]: v }
          }, {})
        )
        .setValue(loadedModelUrlName)
    }
  })

  // HDR
  loadHDRInput.addEventListener('change', () => {
    let loadedHDRFile = null
    for (const file of loadHDRInput.files) {
      if (file.name.includes('.hdr')) {
        loadedHDRFile = file
      }
    }

    if (loadedHDRFile) {
      const loadedHDRBlob = URL.createObjectURL(loadedHDRFile)

      const loadedHDRName = loadedHDRFile.name.replace('.hdr', '')
      const loadedHDRUrlName = loadedHDRName + 'FromFile' //  avoid duplicate keys

      envMaps = {
        ...envMaps,
        [loadedHDRUrlName]: {
          name: loadedHDRName + ' (from files)',
          url: loadedHDRBlob,
        },
      }

      envMapField
        .options(
          Object.keys(envMaps).reduce((acc, v) => {
            return { ...acc, [envMaps[v].name]: v }
          }, {})
        )
        .setValue(loadedHDRUrlName)
    }
  })

  await loadGLTF(currentModel)
})
