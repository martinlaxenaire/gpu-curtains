// Goals of this test:
// - stencil implementation test
// ref https://shi-yan.github.io/webgpuunleashed/Advanced/stencil_buffer.html
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    GPUCameraRenderer,
    OrbitControls,
    GPUDeviceManager,
    Mesh,
    PlaneGeometry,
    SphereGeometry,
    Vec2,
    Vec3,
    Object3D,
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
    renderPass: {
      depthFormat: 'depth24plus-stencil8', // use stencil!
    },
  })

  const { camera, scene } = gpuCameraRenderer

  const portalPivot = new Object3D()
  portalPivot.parent = scene

  portalPivot.scale.set(7, 3.5, 1)
  portalPivot.position.y = 3.5

  const stencilPlane = new Mesh(gpuCameraRenderer, {
    label: 'Stencil plane',
    geometry: new PlaneGeometry(),
    shaders: {
      fragment: {
        code: `
          @fragment fn main() -> @location(0) vec4f {
            // renders the object as transparent pixels
            // goal here is not to render anything visible but to generate stencil values
            return vec4(0.0, 0.0, 0.0, 0.0);
          }
        `,
      },
    },
    depthWriteEnabled: false, // depth write need to be disabled!
    stencil: {
      front: {
        compare: 'always',
        passOp: 'replace',
      },
      // if not passed, will use the same setting as front
      back: {
        compare: 'always',
        passOp: 'replace',
      },
      stencilReference: 0xffffff,
    },
  })

  stencilPlane.parent = portalPivot

  const backPortal = new Mesh(gpuCameraRenderer, {
    label: 'Back portal plane',
    geometry: new PlaneGeometry(),
    shaders: {
      fragment: {
        code: `
          @fragment fn main() -> @location(0) vec4f {
            return vec4(0.0, 0.0, 0.0, 1.0); // black portal
          }
        `,
      },
    },
    cullMode: 'front', // draw only back of plane
    stencil: {
      front: {
        compare: 'always',
        passOp: 'replace',
      },
    },
  })

  backPortal.parent = portalPivot

  console.log(stencilPlane)

  // now our stenciled scene
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
  const floorPivot = new Object3D()

  floorPivot.rotation.x = -Math.PI / 2
  floorPivot.scale.x = floorScale.x
  floorPivot.scale.y = floorScale.y

  floorPivot.parent = scene

  const stenciledFloor = new Mesh(gpuCameraRenderer, {
    label: 'Stenciled floor',
    geometry: new PlaneGeometry(),
    shaders: {
      vertex: {
        code: floorVs,
      },
      fragment: {
        code: floorFs,
      },
    },
    stencil: {
      front: {
        compare: 'less',
        passOp: 'keep',
      },
      back: {
        compare: 'less',
        passOp: 'keep',
      },
      stencilReference: 0x000000,
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

  stenciledFloor.parent = floorPivot

  const cube = new Mesh(gpuCameraRenderer, {
    label: 'Stenciled cube',
    geometry: new BoxGeometry(),
    stencil: {
      front: {
        compare: 'less',
        passOp: 'keep',
      },
      back: {
        compare: 'less',
        passOp: 'keep',
      },
      stencilReference: 0x000000,
    },
  })

  cube.position.y = 1
  cube.position.z = -4

  cube.onBeforeRender(() => {
    cube.rotation.y += 0.01
  })

  // now our non stenciled scene

  // add a non stenciled floor
  const floor = new Mesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    frustumCulling: false, // always draw the floor
    cullMode: 'none',
    shaders: {
      fragment: {
        code: `
          @fragment fn main() -> @location(0) vec4f {
            return vec4(vec3(0.325), 1.0);
          }
        `,
      },
    },
    stencil: {
      front: {
        compare: 'always',
        passOp: 'keep',
      },
    },
  })

  floor.parent = floorPivot

  // add a non stenciled sphere
  const sphere = new Mesh(gpuCameraRenderer, {
    label: 'Sphere',
    geometry: new SphereGeometry(),
    stencil: {
      front: {
        compare: 'always',
        passOp: 'keep',
      },
    },
  })

  sphere.position.y = 1
  sphere.position.z = 4

  // orbit controls
  const orbitControls = new OrbitControls({
    camera,
    element: gpuCameraRenderer.domElement.element,
  })

  orbitControls.target.set(0, 1, 0)
  orbitControls.updatePosition(new Vec3(0, 3, 15))

  orbitControls.minZoom = 2
  orbitControls.maxZoom = 40

  // const gui = new lil.GUI({
  //   title: 'Cameras',
  // })
})
