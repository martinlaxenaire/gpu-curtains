// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh } = await import(/* @vite-ignore */ path)

  let gpuDeviceManager

  const url = new URL(window.location)
  const searchParams = new URLSearchParams(url.search)
  const featureLevel = searchParams.get('feature-level') ?? 'core'
  const minFeatureLevel = searchParams.get('min-feature-level')

  const adapterOptions = {
    featureLevel: featureLevel === 'compatibility' || featureLevel === 'core' ? featureLevel : 'core',
    minFeatureLevel:
      minFeatureLevel && (minFeatureLevel === 'compatibility' || minFeatureLevel === 'core') ? minFeatureLevel : null,
  }

  const gui = new lil.GUI({
    title: 'Feature levels',
  })

  const featureLevelController = gui
    .add(adapterOptions, 'featureLevel', { Compatibility: 'compatibility', Core: 'core' })
    .onChange(async () => {
      await createTest()
    })

  gui
    .add(adapterOptions, 'minFeatureLevel', { 'Not defined': null, Compatibility: 'compatibility', Core: 'core' })
    .onChange(async () => {
      await createTest()
    })

  const createTest = async () => {
    if (gpuDeviceManager) {
      gpuDeviceManager.destroy()
      gpuDeviceManager = null
    }

    // create a device manager
    gpuDeviceManager = new GPUDeviceManager({
      label: 'Custom device manager',
      adapterOptions,
    })

    // wait for the device to be created
    await gpuDeviceManager.init()

    adapterOptions.featureLevel = gpuDeviceManager.options.adapterOptions.featureLevel
    featureLevelController.updateDisplay()

    console.log(gpuDeviceManager)

    // create a camera renderer
    const gpuCameraRenderer = new GPUCameraRenderer({
      deviceManager: gpuDeviceManager,
      container: document.querySelector('#canvas'),
      //pixelRatio: window.devicePixelRatio,
      hdrRendering: false,
      toneMapping: false,
      colorSpace: 'linear',
    })

    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube',
      geometry: new BoxGeometry(),
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.y += 0.02
    })
  }

  await createTest()
})
