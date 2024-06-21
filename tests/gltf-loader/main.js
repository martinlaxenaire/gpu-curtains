// Goals of this test:
// - test various capacities of the gltf loader
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    Texture,
    computeDiffuseFromSpecular,
    HDRLoader,
    Sampler,
    GLTFLoader,
    GLTFScenesManager,
    buildShaders,
    buildPBRShaders,
    buildIBLShaders,
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
  const orbitControls = new OrbitControls(gpuCameraRenderer)

  // IBL textures
  const loadImageBitmap = async (src) => {
    const response = await fetch(src)
    return createImageBitmap(await response.blob())
  }

  const iblLUTBitmap = await loadImageBitmap('./assets/lut.png')
  // const envDiffuseBitmap = await loadImageBitmap('./assets/royal_esplanade_1k-diffuse-RGBM.png')
  // const envSpecularBitmap = await loadImageBitmap('./assets/royal_esplanade_1k-specular-RGBM.png')

  const iblLUTTexture = new Texture(gpuCameraRenderer, {
    name: 'iblLUTTexture',
    visibility: ['fragment'],
    format: 'rgba32float',
    //generateMips: true,
    fixedSize: {
      width: iblLUTBitmap.width,
      height: iblLUTBitmap.height,
    },
    flipY: true, // from a WebGL texture!
    autoDestroy: false, // keep alive when changing glTF
  })

  iblLUTTexture.uploadSource({
    source: iblLUTBitmap,
  })

  const hdrLoader = new HDRLoader()
  const specularHDR = await hdrLoader.loadFromUrl('./assets/cannon_1k.hdr')

  // TODO use a compute pass?
  const specFaceData = hdrLoader.equirectangularToCubeMap(specularHDR)

  const envSpecularTexture = new Texture(gpuCameraRenderer, {
    label: 'Environment specular texture',
    name: 'envSpecularTexture',
    visibility: ['fragment', 'compute'],
    format: 'rgba32float',
    generateMips: true,
    viewDimension: 'cube',
    fixedSize: {
      width: specFaceData[0].width,
      height: specFaceData[0].height,
    },
    autoDestroy: false, // keep alive when changing glTF
  })

  for (let i = 0; i < specFaceData.length; i++) {
    envSpecularTexture.uploadData({
      data: specFaceData[i].data,
      origin: [0, 0, i],
      depth: 1, // explicitly set the depth to 1
    })
  }

  // diffuse cube map computed from the specular cube map in a compute shader
  const envDiffuseTexture = new Texture(gpuCameraRenderer, {
    label: 'Environment diffuse texture',
    name: 'envDiffuseTexture',
    visibility: ['fragment'],
    format: 'rgba32float',
    viewDimension: 'cube',
    fixedSize: {
      width: specFaceData[0].width,
      height: specFaceData[0].height,
    },
    autoDestroy: false, // keep alive when changing glTF
  })

  // compute diffuse texture
  await computeDiffuseFromSpecular(gpuCameraRenderer, envDiffuseTexture, envSpecularTexture)

  // finally we will need a clamp-to-edge sampler for those textures
  const clampSampler = new Sampler(gpuCameraRenderer, {
    label: 'Clamp sampler',
    name: 'clampSampler',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
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
  }

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

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // add clamp sampler
      parameters.samplers = [...parameters.samplers, clampSampler]

      // add IBL textures
      // const iblLUTTexture = new Texture(gpuCameraRenderer, {
      //   name: 'iblLUTTexture',
      //   visibility: ['fragment'],
      //   fromTexture: originalIblLUTTexture,
      // })
      //
      // const envDiffuseTexture = new Texture(gpuCameraRenderer, {
      //   name: 'envDiffuseTexture',
      //   visibility: ['fragment'],
      //   fromTexture: originalEnvDiffuseTexture,
      // })
      //
      // const envSpecularTexture = new Texture(gpuCameraRenderer, {
      //   name: 'envSpecularTexture',
      //   visibility: ['fragment'],
      //   fromTexture: originalEnvSpecularTexture,
      // })

      // disable frustum culling
      parameters.frustumCulling = false

      const lightPosition = new Vec3(radius * 2, radius * 2, radius)
      const lightPositionLengthSq = lightPosition.lengthSq()
      const lightPositionLength = lightPosition.length()

      // add lights
      parameters.uniforms = {
        ...parameters.uniforms,
        ...{
          ambientLight: {
            struct: {
              intensity: {
                type: 'f32',
                value: 0.03,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
            },
          },
          pointLight: {
            struct: {
              position: {
                type: 'vec3f',
                value: lightPosition,
              },
              range: {
                type: 'f32',
                value: lightPositionLength * 2,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
              intensity: {
                type: 'f32',
                value: lightPositionLengthSq * 2,
              },
            },
          },
        },
      }

      // now the shaders
      const additionalFragmentHead = /* wgsl */ `
      fn rangeAttenuation(range: f32, distance: f32) -> f32 {
        if (range <= 0.0) {
            // Negative range means no cutoff
            return 1.0 / pow(distance, 2.0);
        }
        return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
      }
      `

      const ambientContribution = /* wgsl */ `
      lightContribution.ambient = ambientLight.intensity * ambientLight.color;
      `

      const lightContribution = /* wgsl */ `
      let L = normalize(pointLight.position - worldPosition);
      let H = normalize(V + L);
      
      let NdotL: f32 = clamp(dot(N, L), 0.001, 1.0);
      let NdotH: f32 = clamp(dot(N, H), 0.0, 1.0);
      let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);
    
      // cook-torrance brdf
      let NDF = DistributionGGX(NdotH, roughness);
      let G = GeometrySmith(NdotL, NdotV, roughness);
      let F = FresnelSchlick(VdotH, f0);
    
      let kD = (vec3(1.0) - F) * (1.0 - metallic);
    
      let numerator = NDF * G * F;
      let denominator = max(4.0 * NdotV * NdotL, 0.001);
      //let denominator = 4.0 * NdotV * NdotL + 0.0001;
      let specular = numerator / vec3(denominator);
      
      // add lights spec to alpha for reflections on transparent surfaces (glass)
      color.a = max(color.a, max(max(specular.r, specular.g), specular.b));
              
      let distance = length(pointLight.position - worldPosition);
      let attenuation = rangeAttenuation(pointLight.range, distance);
      
      let radiance = pointLight.color * pointLight.intensity * attenuation;
      
      lightContribution.diffuse += (kD / vec3(PI)) * radiance * NdotL;
      lightContribution.specular += specular * radiance * NdotL;
      `

      const additionalColorContribution = `
        //color = vec4(vec3(occlusion), color.a);
      `

      //parameters.shaders = buildShaders(meshDescriptor)

      // parameters.shaders = buildPBRShaders(meshDescriptor, {
      //   chunks: { additionalFragmentHead, ambientContribution, lightContribution },
      // })

      parameters.shaders = buildIBLShaders(meshDescriptor, {
        iblParameters: {
          diffuseStrength: 1,
          specularStrength: 1,
          lutTexture: {
            texture: iblLUTTexture,
            samplerName: 'clampSampler', // use clamp sampler
          },
          envDiffuseTexture: {
            texture: envDiffuseTexture,
            // use clamp sampler for cube maps, default for equirectangular maps
            samplerName: envDiffuseTexture.options.viewDimension === 'cube' ? 'clampSampler' : 'defaultSampler',
          },
          envSpecularTexture: {
            texture: envSpecularTexture,
            // use clamp sampler for cube maps, default for equirectangular maps
            samplerName: envSpecularTexture.options.viewDimension === 'cube' ? 'clampSampler' : 'defaultSampler',
          },
        },
        chunks: {
          additionalFragmentHead,
          // ambientContribution,
          lightContribution,
          additionalColorContribution,
        },
      })
    })

    console.log(gpuCameraRenderer, meshes)
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
