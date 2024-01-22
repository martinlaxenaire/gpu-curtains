import { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh, Vec3 } from '../../dist/gpu-curtains.js'

window.addEventListener('load', async () => {
  const systemSize = 15

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const gpuFrontCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas-front'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0,
      far: systemSize * 6,
    },
  })

  // create the back renderer
  const gpuBackCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas-back'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0,
      far: systemSize * 6,
    },
  })

  // render our scene manually
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  gpuFrontCameraRenderer.camera.position.z = systemSize * 2.5
  gpuBackCameraRenderer.camera.position.z = systemSize * 2.5

  for (let i = 0; i < 15; i++) {
    // compute the initial position
    const angle = Math.random() * Math.PI
    const startingAngle = Math.random() * Math.PI * 2

    const distance = systemSize * 0.25 + Math.random() * systemSize * 0.75

    const initOrbitPosition = new Vec3(Math.cos(startingAngle) * distance, Math.sin(startingAngle) * distance, 0)

    const initAxisAngle = new Vec3(0, Math.sin(startingAngle), Math.cos(startingAngle)).normalize()
    const axisAngle = initOrbitPosition.clone().cross(initAxisAngle).normalize()

    const orbitPosition = initOrbitPosition.clone().applyAxisAngle(axisAngle, angle)

    // set renderer based on initial depth position
    const cubeMesh = new Mesh(orbitPosition.z >= 0 ? gpuFrontCameraRenderer : gpuBackCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
    })

    cubeMesh.userData.angle = angle
    cubeMesh.userData.orbitPosition = initOrbitPosition

    cubeMesh.userData.axisAngle = axisAngle

    cubeMesh.position.copy(orbitPosition)

    cubeMesh.userData.speed = new Vec3(
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5),
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5),
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5) // position angle
    )

    cubeMesh.onRender(() => {
      cubeMesh.rotation.x += cubeMesh.userData.speed.x
      cubeMesh.rotation.z += cubeMesh.userData.speed.y

      cubeMesh.userData.angle += cubeMesh.userData.speed.z

      const orbitPosition = cubeMesh.userData.orbitPosition
        .clone()
        .applyAxisAngle(cubeMesh.userData.axisAngle, cubeMesh.userData.angle)

      // switching renderers at runtime based on depth position!
      if (cubeMesh.position.z <= 0 && orbitPosition.z > 0) {
        cubeMesh.setRenderer(gpuFrontCameraRenderer)
      }

      if (cubeMesh.position.z >= 0 && orbitPosition.z < 0) {
        cubeMesh.setRenderer(gpuBackCameraRenderer)
      }

      cubeMesh.position.copy(orbitPosition)
    })
  }
})
