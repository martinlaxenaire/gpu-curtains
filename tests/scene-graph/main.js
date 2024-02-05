// Check if the scene graph (i.e. parent / children object 3D relationship) works
// test model / world matrices

window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/gpu-curtains.mjs'
  const { Object3D, BoxGeometry, SphereGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh } = await import(
    /* @vite-ignore */ path
  )

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

  const centerPivot = new Object3D()

  const centerSphere = new Mesh(gpuCameraRenderer, {
    geometry: new SphereGeometry(),
  })

  centerSphere.scale.set(0.25)

  centerSphere.parent = centerPivot

  centerSphere.onRender(() => {
    centerPivot.rotation.z += 0.02
  })

  const orbitCube = new Mesh(gpuCameraRenderer, {
    geometry: new BoxGeometry(),
  })

  orbitCube.scale.set(1.25)
  orbitCube.position.x = 10

  orbitCube.parent = centerSphere

  orbitCube.onRender(() => {
    orbitCube.rotation.y += 0.02
  })

  const orbitSphere = new Mesh(gpuCameraRenderer, {
    geometry: new SphereGeometry(),
  })

  orbitSphere.scale.set(1.25)
  orbitSphere.position.x = 5
  orbitSphere.parent = orbitCube

  orbitSphere.onRender(() => {
    orbitSphere.rotation.x += 0.02
  })

  const orbitCube2 = new Mesh(gpuCameraRenderer, {
    geometry: new BoxGeometry(),
  })

  orbitCube2.scale.set(1.25)
  orbitCube2.position.x = 5
  orbitCube2.parent = orbitSphere
})
