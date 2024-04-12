// real basic stress test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUDeviceManager, GPUCameraRenderer, BoxGeometry, GPUCurtains, Mesh, SphereGeometry } = await import(
    /* @vite-ignore */ path
  )

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  const systemSize = 50

  const meshes = []

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    // production: true, // you can always gain a couple fps by not tracking the errors
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: systemSize,
      far: systemSize * 4,
    },
  })

  // render it
  const animate = () => {
    requestAnimationFrame(animate)

    stats.begin()

    gpuDeviceManager.render()
    stats.end()
  }

  animate()

  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  gpuCameraRenderer.camera.position.z = systemSize * 2

  // not specifically designed to be responsive
  const aspectRatio = gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height

  console.time('creation time')
  let createdMeshes = 0
  let nbMeshes = 3_000

  const addMesh = (index) => {
    const mesh = new Mesh(gpuCameraRenderer, {
      geometry: Math.random() > 0.5 ? cubeGeometry : sphereGeometry,
      // frustumCulled: false, // you can also gain a few fps without checking for frustum
    })

    mesh.position.x = Math.random() * systemSize * 2 * aspectRatio - systemSize * aspectRatio
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = -Math.random() * systemSize * 2

    const rotationSpeed = Math.random() * 0.025

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })

    meshes.push(mesh)

    if (index === 0) console.log(mesh)
  }

  for (let i = 0; i < nbMeshes; i++) {
    addMesh(i)

    meshes[i].onReady(() => {
      createdMeshes++
      if (createdMeshes === nbMeshes) {
        console.timeEnd('creation time')
        console.log(gpuDeviceManager)
      }
    })
  }

  // GUI
  const gui = new lil.GUI({
    title: 'Stress test',
  })

  gui
    .add({ nbMeshes }, 'nbMeshes', 500, 10_000, 1)
    .name('Number of meshes')
    .onFinishChange((value) => {
      if (value < nbMeshes) {
        for (let i = nbMeshes - 1; i >= value; i--) {
          meshes[i].remove()
        }

        meshes.splice(value, nbMeshes - value)
      } else {
        for (let i = nbMeshes; i < value; i++) {
          addMesh(i)
        }
      }

      nbMeshes = value
    })

  gui
    .add({ frustumCulled: true }, 'frustumCulled')
    .name('Frustum culling')
    .onChange((value) => {
      for (let i = 0, l = meshes.length; i < l; i++) {
        meshes[i].frustumCulled = value
      }
    })
})
