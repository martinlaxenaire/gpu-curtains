import {
  GPUCameraRenderer,
  GPUDeviceManager,
  AmbientLight,
  DirectionalLight,
  Object3D,
  LitMesh,
  BoxGeometry,
  SphereGeometry,
  Vec3,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // here is an example of how we can use a GPUDeviceManager and a simple GPUCameraRenderer instead of the whole GPUCurtains package
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not specifically related to DOM objects

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    onError: () => {
      // handle device creation error here
      console.log('there has been an error!')
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderers
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0,
      far: 20,
    },
  })

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.3,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(0, 10, 10),
    intensity: 1,
  })

  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)

  const nbElements = 10
  for (let i = 0; i < nbElements; i++) {
    let time = i * -30

    const pivot = new Object3D()
    // add the scene as the pivot parent
    pivot.parent = gpuCameraRenderer.scene

    // shrink everything
    pivot.scale.set(0.2)

    // move pivot along x axis
    pivot.position.x = Math.cos(time * 0.01) * 4

    const pivotRotationSpeed = (Math.random() * 0.015 + 0.01) * Math.sign(Math.random() - 0.5)

    pivot.quaternion.setAxisOrder('ZYX')
    pivot.rotation.z = (Math.random() * Math.PI * 0.75 + Math.PI * 0.25) * Math.sign(Math.random() - 0.5)

    // lerp colors from blue to pink
    const lerpValue = i / (nbElements - 1)
    const meshColor = blue.clone().lerp(pink, lerpValue)

    // now add a small sphere that will act as our pivot center helper
    // note we could have directly used the mesh as a parent!
    const pivotSphere = new LitMesh(gpuCameraRenderer, {
      label: 'Pivot center ' + i,
      geometry: new SphereGeometry(),
      material: {
        shading: 'Lambert',
        color: meshColor,
      },
    })

    pivotSphere.scale.set(0.2)
    // add pivot as parent
    pivotSphere.parent = pivot

    // create a cube mesh
    const cube = new LitMesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: new BoxGeometry(),
      material: {
        shading: 'Lambert',
        color: meshColor,
      },
    })

    // random position along X axis
    cube.position.x = (7.5 * Math.random() + 7.5) * Math.sign(Math.random() - 0.5)

    // add pivot as parent
    cube.parent = pivot
    // look at pivot center
    cube.lookAt(pivot.position)

    cube.onBeforeRender(() => {
      time++

      // move pivot along x axis
      pivot.position.x = Math.cos(time * 0.01) * 4

      // rotate the pivot
      pivot.rotation.y += pivotRotationSpeed
    })
  }
})
