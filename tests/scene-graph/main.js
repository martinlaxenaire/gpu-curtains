// Check if the scene graph (i.e. parent / children object 3D relationship) works
// test model / world matrices
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index' : '../../dist/gpu-curtains.js'
  const { Object3D, BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh, Vec3 } = await import(path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
  })

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  for (let i = 0; i < 15; i++) {
    const pivot = new Object3D()

    pivot.scale.set(0.2, 0.2, 0.2)

    const pivotRotationSpeed = (Math.random() - 0.5) * 0.02
    pivot.quaternion.setAxisOrder('ZYX')
    pivot.rotation.z = Math.random() * Math.PI * 2

    const cube = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
    })

    cube.position.x = 25 * Math.random() - 12.5
    cube.position.y = 25 * Math.random() - 12.5
    cube.position.z = 25 * Math.random() - 12.5

    cube.parent = pivot

    // let time = 0
    let time = i * 25

    cube.onRender(() => {
      time++

      pivot.position.x = Math.sin(time * 0.01) * 3

      pivot.rotation.y += pivotRotationSpeed

      //cube.rotation.x += 0.01
      cube.lookAt()
    })
  }
})
