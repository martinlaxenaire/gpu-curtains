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

  const meshes = []

  for (let i = 0; i < 2; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
      useRenderBundle: true,
    })

    mesh.onBeforeRender(() => {
      mesh.rotation.y += 0.02
    })

    mesh.position.x = i % 2 === 0 ? -2 : 2

    meshes.push(mesh)
  }

  console.log(meshes)
})
