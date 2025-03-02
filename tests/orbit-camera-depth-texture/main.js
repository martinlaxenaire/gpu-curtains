// Goal of this test is to test and help visualize depth textures
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    BoxGeometry,
    Mesh,
    ShaderPass,
    SphereGeometry,
    Vec2,
    Vec3,
  } = await import(/* @vite-ignore */ path)

  const systemSize = 10

  // here is an example of how we can use a simple GPUCameraRenderer instead of GPUCurtains
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not related to DOM

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
      far: systemSize * 10,
    },
    renderPass: {
      //sampleCount: 1,
    },
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  // set the camera initial position
  camera.position.z = systemSize * 4

  // orbit controls
  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.zoomSpeed = 2
  orbitControls.maxZoom = systemSize * 6

  console.log(camera)

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5
    const mesh = new Mesh(gpuCameraRenderer, {
      geometry: isCube ? cubeGeometry : sphereGeometry,
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = Math.random() * 0.025

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }

  const postProShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var texture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
            
      let rawDepth = textureLoad(
        depthTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      );
      
      // remap depth into something a bit more visible
      let depth = (1.0 - rawDepth) * 10.0 * params.systemSize;

      return mix( texture, vec4(vec3(depth), texture.a), step(fsInput.uv.x, 0.5) );
    }
  `

  const postProPass = new ShaderPass(gpuCameraRenderer, {
    shaders: {
      fragment: {
        code: postProShader,
      },
    },
    uniforms: {
      params: {
        struct: {
          systemSize: {
            type: 'f32',
            value: systemSize,
          },
        },
      },
    },
  })

  const depthTexture = postProPass.createTexture({
    label: 'Depth texture',
    name: 'depthTexture',
    type: 'depth',
    fromTexture: gpuCameraRenderer.renderPass.depthTexture,
    //format: 'depth24plus',
    //sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
  })

  console.log(postProPass)
})
