// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    OrbitControls,
    GPUCameraRenderer,
    GPUDeviceManager,
    AmbientLight,
    DirectionalLight,
    PointLight,
    Vec3,
    Mesh,
    getLambert,
    getPhong,
    LitMesh,
    Object3D,
    getVertexShaderCode,
    getFragmentShaderCode,
  } = await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.canvas,
  })

  const ambientLight = new AmbientLight(gpuCameraRenderer)

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    color: new Vec3(1, 0, 0),
    position: new Vec3(10),
    // shadow: {
    //   intensity: 1,
    // },
  })

  console.log(gpuCameraRenderer)

  const boxGeometry = new BoxGeometry()

  let mesh

  const buildMesh = (shading = 'PBR') => {
    if (mesh) {
      mesh.remove()
    }

    mesh = new LitMesh(gpuCameraRenderer, {
      label: 'Lit mesh',
      geometry: boxGeometry,
      material: {
        shading,
        color: new Vec3(1),
      },
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.y += 0.02
    })
  }

  buildMesh()

  // GUI
  const gui = new lil.GUI({
    title: 'Lights test',
  })

  gui.add(gpuCameraRenderer, 'exposure', 0, 3, 0.05).name('Exposure')
  gui.add(gpuCameraRenderer, 'toneMapping', {'None': false, 'Khronos': 'Khronos', 'Reinhard': 'Reinhard', 'Cineon': 'Cineon'}).name('Tone mapping')
  gui.add(gpuCameraRenderer, 'colorSpace', { 'Linear': 'linear', 'sRGB': 'srgb' }).name('Color space')

  const materialShadingFolder = gui.addFolder('Shading')

  materialShadingFolder
    .add({ shading: 'PBR' }, 'shading', ['Unlit', 'Lambert', 'Phong', 'PBR'])
    .name('Shading')
    .onChange((value) => {
      buildMesh(value)
    })
})
