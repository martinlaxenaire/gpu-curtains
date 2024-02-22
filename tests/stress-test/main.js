// real basic stress test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCurtains, Mesh, SphereGeometry } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  const systemSize = 50

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: systemSize,
      far: systemSize * 4,
    },
    //production: true, // you can always gain a couple fps by not tracking the errors
  })

  await gpuCurtains.setDevice()

  gpuCurtains.renderer
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  gpuCurtains.camera.position.z = systemSize * 2

  // not specifically designed to be responsive
  const aspectRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height

  for (let i = 0; i < 3000; i++) {
    const mesh = new Mesh(gpuCurtains, {
      geometry: Math.random() > 0.5 ? cubeGeometry : sphereGeometry,
      //frustumCulled: false, // you can also gain a few fps without checking for frustum
    })

    mesh.position.x = Math.random() * systemSize * 2 * aspectRatio - systemSize * aspectRatio
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = -Math.random() * systemSize * 2

    const rotationSpeed = Math.random() * 0.025

    mesh.onRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }
})
