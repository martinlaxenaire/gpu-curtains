import {
  GPUDeviceManager,
  GPUCameraRenderer,
  EnvironmentMap,
  AmbientLight,
  PointLight,
  GLTFLoader,
  GLTFScenesManager,
  OrbitControls,
  Vec3,
  Mat4,
  constants,
  common,
  toneMappingUtils,
  FullscreenPlane,
} from '../../dist/esm/index.mjs'

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
      near: 0.01,
      far: 2000,
    },
    context: {
      format: 'rgba16float', // allow HDR output for specular skybox
      toneMapping: { mode: 'extended' },
    },
  })

  const { camera } = gpuCameraRenderer
  const orbitControls = new OrbitControls({
    camera,
    element: container,
  })

  // LIGHTS
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1, // will be updated
  })

  const pointLight = new PointLight(gpuCameraRenderer, {
    position: new Vec3(), // will be updated when model changes
    intensity: 1, // will be updated when model changes
    range: -1,
  })

  // environment maps
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
  environmentMap.loadAndComputeFromHDR(currentEnvMap.url)

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
    dragonAttenuation: {
      name: 'Dragon Attenuation',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DragonAttenuation/glTF/DragonAttenuation.gltf',
    },
    optimizedSponza: {
      name: 'Sponza (optimized / interleaved)',
      url: 'https://raw.githubusercontent.com/toji/sponza-optimized/main/Sponza.gltf',
    },
  }

  let shadingModel = 'PBR' // 'PBR', 'Phong' or 'Lambert'

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

    const isSponza = url.includes('Sponza')

    if (isSponza) {
      node.position.y = 0
      camera.fov = 75

      orbitControls.reset({
        zoomSpeed: radius * 0.025,
        minZoom: 0,
        maxZoom: radius * 2,
        position: new Vec3(radius * 0.25, center.y * 0.25, 0),
        target: new Vec3(0, center.y * 0.1, 0),
      })
    } else {
      camera.fov = 50

      orbitControls.reset({
        zoomSpeed: radius * 0.25,
        minZoom: radius,
        maxZoom: radius * 4,
        position: new Vec3(0, 0, radius * 2.5),
        target: new Vec3(),
      })
    }

    camera.far = radius * 6

    gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      pointLight.position.set(radius * 2)

      if (shadingModel === 'PBR') {
        ambientLight.intensity = 0
        pointLight.intensity = 0
      } else {
        ambientLight.intensity = 0.1

        const lightPositionLengthSq = pointLight.position.lengthSq()
        pointLight.intensity = lightPositionLengthSq * 3
      }

      parameters.material.shading = shadingModel
      parameters.material.environmentMap = environmentMap
    })
  }

  // SKYBOX
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

  gui
    .add(
      { [currentEnvMap.name]: currentEnvMapKey },
      currentEnvMap.name,
      Object.keys(envMaps).reduce((acc, v) => {
        return { ...acc, [envMaps[v].name]: v }
      }, {})
    )
    .onChange(async (value) => {
      if (envMaps[value].name !== currentEnvMap.name) {
        currentEnvMap = envMaps[value]
        await environmentMap.loadAndComputeFromHDR(envMaps[value].url)
      }
    })
    .name('Environment maps')

  const envMapBackgroundField = gui
    .add({ background: 0 }, 'background', { Diffuse: 0, Specular: 1 })
    .name('Skybox background')
    .onChange((value) => {
      skybox.uniforms.params.useSpecular.value = value
    })

  gui
    .add({ shadingModel }, 'shadingModel', ['PBR', 'Phong', 'Lambert'])
    .onChange(async (value) => {
      if (value !== shadingModel) {
        shadingModel = value

        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        gltfScenesManager = null

        await loadGLTF(currentModel.url)
      }
    })
    .name('Shading')

  await loadGLTF(currentModel.url)
})
