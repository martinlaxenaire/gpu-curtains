// Goals of this test:
// - test the OrbitControls class
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    GPUCameraRenderer,
    OrbitControls,
    OrthographicCamera,
    GPUDeviceManager,
    Mesh,
    PlaneGeometry,
    Vec2,
    Vec3,
  } = await import(/* @vite-ignore */ path)

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

  const initPos = new Vec3(10, 5, 0)

  camera.position.copy(initPos)

  // orbit controls
  const orbitControls = new OrbitControls({
    camera,
    element: gpuCameraRenderer.domElement.element,
  })

  console.log(orbitControls)

  const aspect = gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height
  const frustumSize = 10

  const orthoCamera = new OrthographicCamera({
    left: (-frustumSize * aspect) / 2,
    right: (frustumSize * aspect) / 2,
    top: frustumSize / 2,
    bottom: -frustumSize / 2,
  })

  orthoCamera.position.copy(initPos)

  orbitControls.target.set(0, 0.5, 0)
  // orbitControls.updatePosition(initPos)

  orbitControls.minZoom = 2
  orbitControls.maxZoom = 40

  const cameras = {
    Perspective: camera,
    Orthographic: orthoCamera,
  }

  const gui = new lil.GUI({
    title: 'Cameras',
  })

  gui
    .add({ activeCamera: 'Perspective' }, 'activeCamera', cameras)
    .name('Active camera')
    .onChange((value) => {
      gpuCameraRenderer.useCamera(value)
      orbitControls.useCamera(value)
    })
})
