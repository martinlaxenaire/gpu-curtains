import { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh, Object3D, Vec3 } from '../../dist/gpu-curtains.js'

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

  gpuFrontCameraRenderer.camera.position.z = systemSize * 3
  gpuBackCameraRenderer.camera.position.z = systemSize * 3

  for (let i = 0; i < 15; i++) {
    // create a different pivot for each satellite
    const pivot = new Object3D()

    // set the quaternion axis order
    pivot.quaternion.setAxisOrder('ZYX')
    // random init rotation values
    pivot.rotation.y = Math.random() * Math.PI * 2
    pivot.rotation.z = Math.random() * Math.PI * 2

    // renderers will be updated in the render loop based on world position
    const cubeMesh = new Mesh(gpuBackCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
    })

    // now add the satellite to our pivot
    cubeMesh.parent = pivot

    // random distance
    const distance = systemSize * 0.375 + Math.random() * systemSize * 0.625
    cubeMesh.position.x = distance

    // random rotation speed
    const rotationSpeed = new Vec3(
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5),
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5),
      (Math.random() * 0.01 + 0.005) * Math.sign(Math.random() - 0.5) // pivot rotation speed
    )

    const currentWorldPosition = new Vec3()
    // get current world position
    cubeMesh.worldMatrix.getTranslation(currentWorldPosition)
    const lastWorldPosition = currentWorldPosition.clone()

    cubeMesh.onRender(() => {
      // update current world position
      cubeMesh.worldMatrix.getTranslation(currentWorldPosition)

      cubeMesh.rotation.x += rotationSpeed.x
      cubeMesh.rotation.z += rotationSpeed.y

      // rotate the pivot
      pivot.rotation.y += rotationSpeed.z

      // switching renderers at runtime based on depth position!
      if (lastWorldPosition.z <= 0 && currentWorldPosition.z > 0) {
        cubeMesh.setRenderer(gpuFrontCameraRenderer)
      }

      if (lastWorldPosition.z >= 0 && currentWorldPosition.z < 0) {
        cubeMesh.setRenderer(gpuBackCameraRenderer)
      }

      // update last world position for next render depth comparison
      cubeMesh.worldMatrix.getTranslation(lastWorldPosition)
    })
  }
})
