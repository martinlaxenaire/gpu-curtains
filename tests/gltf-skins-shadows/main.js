// Goals of this test:
// - test various capacities of the gltf loader (skinning, animation, instancing) with shadow maps
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    Vec2,
    EnvironmentMap,
    Object3D,
    Mesh,
    LitMesh,
    PlaneGeometry,
    BoxGeometry,
    GLTFLoader,
    GLTFScenesManager,
    AmbientLight,
    DirectionalLight,
    PointLight,
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
      near: 0.1,
      far: 2000,
    },
    lights: {
      // we might overflow the vertex shaders max storages capacity with skinning or morphing
      useUniformsForShadows: gpuDeviceManager.device.limits.maxStorageBuffersPerShaderStage < 10,
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
    diffuseIntensity: 0.25,
    specularIntensity: 0.25,
  })
  environmentMap.loadAndComputeFromHDR(currentEnvMap.url)

  const models = {
    // morph targets
    animatedMorphCube: {
      name: 'Animated Morph Cube',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf',
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
    simpleInstancing: {
      name: 'Simple Instancing',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SimpleInstancing/glTF/SimpleInstancing.gltf',
    },
  }

  let shadingModel = 'PBR' // 'PBR', 'Phong' or 'Lambert'

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  const usePointLight = false

  let light
  if (!usePointLight) {
    light = new DirectionalLight(gpuCameraRenderer, {
      position: new Vec3(), // will be updated when model changes
      intensity: 2,
      shadow: {
        depthTextureSize: new Vec2(1024),
        pcfSamples: 3,
        bias: 0.0001, // will be updated when model changes
      },
    })
  } else {
    light = new PointLight(gpuCameraRenderer, {
      position: new Vec3(), // will be updated when model changes
      intensity: 2,
      shadow: {
        depthTextureSize: new Vec2(1024),
        pcfSamples: 3,
        bias: 0.0001, // will be updated when model changes
      },
    })
  }

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

  // bounding box
  const bboxFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return vec4(vec3(1.0, 0.0, 0.0), 0.1);
    }
  `

  const bboxHelper = new Mesh(gpuCameraRenderer, {
    label: 'BBox debug',
    transparent: true,
    geometry: new BoxGeometry(),
    visible: false,
    shaders: {
      fragment: {
        code: bboxFs,
      },
    },
  })

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  const currentModelKey = 'skinD'
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

  const shadingField = gui.add({ shadingModel }, 'shadingModel', ['PBR', 'Phong', 'Lambert', 'Unlit']).name('Shading')

  gui.add(bboxHelper, 'visible').name('BBox helper visibility')

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

    if (light instanceof DirectionalLight) {
      light.position.set(radius * 4)

      // shadow
      //light.shadow.bias = radius * 0.00001
      light.shadow.camera.far = radius * 10
      light.shadow.camera.top = radius * 2
      light.shadow.camera.right = radius * 2
      light.shadow.camera.bottom = radius * -2
      light.shadow.camera.left = radius * -2
    } else {
      light.position.set(radius * 2)
      const lightPositionLengthSq = light.position.lengthSq()
      light.intensity = lightPositionLengthSq * 6

      // shadow
      light.shadow.bias = radius * 0.0001
    }

    floorPivot.position.y = -size.y * 0.5
    floor.scale.x = radius * 50
    floor.scale.y = radius * 50

    bboxHelper.scale.copy(size.clone().multiplyScalar(0.5))
    // bboxHelper.visible = false

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      // shadows
      parameters.castShadows = true
      parameters.receiveShadows = true

      // debug
      const additionalContribution = `
        // color = vec4(vec3(metallic), color.a);
        // color = vec4(normalize(normal) * 0.5 + 0.5, 1.0);
      `

      parameters.material.shading = shadingModel
      parameters.material.fragmentChunks = {
        additionalContribution,
      }
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

    console.log(gpuCameraRenderer, meshes)

    console.log(await meshes[0].material.getAddedShaderCode('vertex'))
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
