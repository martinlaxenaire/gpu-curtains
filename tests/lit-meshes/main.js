// Goals of this test:
// - test various lit meshes parameters
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    EnvironmentMap,
    AmbientLight,
    DirectionalLight,
    OrbitControls,
    FullscreenPlane,
    Vec2,
    Vec3,
    SphereGeometry,
    LitMesh,
    Object3D,
    Texture,
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
    // renderPass: {
    //   // since transmission need a solid background color to be blended with
    //   // just clear the renderer renderPass color values to match the css background
    //   colorAttachments: [
    //     {
    //       clearValue: [34 / 255, 34 / 255, 34 / 255, 1],
    //     },
    //   ],
    // },
  })

  const { camera, scene } = gpuCameraRenderer

  camera.position.z = 10

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
  await environmentMap.loadAndComputeFromHDR(currentEnvMap.url)

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1, // will be updated
  })

  const light1 = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(100, 100, 150), // will be updated when model changes
    intensity: 3,
  })

  // const light2 = new DirectionalLight(gpuCameraRenderer, {
  //   position: new Vec3(100, 200, 100), // will be updated when model changes
  //   intensity: 3,
  // })

  // const light3 = new DirectionalLight(gpuCameraRenderer, {
  //   position: new Vec3(-100, -200, -100), // will be updated when model changes
  //   intensity: 3,
  // })

  // background checked
  const floorFs = `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var c: vec2f = floor(fsInput.uv * checkerboard.scale) * 0.5;
      var checker: f32 = 2.0 * fract(c.x + c.y);
    
      var color: vec4f = vec4(vec3(checker + 0.1) * 0.5 + 0.1, 1.0);
      
      return color;
    }
  `

  const { width, height } = gpuCameraRenderer.boundingRect

  const background = new FullscreenPlane(gpuCameraRenderer, {
    shaders: {
      fragment: {
        code: floorFs,
      },
    },
    uniforms: {
      checkerboard: {
        struct: {
          scale: {
            type: 'vec2f',
            value: new Vec2(width / 50, height / 50),
          },
        },
      },
    },
  })

  background.onAfterResize(() => {
    const { width, height } = gpuCameraRenderer.boundingRect
    background.uniforms.checkerboard.scale.value.set(width / 50, height / 50)
  })

  const geometry = new SphereGeometry()

  // textures
  let baseColorTexture = null
  let useBaseColorTexture = false

  let normalTexture = null
  let useNormalTexture = false

  const gold = new Vec3(1.0, 0.766, 0.336)

  const spacing = 3

  const nonTransmissivePivot = new Object3D()
  nonTransmissivePivot.parent = scene

  nonTransmissivePivot.position.y = spacing * 0.875

  const transmissivePivot = new Object3D()
  transmissivePivot.parent = scene

  //transmissivePivot.position.y = -spacing * 0.5

  const volumePivot = new Object3D()
  volumePivot.parent = scene

  volumePivot.position.y = -spacing * 0.875

  let meshes = []

  const buildMeshes = () => {
    const hasBaseColorTexture = useBaseColorTexture && baseColorTexture
    const hasNormalTexture = useNormalTexture && normalTexture

    // unlit
    const unlitSphere = new LitMesh(gpuCameraRenderer, {
      label: 'Unlit sphere',
      geometry,
      material: {
        shading: 'Unlit',
        color: gold,
        ...(hasBaseColorTexture && {
          baseColorTexture: {
            texture: baseColorTexture,
          },
        }),
        ...(hasNormalTexture && {
          normalTexture: {
            texture: normalTexture,
          },
        }),
      },
    })

    unlitSphere.position.x -= spacing * 2
    unlitSphere.parent = nonTransmissivePivot

    meshes.push(unlitSphere)

    // lambert
    const lambertSphere = new LitMesh(gpuCameraRenderer, {
      label: 'Lambert sphere',
      geometry,
      material: {
        shading: 'Lambert',
        color: gold,
        ...(hasBaseColorTexture && {
          baseColorTexture: {
            texture: baseColorTexture,
          },
        }),
        ...(hasNormalTexture && {
          normalTexture: {
            texture: normalTexture,
          },
        }),
      },
    })

    lambertSphere.position.x -= spacing
    lambertSphere.parent = nonTransmissivePivot

    meshes.push(lambertSphere)

    // phong
    const phongSphere = new LitMesh(gpuCameraRenderer, {
      label: 'Phong sphere',
      geometry,
      material: {
        shading: 'Phong',
        color: gold,
        ...(hasBaseColorTexture && {
          baseColorTexture: {
            texture: baseColorTexture,
          },
        }),
        ...(hasNormalTexture && {
          normalTexture: {
            texture: normalTexture,
          },
        }),
      },
    })

    phongSphere.parent = nonTransmissivePivot

    meshes.push(phongSphere)

    // PBR without env map
    const pbrSphere = new LitMesh(gpuCameraRenderer, {
      label: 'PBR sphere',
      geometry,
      material: {
        shading: 'PBR',
        color: gold,
        metallic: 1,
        roughness: 0.5,
        ...(hasBaseColorTexture && {
          baseColorTexture: {
            texture: baseColorTexture,
          },
        }),
        ...(hasNormalTexture && {
          normalTexture: {
            texture: normalTexture,
          },
        }),
      },
    })

    pbrSphere.position.x = spacing
    pbrSphere.parent = nonTransmissivePivot

    meshes.push(pbrSphere)

    // PBR with env map
    const iblSphere = new LitMesh(gpuCameraRenderer, {
      label: 'PBR IBL sphere',
      geometry,
      material: {
        shading: 'PBR',
        color: gold,
        metallic: 1,
        roughness: 0,
        environmentMap,
        ...(hasBaseColorTexture && {
          baseColorTexture: {
            texture: baseColorTexture,
          },
        }),
        ...(hasNormalTexture && {
          normalTexture: {
            texture: normalTexture,
          },
        }),
      },
    })

    iblSphere.position.x = spacing * 2
    iblSphere.parent = nonTransmissivePivot

    meshes.push(iblSphere)

    for (let i = 0; i < 5; i++) {
      // PBR with env map and transmission
      const transmissiveSphere = new LitMesh(gpuCameraRenderer, {
        label: 'PBR IBL transmissive sphere ' + i,
        geometry,
        transmissive: true,
        material: {
          shading: 'PBR',
          color: gold,
          metallic: 0.2,
          roughness: 0.2,
          transmission: 1,
          thickness: i / 5,
          environmentMap,
          ...(hasBaseColorTexture && {
            baseColorTexture: {
              texture: baseColorTexture,
            },
          }),
          ...(hasNormalTexture && {
            normalTexture: {
              texture: normalTexture,
            },
          }),
        },
      })

      transmissiveSphere.position.x = (i / 5) * spacing * 5 - spacing * 2
      transmissiveSphere.parent = transmissivePivot

      meshes.push(transmissiveSphere)
    }

    for (let i = 0; i < 5; i++) {
      // PBR with env map and transmission
      const volumeSphere = new LitMesh(gpuCameraRenderer, {
        label: 'PBR IBL transmissive volume sphere ' + i,
        geometry,
        transmissive: true,
        material: {
          shading: 'PBR',
          color: gold,
          metallic: 0.2,
          roughness: 0.2,
          transmission: 1,
          thickness: 1,
          dispersion: (5 * i) / 5,
          ior: 1 + i / 2,
          //attenuationDistance: 100,
          //attenuationColor: new Vec3(1, 0, 0),
          environmentMap,
          ...(hasBaseColorTexture && {
            baseColorTexture: {
              texture: baseColorTexture,
            },
          }),
          ...(hasNormalTexture && {
            normalTexture: {
              texture: normalTexture,
            },
          }),
        },
      })

      volumeSphere.position.x = (i / 5) * spacing * 5 - spacing * 2
      volumeSphere.parent = volumePivot

      meshes.push(volumeSphere)
    }

    console.log(meshes)
  }

  buildMeshes()

  const baseColorTextureUrl =
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareBaseColor/glTF/Compare_Basecolor_img1.png'

  const baseColorRes = await fetch(baseColorTextureUrl)
  const baseColorBlob = await baseColorRes.blob()
  const baseColorImage = await createImageBitmap(baseColorBlob, { colorSpaceConversion: 'none' })

  baseColorTexture = new Texture(gpuCameraRenderer, {
    label: 'Base color texture',
    name: 'baseColorTexture',
    format: 'bgra8unorm-srgb',
    visibility: ['fragment'],
    generateMips: true, // generate mips by default
    fixedSize: {
      width: baseColorImage.width,
      height: baseColorImage.height,
    },
    autoDestroy: false,
  })

  baseColorTexture.uploadSource({ source: baseColorImage })

  const normalTextureUrl =
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CompareNormal/glTF/Compare_Normal_img0.jpg'

  const normalRes = await fetch(normalTextureUrl)
  const normalBlob = await normalRes.blob()
  const normalImage = await createImageBitmap(normalBlob, { colorSpaceConversion: 'none' })

  normalTexture = new Texture(gpuCameraRenderer, {
    label: 'Normal texture',
    name: 'normalTexture',
    format: 'bgra8unorm',
    visibility: ['fragment'],
    generateMips: true, // generate mips by default
    fixedSize: {
      width: normalImage.width,
      height: normalImage.height,
    },
    autoDestroy: false,
  })

  normalTexture.uploadSource({ source: normalImage })

  // GUI
  const gui = new lil.GUI({
    title: 'Lit meshes',
  })

  const baseColorTextureField = gui
    .add({ useBaseColorTexture }, 'useBaseColorTexture')
    .name('Base color texture')
    .onChange((value) => {
      useBaseColorTexture = value

      meshes.forEach((mesh) => mesh.remove())

      meshes = []

      buildMeshes()
    })

  const normalTextureField = gui
    .add({ useNormalTexture }, 'useNormalTexture')
    .name('Normal texture')
    .onChange((value) => {
      useNormalTexture = value

      meshes.forEach((mesh) => mesh.remove())

      meshes = []

      buildMeshes()
    })

  console.log(gpuCameraRenderer)
})
