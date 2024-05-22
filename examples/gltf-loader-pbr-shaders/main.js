import {
  GPUDeviceManager,
  GPUCameraRenderer,
  GLTFLoader,
  GLTFScenesManager,
  buildShaders,
  OrbitControls,
  Vec3,
} from '../../dist/esm/index.mjs'

// Basic glTF loader with PBR shaders
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
  })

  const { camera } = gpuCameraRenderer
  const orbitControls = new OrbitControls(gpuCameraRenderer)

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
    const { scenes, boundingBox } = scenesManager
    container.classList.remove('loading')
    console.log({ gltf, scenesManager, scenes, boundingBox })

    const { center, radius } = boundingBox

    // reset orbit controls
    orbitControls.reset()

    if (url.includes('Sponza')) {
      camera.position.y = center.y * 0.25
      camera.position.z = radius * 0.225
      camera.fov = 75

      orbitControls.zoomStep = radius * 0.00025
      orbitControls.minZoom = radius * -0.225
    } else {
      camera.position.y = center.y
      camera.position.z = radius * 2.5
      camera.fov = 50

      orbitControls.zoomStep = radius * 0.0025
      orbitControls.minZoom = radius * -1
    }

    orbitControls.maxZoom = radius * 2
    camera.far = radius * 6

    camera.updateWorldMatrix()

    gltfScenesManager.addMeshes({
      patchMeshParameters: (parameters) => {
        // disable frustum culling
        parameters.frustumCulled = false

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
                  value: 0.1,
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
                  value: lightPositionLength * 1.25,
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
      },
      setCustomMeshShaders: (meshDescriptor) => {
        const ambientContribution = /* wgsl */ `
        ambientContribution = ambientLight.intensity * ambientLight.color;
        `

        const lightContribution = /* wgsl */ `
        let N = normalize(normal);
        let V = normalize(fsInput.viewDirection);
        let L = normalize(pointLight.position - fsInput.worldPosition);
        let H = normalize(V + L);
      
        // cook-torrance brdf
        let NDF = DistributionGGX(N, H, roughness);
        let G = GeometrySmith(N, V, L, roughness);
        let F = FresnelSchlick(max(dot(H, V), 0.0), f0);
      
        let kD = (vec3(1.0) - F) * (1.0 - metallic);
      
        let NdotL = max(dot(N, L), 0.0);
      
        let numerator = NDF * G * F;
        let denominator = max(4.0 * max(dot(N, V), 0.0) * NdotL, 0.001);
        //let denominator = 4.0 * max(dot(N, V), 0.0) * NdotL + 0.0001;
        let specular = numerator / vec3(denominator);
      
        
        // directional lights do not have attenuation
        //let attenuation = 1.0;
                
        let distance = length(pointLight.position - fsInput.worldPosition);
        let attenuation = rangeAttenuation(pointLight.range, distance);
        
        let radiance = pointLight.color * pointLight.intensity * attenuation;
        lightContribution = (kD * color.rgb / vec3(PI) + specular) * radiance * NdotL;
        `
        return buildShaders(meshDescriptor, { ambientContribution, lightContribution })
      },
    })

    console.log(gpuCameraRenderer)
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
