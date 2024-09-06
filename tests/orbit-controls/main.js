// Goals of this test:
// - test the GPUDeviceManager and GPUCameraRenderer without the use of GPUCurtains class
// - test camera position, rotation, lookAt, fov
// - test frustum culling
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, OrbitControls, GPUDeviceManager, Mesh, PlaneGeometry, Vec2, Vec3 } =
    await import(/* @vite-ignore */ path)

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
  const floorVs = `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) cameraPos: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = getWorldNormal(attributes.normal);
      vsOutput.cameraPos = camera.position;
      
      return vsOutput;
    }
  `

  const floorFs = `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) cameraPos: vec3f,
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
      vertex: {
        code: floorVs,
      },
      fragment: {
        code: floorFs,
      },
    },
    frustumCulling: false, // always draw the floor
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

  floor.position.y = 0
  floor.rotation.x = -Math.PI / 2
  floor.scale.x = floorScale.x
  floor.scale.y = floorScale.y

  const cube = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    uniforms: {
      checkerboard: {}, // not valid uniform test
    },
  })

  console.log(cube)

  cube.position.y = 1

  const { camera, container } = gpuCameraRenderer

  // orbit controls
  const orbitControls = new OrbitControls({
    camera,
    element: container,
  })
  orbitControls.target.set(0, 0.5, 0)

  orbitControls.updatePosition(new Vec3(10, 2, 0))

  orbitControls.minZoom = 2
  orbitControls.maxZoom = 40

  console.log(orbitControls)
})
