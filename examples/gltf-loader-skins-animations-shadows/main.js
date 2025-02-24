import {
  GPUDeviceManager,
  GPUCameraRenderer,
  Vec2,
  EnvironmentMap,
  Object3D,
  LitMesh,
  PlaneGeometry,
  GLTFLoader,
  GLTFScenesManager,
  AmbientLight,
  DirectionalLight,
  OrbitControls,
  Vec3,
} from '../../dist/esm/index.mjs'

// glTF loader with animated skinned meshes, shadows and environment maps
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
  })

  const { camera } = gpuCameraRenderer
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

  const environmentMap = new EnvironmentMap(gpuCameraRenderer, {
    diffuseIntensity: 0.5,
    specularIntensity: 0.5,
  })
  environmentMap.loadAndComputeFromHDR(currentEnvMap.url)

  const models = {
    // skins
    fox: {
      name: 'Fox',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF/Fox.gltf',
    },
    brainStem: {
      name: 'Brain Stem',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF/BrainStem.gltf',
    },
    // morph targets
    animatedMorphCube: {
      name: 'Animated Morph Cube',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf',
    },
  }

  let shadingModel = 'PBR' // 'PBR', 'Phong' or 'Lambert'

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  const light = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(), // will be updated when model changes
    intensity: 2,
    shadow: {
      depthTextureSize: new Vec2(1024),
      pcfSamples: 3,
      bias: 0.001,
    },
  })

  // floor
  const floor = new LitMesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    frustumCulling: false, // always draw the floor
    receiveShadows: true,
    cullMode: 'none',
    material: {
      shading: 'Lambert',
      fragmentChunks: {
        additionalHead: `
    // ported from https://github.com/toji/pristine-grid-webgpu
    // grid function from Best Darn Grid article
    fn PristineGrid(uv: vec2f, lineWidth: vec2f) -> f32 {
      let uvDDXY = vec4f(dpdx(uv), dpdy(uv));
      let uvDeriv = vec2f(length(uvDDXY.xz), length(uvDDXY.yw));
      let invertLine: vec2<bool> = lineWidth > vec2f(0.5);
      let targetWidth: vec2f = select(lineWidth, 1 - lineWidth, invertLine);
      let drawWidth: vec2f = clamp(targetWidth, uvDeriv, vec2f(0.5));
      let lineAA: vec2f = uvDeriv * 1.5;
      var gridUV: vec2f = abs(fract(uv) * 2.0 - 1.0);
      gridUV = select(1 - gridUV, gridUV, invertLine);
      var grid2: vec2f = smoothstep(drawWidth + lineAA, drawWidth - lineAA, gridUV);
      grid2 *= saturate(targetWidth / drawWidth);
      grid2 = mix(grid2, targetWidth, saturate(uvDeriv * 2.0 - 1.0));
      grid2 = select(grid2, 1.0 - grid2, invertLine);
      return mix(grid2.x, 1.0, grid2.y);
    }
        `,
        preliminaryContribution: `
        let pristineGrid = PristineGrid(fsInput.uv * grid.scale, grid.lineWidth);

      // lerp between base and line color
      var color: vec3f = mix(grid.baseColor, grid.lineColor, pristineGrid * grid.lineAlpha);
      outputColor = vec4(color, outputColor.a);
        `,
      },
    },
    uniforms: {
      grid: {
        struct: {
          scale: {
            type: 'vec2f',
            value: new Vec2(200),
          },
          baseColor: {
            type: 'vec3f',
            value: new Vec3(0.25),
          },
          lineColor: {
            type: 'vec3f',
            value: new Vec3(1),
          },
          lineWidth: {
            type: 'vec2f',
            value: new Vec2(0.02),
          },
          lineAlpha: {
            type: 'f32',
            value: 1,
          },
        },
      },
    },
  })

  const floorPivot = new Object3D()
  floorPivot.parent = gpuCameraRenderer.scene

  //floor.position.y = -1.5
  floor.rotation.x = -Math.PI / 2
  floor.scale.x = 50
  floor.scale.y = 50
  floor.parent = floorPivot

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  const currentModelKey = 'fox'
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
      Object.keys(envMaps).reduce((acc, v) => {
        return { ...acc, [envMaps[v].name]: v }
      }, {})
    )
    .name('Environment maps')

  const shadingField = gui.add({ shadingModel }, 'shadingModel', ['PBR', 'Phong', 'Lambert']).name('Shading')

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
    const { boundingBox, node } = scenesManager
    container.classList.remove('loading')

    const { center, radius, size } = boundingBox

    // center model
    node.position.sub(center)

    camera.far = radius * 200
    camera.near = radius * 0.1

    orbitControls.reset({
      zoomSpeed: radius * 0.25,
      minZoom: radius,
      maxZoom: radius * 20,
      position: new Vec3(radius * 0.5, radius * 0.5, radius * 2.5),
      target: new Vec3(),
    })

    light.position.set(radius * 2)
    light.target.y = radius * 0.5
    light.shadow.bias = radius * 0.00002
    light.shadow.camera.near = radius * 0.5
    light.shadow.camera.far = radius * 8
    light.shadow.camera.top = radius * 2
    light.shadow.camera.right = radius * 2
    light.shadow.camera.bottom = radius * -2
    light.shadow.camera.left = radius * -2

    floorPivot.position.y = -size.y * 0.5
    floor.scale.x = radius * 50
    floor.scale.y = radius * 50

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      // shadows
      parameters.castShadows = true
      parameters.receiveShadows = true

      parameters.material.shading = shadingModel
      parameters.material.environmentMap = environmentMap
    })

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
  }

  // GUI updates

  modelField
    .onChange(async (value) => {
      if (models[value].name !== currentModel.name) {
        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        gltfScenesManager = null

        if (animationsFields.length) {
          animationsFields.forEach((animationField) => animationField.destroy())
        }

        animationsFields = []

        currentModel = models[value]
        await loadGLTF(currentModel.url)
      }
    })
    .name('Models')

  envMapField
    .onChange(async (value) => {
      if (envMaps[value].name !== currentEnvMap.name) {
        currentEnvMap = envMaps[value]
        await environmentMap.loadAndComputeFromHDR(envMaps[value].url)
      }
    })
    .name('Environment maps')

  shadingField
    .onChange(async (value) => {
      if (value !== shadingModel) {
        shadingModel = value

        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        gltfScenesManager = null

        if (animationsFields.length) {
          animationsFields.forEach((animationField) => animationField.destroy())
        }

        animationsFields = []

        await loadGLTF(currentModel.url)
      }
    })
    .name('Shading')

  await loadGLTF(currentModel.url)
})
