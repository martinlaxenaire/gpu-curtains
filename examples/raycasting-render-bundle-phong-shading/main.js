import {
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  Object3D,
  AmbientLight,
  DirectionalLight,
  RenderBundle,
  LitMesh,
  SphereGeometry,
  Vec3,
  Raycaster,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    onError: () => {
      document.body.classList.add('no-curtains')
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 1,
      far: 150,
    },
  })

  // get the camera
  const { camera, scene } = gpuCameraRenderer

  const pivot = new Object3D()
  pivot.parent = scene

  camera.position.z = 25

  // always keep track of visible size
  let visibleSize = camera.getVisibleSizeAtDepth()

  gpuCameraRenderer.onResize(() => {
    visibleSize = camera.getVisibleSizeAtDepth()
  })

  gpuDeviceManager.onBeforeRender(() => {
    pivot.rotation.y += 0.005
  })

  // lights
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(15, 45, 15),
    intensity: 1,
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const hitColor = new Vec3(1)

  const meshes = []

  const easeInOutCubic = (x) => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
  }

  const nbMeshes = 35

  const renderBundle = new RenderBundle(gpuCameraRenderer, {
    label: 'Raycaster render bundle',
    size: nbMeshes,
    useBuffer: true,
  })

  for (let i = 0; i < nbMeshes; i++) {
    const isCube = Math.random() > 0.5

    const mesh = new LitMesh(gpuCameraRenderer, {
      label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      renderBundle,
      material: {
        shading: 'Phong',
        fragmentChunks: {
          preliminaryContribution: `
          // select color based on the hit test
          // apply to 'outputColor'
          let hitColor: vec3f = select(outputColor.rgb, raycasting.hitColor, bool(raycasting.isHit));
          outputColor = vec4(hitColor, 1.0);
          `,
        },
        color: pink.clone().lerp(blue, easeInOutCubic(Math.random())),
        specularStrength: 0.25,
        shininess: 40,
      },
      uniforms: {
        raycasting: {
          visibility: ['fragment'],
          struct: {
            hitColor: {
              type: 'vec3f',
              value: hitColor,
            },
            isHit: {
              type: 'f32',
              value: 0,
            },
          },
        },
      },
    })

    mesh.parent = pivot

    mesh.userData.position = new Vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)

    const setPosition = () => {
      const minPosition = Math.min(visibleSize.width, visibleSize.height) * 0.75
      mesh.position.x = minPosition * mesh.userData.position.x
      mesh.position.y = minPosition * mesh.userData.position.y
      mesh.position.z = minPosition * mesh.userData.position.z
    }

    setPosition()

    const rotationSpeed = Math.random() * 0.025

    mesh
      .onBeforeRender(() => {
        mesh.rotation.y += rotationSpeed
        mesh.rotation.z += rotationSpeed
      })
      .onAfterResize(setPosition)

    meshes.push(mesh)
  }

  // raycasting
  const raycaster = new Raycaster(gpuCameraRenderer)

  const onMouseMove = (e) => {
    // reset every mesh hit value
    meshes.forEach((mesh) => {
      mesh.uniforms.raycasting.isHit.value = 0
    })

    raycaster.setFromMouse(e)

    // notice we're raycasting the meshes parent recursively
    const intersections = raycaster.intersectObject(pivot, true)
    // this would work as well
    // const intersections = raycaster.intersectObjects([meshes])

    // console.log(intersections)

    if (intersections.length) {
      // highlight intersect meshes if any
      intersections.forEach((intersection) => {
        intersection.object.uniforms.raycasting.isHit.value = 1
      })

      // if you want to highlight only the closest hit mesh instead
      // intersections[0].object.uniforms.raycasting.isHit.value = 1
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onMouseMove)
})
