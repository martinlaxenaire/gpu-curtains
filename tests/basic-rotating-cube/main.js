// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh } = await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    // adapterOptions: {
    //   compatibilityMode: true,
    // },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  const mesh = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
  })

  mesh.onBeforeRender(() => {
    mesh.rotation.y += 0.02
  })

  console.log(mesh)
})
