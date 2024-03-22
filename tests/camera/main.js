// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, Mesh, PlaneGeometry, Vec2, Vec3 } = await import(
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

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  // now our scene
  const floorFs = `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var c: vec2f = floor(fsInput.uv * checkerboard.scale) * 0.5;
      var checker: f32 = 2.0 * fract(c.x + c.y);
    
      var color: vec4f = vec4(vec3(checker) * 0.5, 1.0);
      return color;
    }
  `

  const floorScale = new Vec2(150)

  const floor = new Mesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    shaders: {
      fragment: {
        code: floorFs,
      },
    },
    frustumCulled: false, // always draw the floor
    cullMode: 'none',
    uniforms: {
      checkerboard: {
        struct: {
          scale: {
            type: 'vec2f',
            value: floorScale,
          },
        },
      },
    },
  })

  floor.position.y = -1.5
  floor.rotation.x = -Math.PI / 2
  floor.scale.x = floorScale.x
  floor.scale.y = floorScale.y

  const cube = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    uniforms: {
      checkerboard: {
        struct: {
          scale: {
            type: 'vec2f',
            value: floorScale,
          },
        },
      },
    },
  })

  console.log(cube)

  cube.position.x = 1.5

  const cubeBBox = document.createElement('div')
  cubeBBox.classList.add('mesh-bounding-box')
  cubeBBox.style.borderColor = 'red'
  document.body.appendChild(cubeBBox)

  cube.onRender(() => {
    cube.rotation.x += 0.02

    cubeBBox.style.top = cube.projectedBoundingRect.top + 'px'
    cubeBBox.style.left = cube.projectedBoundingRect.left + 'px'
    cubeBBox.style.width = cube.projectedBoundingRect.width + 'px'
    cubeBBox.style.height = cube.projectedBoundingRect.height + 'px'
  })

  const plane = new Mesh(gpuCameraRenderer, {
    label: 'Plane',
    geometry: new PlaneGeometry(),
    cullMode: 'none',
  })

  plane.position.x = -1.5

  const planeBBox = document.createElement('div')
  planeBBox.classList.add('mesh-bounding-box')
  planeBBox.style.borderColor = 'yellow'
  document.body.appendChild(planeBBox)

  plane.onRender(() => {
    plane.rotation.y += 0.02

    planeBBox.style.top = plane.projectedBoundingRect.top + 'px'
    planeBBox.style.left = plane.projectedBoundingRect.left + 'px'
    planeBBox.style.width = plane.projectedBoundingRect.width + 'px'
    planeBBox.style.height = plane.projectedBoundingRect.height + 'px'
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Camera',
  })

  const { camera } = gpuCameraRenderer
  const lookAt = new Vec3()

  const perspectiveFolder = gui.addFolder('Perspective')
  perspectiveFolder.add(camera, 'fov', 1, 179, 1).name('Field of view')
  perspectiveFolder.add(camera, 'near', 0.01, 5, 0.01).name('Near plane')
  perspectiveFolder.add(camera, 'far', 5, 250, 1).name('Far plane')

  const positionFolder = gui.addFolder('Position')
  positionFolder
    .add(camera.position, 'x', -20, 20, 0.1)
    .name('X')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  positionFolder
    .add(camera.position, 'y', -20, 20, 0.1)
    .name('Y')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  positionFolder
    .add(camera.position, 'z', -20, 20, 0.1)
    .name('Z')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  const lookAtFolder = gui.addFolder('Look at')
  lookAtFolder
    .add(lookAt, 'x', -20, 20, 0.1)
    .name('X')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  lookAtFolder
    .add(lookAt, 'y', -20, 20, 0.1)
    .name('Y')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  lookAtFolder
    .add(lookAt, 'z', -20, 20, 0.1)
    .name('Z')
    .onChange(() => {
      camera.lookAt(lookAt)
    })

  const debugProjectionFolder = gui.addFolder('Frustum culling DOM bounding rectangles')
  debugProjectionFolder
    .add({ show: true }, 'show')
    .name('Cube')
    .onChange((value) => {
      cubeBBox.style.display = value ? 'block' : 'none'
    })

  debugProjectionFolder
    .add({ show: true }, 'show')
    .name('Plane')
    .onChange((value) => {
      planeBBox.style.display = value ? 'block' : 'none'
    })
})
