// Goals of this test:
// - test various capacities of the gltf loader
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    EnvironmentMap,
    GLTFLoader,
    GLTFScenesManager,
    buildShaders,
    AmbientLight,
    PointLight,
    DirectionalLight,
    OrbitControls,
    Vec3,
    RenderBundle,
  } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  gpuDeviceManager
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

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
  let useEnvMap = true

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
    // transparency
    alphaBlendModeTest: {
      name: 'Alpha Blend Mode Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AlphaBlendModeTest/glTF/AlphaBlendModeTest.gltf',
    },
    // base color
    compareBaseColor: {
      name: 'Compare Base Color',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareBaseColor/glTF/CompareBaseColor.gltf',
    },
    // occlusion
    compareAmbientOcclusion: {
      name: 'Compare Ambient Occlusion',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareAmbientOcclusion/glTF/CompareAmbientOcclusion.gltf',
    },
    // normal texture
    compareNormal: {
      name: 'Compare Normal',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareNormal/glTF/CompareNormal.gltf',
    },
    // sparse accessors
    simpleSparseAccessor: {
      name: 'Simple Sparse Accessor',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleSparseAccessor/glTF/SimpleSparseAccessor.gltf',
    },
    simpleInstancing: {
      name: 'Simple Instancing',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleInstancing/glTF/SimpleInstancing.gltf',
    },
    // interleaved data
    boxInterleaved: {
      name: 'Box Interleaved',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BoxInterleaved/glTF/BoxInterleaved.gltf',
    },
    // texture encoding
    textureEncodingTest: {
      name: 'Texture Encoding Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/TextureEncodingTest/glTF/TextureEncodingTest.gltf',
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
    // morph targets
    animatedMorphCube: {
      name: 'Animated Morph Cube',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf',
    },
    morphsPrimitivesTest: {
      name: 'Morphs Primitives Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf',
    },
    // skins
    simpleSkin: {
      name: 'Simple Skin',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleSkin/glTF/SimpleSkin.gltf',
    },
    riggedSimple: {
      name: 'Rigged Simple',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedSimple/glTF/RiggedSimple.gltf',
    },
    fox: {
      name: 'Fox',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF/Fox.gltf',
    },
    brainStem: {
      name: 'Brain Stem',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF/BrainStem.gltf',
    },
    skinD: {
      name: 'SkinD',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Asset-Generator/main/Output/Positive/Animation_Skin/Animation_Skin_11.gltf',
    },
    // transmission, volume & dispersion
    transmissionTest: {
      name: 'Transmission Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/TransmissionTest/glTF/TransmissionTest.gltf',
    },
    compareVolume: {
      name: 'Compare Volume',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareVolume/glTF/CompareVolume.gltf',
    },
    dispersionTest: {
      name: 'Dispersion Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DispersionTest/glTF/DispersionTest.gltf',
    },
    attenuationTest: {
      name: 'Attenuation Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AttenuationTest/glTF/AttenuationTest.gltf',
    },
    // specular
    compareSpecular: {
      name: 'Compare Specular',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareSpecular/glTF/CompareSpecular.gltf',
    },
    // unlit
    unlitTest: {
      name: 'Unlit Test',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/UnlitTest/glTF/UnlitTest.gltf',
    },
    // emissive strength
    compareEmissiveStrength: {
      name: 'Compare Emissive Strength',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareEmissiveStrength/glTF/CompareEmissiveStrength.gltf',
    },
    // materials variants
    materialsVariantsShoe: {
      name: 'Materials Variants Shoe',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF/MaterialsVariantsShoe.gltf',
    },
    dragonAttenuation: {
      name: 'Dragon Attenuation',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DragonAttenuation/glTF/DragonAttenuation.gltf',
    },
    // lights
    directionalLight: {
      name: 'Directional Light',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DirectionalLight/glTF/DirectionalLight.gltf',
    },
    lightsPunctualLamp: {
      name: 'Lights Punctual Lamp',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/LightsPunctualLamp/glTF/LightsPunctualLamp.gltf',
    },
    // texture transform
    sheenWoodLeatherSofa: {
      name: 'Sheen Wood Leather Sofa',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenWoodLeatherSofa/glTF/SheenWoodLeatherSofa.gltf',
    },
  }

  let shadingModel = 'PBR' // 'PBR', 'Phong' or 'Lambert'
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

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  // render bundles
  let useRenderBundles = true
  let regularRenderBundle = null
  let transparentRenderBundle = null
  let transmissiveRenderBundle = null

  const renderBundlesField = gui.add({ useRenderBundles }, 'useRenderBundles').name('Use render bundles')

  const currentModelKey = 'damagedHelmet'
  let currentModel = models[currentModelKey]

  const modelField = gui
    .add(
      { [currentModel.name]: currentModelKey },
      currentModel.name,
      Object.keys(models).reduce((acc, v) => {
        return { ...acc, [models[v].name]: v }
      }, {})
    )
    .name('Models')

  const envMapField = gui
    .add(
      { [currentEnvMap.name]: currentEnvMapKey },
      currentEnvMap.name,
      Object.keys(envMaps).reduce(
        (acc, v) => {
          return { ...acc, [envMaps[v].name]: v }
        },
        { None: null }
      )
    )
    .name('Environment maps')

  const shadingField = gui.add({ shadingModel }, 'shadingModel', ['PBR', 'Phong', 'Lambert', 'Unlit']).name('Shading')

  const debugChannels = [
    'None',
    'Texture Coordinates 0',
    'Texture Coordinates 1',
    'Normal texture',
    'Geometry Normal',
    'Geometry Tangent',
    'Geometry Bitangent',
    'Shading Normal',
    'Occlusion',
    'Emissive',
    'Base Color',
    'Metallic',
    'Roughness',
    'Specular Intensity',
    'Specular Color',
  ]

  const defaultDebugChannel = 0

  const debugField = gui
    .add(
      { ['None']: defaultDebugChannel },
      'None',
      debugChannels.reduce((acc, v, index) => {
        return { ...acc, [debugChannels[index]]: index }
      }, {})
    )
    .name('Debug channels')

  const camerasFolder = gui.addFolder('Cameras')

  const useCamera = (camera) => {
    gpuCameraRenderer.useCamera(camera)
    orbitControls.useCamera(camera)
  }

  let variantsFolder = gui.addFolder('Variants')

  const animationsFolder = gui.addFolder('Animations')

  let animationsFields = []

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

    if (useRenderBundles) {
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

      if (nbTransparentMeshes > 0) {
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

    const isSponza = url.includes('Sponza')
    const isTransmissionTest = url.includes('TransmissionTest')

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
    } else if (isTransmissionTest) {
      camera.fov = 50
      camera.far = radius * 6
      camera.near = radius * 0.01

      orbitControls.reset({
        zoomSpeed: radius * 0.15,
        minZoom: radius * 0.25,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 0.75),
        target: new Vec3(),
      })
    } else {
      camera.fov = 50
      camera.far = radius * 6
      camera.near = radius * 0.01

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius * 0.5,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 2.5),
        target: new Vec3(),
      })
    }

    light.position.set(radius * 2, radius * 2, radius * 4)

    if (useEnvMap && shadingModel === 'PBR') {
      ambientLight.intensity = 0
      light.intensity = 0
    } else {
      ambientLight.intensity = 0.2

      if (scenesManager.lights.length) {
        // already lit by the scenes manager lights
        light.intensity = 0
      } else {
        if (light instanceof PointLight) {
          const lightPositionLengthSq = light.position.lengthSq()
          light.intensity = lightPositionLengthSq * 6
        } else {
          light.intensity = 3
        }
      }
    }

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      if (useRenderBundles) {
        if (parameters.transmissive) {
          parameters.renderBundle = transmissiveRenderBundle
        } else if (parameters.transparent) {
          parameters.renderBundle = transparentRenderBundle
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
                value: defaultDebugChannel,
              },
            },
          },
        },
      }

      const isUnlit = shadingModel === 'Unlit' || meshDescriptor.extensionsUsed.includes('KHR_materials_unlit')

      // debug
      const additionalContribution = `
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
              ? 'outputColor = vec4(normalMap, 1.0);'
              : 'outputColor = vec4(0.0, 0.0, 0.0, 1.0);'
          }
        } else if(debug.channel == 4.0) {
          ${
            !isUnlit
              ? 'outputColor = vec4(geometryNormal * 0.5 + 0.5, 1.0);'
              : 'outputColor = vec4(normal * 0.5 + 0.5, 1.0);'
          }
        } else if(debug.channel == 5.0) {
          ${
            parameters.geometry.getAttributeByName('tangent') ||
            (meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'normalTexture') && !isUnlit)
              ? 'outputColor = vec4(tangent * 0.5 + 0.5, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 6.0) {
          ${
            parameters.geometry.getAttributeByName('tangent') ||
            (meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'normalTexture') && !isUnlit)
              ? 'outputColor = vec4(bitangent * 0.5 + 0.5, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 7.0) {
          outputColor = vec4(normal * 0.5 + 0.5, 1.0);
        } else if(debug.channel == 8.0) {
          ${!isUnlit ? 'outputColor = vec4(vec3(occlusion), 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 9.0) {
          ${!isUnlit ? 'outputColor = vec4(emissive, 1.0);' : 'outputColor = vec4(vec3(0.0), 1.0);'}
        } else if(debug.channel == 10.0) {
          outputColor = baseColor;
        } else if(debug.channel == 11.0) {
          ${
            !isUnlit && shadingModel !== 'Lambert'
              ? 'outputColor = vec4(vec3(metallic), 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 12.0) {
          ${
            !isUnlit && shadingModel !== 'Lambert'
              ? 'outputColor = vec4(vec3(roughness), 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 13.0) {
          ${
            !isUnlit && shadingModel !== 'Lambert'
              ? 'outputColor = vec4(vec3(specularIntensity), 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        } else if(debug.channel == 14.0) {
          ${
            !isUnlit && shadingModel !== 'Lambert'
              ? 'outputColor = vec4(specularColor, 1.0);'
              : 'outputColor = vec4(vec3(0.0), 1.0);'
          }
        }
      `

      parameters.shaders = buildShaders(meshDescriptor, {
        shadingModel,
        fragmentChunks: {
          additionalContribution,
        },
        ...(useEnvMap && { environmentMap }),
      })
    })

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

    variantsFolder
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

    // animations
    if (scenesManager.animations.length) {
      const hasSkins = gltf.skins && gltf.skins.length
      if (hasSkins) {
        scenesManager.animations[0].play()
      } else {
        scenesManager.animations.forEach((animation) => animation.play())
      }

      scenesManager.animations.forEach((animation, id) => {
        const animationField = animationsFolder
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
    }

    // cameras
    camerasFolder.children.forEach((child) => child.destroy())

    const availableCameras = {}
    availableCameras['Default camera'] = defaultCamera
    if (scenesManager.cameras.length) {
      scenesManager.cameras.forEach((gltfCamera, index) => {
        availableCameras['Camera ' + index] = gltfCamera
      })
    }

    camerasFolder
      .add({ ['camera']: 'Default camera' }, 'camera', availableCameras)
      .onChange((value) => {
        useCamera(value)
      })
      .name('Active camera')

    console.log(gpuCameraRenderer, meshes)

    // meshes[0].onReady(() => console.log(meshes[0].material.getShaderCode('fragment')))
  }

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

    // scenes manager
    if (gltfScenesManager) {
      gltfScenesManager.destroy()
    }

    gltfScenesManager = null
  }

  renderBundlesField.onChange(async (value) => {
    useRenderBundles = value

    cleanUpScene()

    await loadGLTF(currentModel.url)
  })

  modelField
    .onChange(async (value) => {
      if (models[value].name !== currentModel.name) {
        cleanUpScene()

        if (animationsFields.length) {
          animationsFields.forEach((animationField) => animationField.destroy())
        }

        animationsFields = []

        currentModel = models[value]

        useCamera(defaultCamera)

        await loadGLTF(currentModel.url)
      }
    })
    .name('Models')

  envMapField
    .onChange(async (value) => {
      if (envMaps[value]) {
        if (envMaps[value].name !== currentEnvMap.name) {
          currentEnvMap = envMaps[value]
          await environmentMap.loadAndComputeFromHDR(envMaps[value].url)
        }

        if (!useEnvMap) {
          useEnvMap = true

          cleanUpScene()

          await loadGLTF(currentModel.url)
        }
      } else if (useEnvMap) {
        useEnvMap = false

        cleanUpScene()

        await loadGLTF(currentModel.url)
      }
    })
    .name('Environment maps')

  shadingField
    .onChange(async (value) => {
      if (value !== shadingModel) {
        shadingModel = value

        cleanUpScene()

        await loadGLTF(currentModel.url)
      }
    })
    .name('Shading')

  debugField.onChange((value) => {
    gltfScenesManager?.scenesManager?.meshes?.forEach((mesh) => {
      mesh.uniforms.debug.channel.value = value
    })
  })

  await loadGLTF(currentModel.url)
})
