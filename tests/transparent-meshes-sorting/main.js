// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Object3D, Mesh, OrbitControls } = await import(
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
    //pixelRatio: window.devicePixelRatio,
  })

  const pivot = new Object3D()
  pivot.parent = gpuCameraRenderer.scene

  // pivot.quaternion.setAxisOrder('ZXY')
  // pivot.rotation.z = Math.PI / 2

  gpuCameraRenderer.camera.position.z = 25
  const orbitControls = new OrbitControls(gpuCameraRenderer)

  gpuDeviceManager.onBeforeRender(() => {
    pivot.rotation.y += 0.02
  })

  const boxGeometry = new BoxGeometry()

  const nbCubes = 6

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      return vec4(normalize(fsInput.normal) * 0.5 + 0.5, 0.5);
    }
  `

  for (let i = 0; i < nbCubes; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Rotating cube ' + i,
      geometry: boxGeometry,
      transparent: true,
      //renderOrder: i === 0 ? 1 : 0,
      shaders: {
        fragment: {
          code: fs,
        },
      },
    })

    const cubePivot = new Object3D()
    cubePivot.parent = pivot

    cubePivot.rotation.y = (Math.PI * i * 2) / nbCubes
    mesh.position.x = 10

    mesh.parent = cubePivot
  }

  const smallCube = new Mesh(gpuCameraRenderer, {
    label: 'Small cube',
    geometry: boxGeometry,
    transparent: true,
    shaders: {
      fragment: {
        code: fs,
      },
    },
  })

  smallCube.position.z = 2

  const bigCube = new Mesh(gpuCameraRenderer, {
    label: 'Big cube',
    geometry: boxGeometry,
    transparent: true,
    shaders: {
      fragment: {
        code: fs,
      },
    },
  })

  bigCube.scale.set(4)
})
