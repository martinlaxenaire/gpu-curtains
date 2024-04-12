// Check if the scene graph (i.e. parent / children object 3D relationship) works
// test model / world matrices
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
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

  gpuCameraRenderer.camera.position.z = 20

  // create pivots
  const leftPivot = new Object3D()
  leftPivot.parent = gpuCameraRenderer.scene

  leftPivot.position.x = -7.5
  //leftPivot.scale.set(0.5)

  const rightPivot = new Object3D()
  rightPivot.parent = gpuCameraRenderer.scene

  rightPivot.position.x = 7.5
  rightPivot.scale.set(0.75)

  let time = 0

  // render
  const animate = () => {
    leftPivot.rotation.z += 0.02

    time += 0.025
    rightPivot.rotation.y += 0.01
    rightPivot.position.y = Math.cos(time) * 3

    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  // left scene
  const centerSphere = new Mesh(gpuCameraRenderer, {
    geometry: new SphereGeometry(),
  })

  centerSphere.scale.set(0.25)

  centerSphere.parent = leftPivot

  const orbitCube = new Mesh(gpuCameraRenderer, {
    geometry: new BoxGeometry(),
  })

  orbitCube.scale.set(1.25)
  orbitCube.position.x = 10

  orbitCube.parent = centerSphere

  orbitCube.onBeforeRender(() => {
    orbitCube.rotation.y += 0.02
  })

  const orbitSphere = new Mesh(gpuCameraRenderer, {
    geometry: new SphereGeometry(),
  })

  orbitSphere.scale.set(1.25)
  orbitSphere.position.x = 5
  orbitSphere.parent = orbitCube

  orbitSphere.onBeforeRender(() => {
    orbitSphere.rotation.x += 0.02
  })

  const orbitCube2 = new Mesh(gpuCameraRenderer, {
    geometry: new BoxGeometry(),
  })

  orbitCube2.scale.set(1.25)
  orbitCube2.position.x = 5
  orbitCube2.parent = orbitSphere

  // right scene
  for (let i = 0; i < 5; i++) {
    const meshPivot = new Object3D()
    meshPivot.parent = rightPivot
    //meshPivot.parent = gpuCameraRenderer.scene

    // set the quaternion axis order
    meshPivot.quaternion.setAxisOrder('ZYX')

    //meshPivot.rotation.z = (Math.PI * 2 * i) / 5
    // random init rotation values
    meshPivot.rotation.y = Math.random() * Math.PI * 2
    meshPivot.rotation.z = Math.random() * Math.PI * 2

    const rightOrbitCube = new Mesh(gpuCameraRenderer, {
      geometry: new BoxGeometry(),
    })

    rightOrbitCube.parent = meshPivot

    rightOrbitCube.position.x = 7.5

    rightOrbitCube.onBeforeRender(() => {
      rightOrbitCube.rotation.x += 0.01
      rightOrbitCube.rotation.z += 0.01

      meshPivot.rotation.y += 0.01
    })
  }

  console.log(gpuCameraRenderer)
})
