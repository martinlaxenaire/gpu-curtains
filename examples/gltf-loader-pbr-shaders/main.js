import {
  GPUDeviceManager,
  GPUCameraRenderer,
  GLTFLoader,
  GLTFScenesManager,
  buildPBRShaders,
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
    const { boundingBox, node } = scenesManager
    container.classList.remove('loading')

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

    gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      const lightPosition = new Vec3(radius * 4)
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
                value: lightPositionLength * 4,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
              intensity: {
                type: 'f32',
                value: lightPositionLengthSq * 4,
              },
            },
          },
        },
      }

      // PBR shaders
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
        // N, V and NdotV are already defined as
        // let N = normalize(normal);
        // let V = normalize(fsInput.viewDirection);
        // let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
        let L: vec3f = normalize(pointLight.position - worldPosition);
        let H: vec3f = normalize(V + L);
        
        let NdotL: f32 = clamp(dot(N, L), 0.0, 1.0);
        let NdotH: f32 = clamp(dot(N, H), 0.0, 1.0);
        let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);
      
        // cook-torrance brdf
        let NDF: f32 = DistributionGGX(NdotH, roughness);
        let G: f32 = GeometrySmith(NdotL, NdotV, roughness);
        let F: vec3f = FresnelSchlick(VdotH, f0);
      
        let kD: vec3f = (vec3(1.0) - F) * (1.0 - metallic);
      
        let numerator: vec3f = NDF * G * F;
        let denominator: f32 = max(4.0 * NdotV * NdotL, 0.001);
        let specular: vec3f = numerator / vec3(denominator);
      
        // add lights spec to alpha for reflections on transparent surfaces (glass)
        color.a = max(color.a, max(max(specular.r, specular.g), specular.b));
        
        // if we were using directional lights
        // they would not have any attenuation
        //let attenuation = 1.0;
                
        let distance: f32 = length(pointLight.position - worldPosition);
        let attenuation: f32 = rangeAttenuation(pointLight.range, distance);
        
        let radiance: vec3f = pointLight.color * pointLight.intensity * attenuation;
      
        lightContribution.diffuse += (kD / vec3(PI)) * radiance * NdotL;
        lightContribution.specular += specular * radiance * NdotL;
      `

      parameters.shaders = buildPBRShaders(meshDescriptor, {
        chunks: { additionalFragmentHead, ambientContribution, lightContribution },
      })
    })
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
