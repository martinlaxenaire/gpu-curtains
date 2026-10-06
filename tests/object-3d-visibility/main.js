// Object3D visibility test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Object3D, AmbientLight, DirectionalLight, LitMesh, Vec3 } =
    await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    //pixelRatio: window.devicePixelRatio,
  })

  const gui = new lil.GUI({ title: 'Object3D visibility test' })

  const objects = []
  const folders = []

  for (let i = 0; i < 5; i++) {
    const object = new Object3D()
    objects.push(object)

    const parentFolder = i > 0 ? folders[i - 1] : gui
    const objectFolder = parentFolder.addFolder('Object3D ' + i)
    objectFolder.add(object, 'parentVisibility').disable().listen()
    objectFolder.add(object, 'visible').listen()
    folders.push(objectFolder)

    if (i > 0) {
      object.parent = objects[i - 1]
    } else {
      object.parent = gpuCameraRenderer.scene
    }
  }

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.2,
  })

  ambientLight.parent = objects[objects.length - 1]

  const ambientFolder = folders[folders.length - 1].addFolder('Ambient light')
  ambientFolder.add(ambientLight, 'parentVisibility').disable().listen()
  ambientFolder.add(ambientLight, 'visible').listen()

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    intensity: 1,
    position: new Vec3(10, 10, 0),
  })

  directionalLight.parent = objects[objects.length - 1]

  const directionalFolder = folders[folders.length - 1].addFolder('Directional light')
  directionalFolder.add(directionalLight, 'parentVisibility').disable().listen()
  directionalFolder.add(directionalLight, 'visible').listen()

  const mesh = new LitMesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    material: {
      color: new Vec3(1, 0, 0),
      roughness: 0.5,
      metallic: 0.5,
    },
  })

  mesh.onBeforeRender(() => {
    mesh.rotation.y += 0.02
  })

  mesh.parent = objects[3]

  const meshFolder = folders[3].addFolder('Mesh')
  meshFolder.add(mesh, 'parentVisibility').disable().listen()
  meshFolder.add(mesh, 'visible').listen()

  console.log({ ambientLight, mesh })
})
