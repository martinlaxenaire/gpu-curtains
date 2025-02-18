import {
  PlaneGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  OrbitControls,
  AmbientLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  LitMesh,
  SphereGeometry,
  Vec2,
  Vec3,
  Object3D,
  BoxGeometry,
  Mesh,
  Sampler,
} from '../../dist/esm/index.mjs'

// All kind of built-in lights + shadows
window.addEventListener('load', async () => {
  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0.01,
    },
  })

  gpuCameraRenderer.camera.position.y = 5
  gpuCameraRenderer.camera.position.z = 12.5

  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.domElement.element,
  })

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  // directional light

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    label: 'White directional light',
    position: new Vec3(10, 5, 10),
    target: new Vec3(0, 0.5, 0),
    intensity: 1,
    shadow: {
      depthTextureSize: new Vec2(1024),
      camera: {
        left: -15,
        right: 15,
        bottom: -15,
        top: 15,
        near: 0.01,
        far: 20,
      },
    },
  })

  // point light

  const pink = new Vec3(1, 0, 1)

  const pointLightPivot = new Object3D()
  pointLightPivot.parent = gpuCameraRenderer.scene

  const pointLight = new PointLight(gpuCameraRenderer, {
    label: 'Pink point light',
    position: new Vec3(0, 0.5, -4),
    color: pink,
    intensity: 15,
    shadow: {
      intensity: 1,
    },
  })

  pointLight.parent = pointLightPivot

  const pointLightHelper = new LitMesh(gpuCameraRenderer, {
    label: 'Point light helper',
    geometry: new SphereGeometry(),
    material: {
      shading: 'Unlit',
      color: pink,
    },
  })

  pointLightHelper.scale.set(0.1)
  pointLightHelper.parent = pointLight

  // spot light

  const blue = new Vec3(0, 1, 1)

  const spotLight = new SpotLight(gpuCameraRenderer, {
    label: 'Blue spot light',
    position: new Vec3(-4, 4, 0),
    target: new Vec3(0, 0.5, 0),
    color: blue,
    intensity: 60,
    range: 20,
    penumbra: 0.5,
    shadow: {
      intensity: 1,
      depthTextureSize: new Vec2(2048),
      pcfSamples: 3,
    },
  })

  const spotLightHelper = new LitMesh(gpuCameraRenderer, {
    label: 'Spot light helper',
    geometry: new BoxGeometry(),
    material: {
      shading: 'Unlit',
      color: blue,
    },
  })

  spotLightHelper.scale.set(0.3, 0.3, 0.025)
  spotLightHelper.parent = spotLight

  // create meshes
  const mesh = new LitMesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    castShadows: true,
    material: {
      shading: 'Phong',
      color: new Vec3(0.75),
      specularColor: new Vec3(1),
      specularIntensity: 1,
      shininess: 64,
    },
  })

  mesh.position.y = 0.5

  const floorPivot = new Object3D()
  floorPivot.parent = gpuCameraRenderer.scene

  const floor = new LitMesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    receiveShadows: true,
    material: {
      shading: 'Lambert',
      color: new Vec3(0.5),
    },
  })

  floor.parent = floorPivot
  floor.position.set(0, -0.5, 0)
  floor.rotation.set(-Math.PI / 2, 0, 0)
  floor.scale.set(100)

  let time = 0

  gpuCameraRenderer.onBeforeRender(() => {
    pointLightPivot.rotation.y = time
    spotLight.target.x = (Math.cos(time) * 0.5 - 0.5) * 4

    time += 0.02
  })
})
