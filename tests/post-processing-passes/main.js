// Goal of this test is to test post processing passes including prepass
// what should be outputted:
// - first a pre pass that draws a dummy grey rectangle in the middle of the screen
// - then a red plane rendered in a render target without depth + a pre pass
// - then a bunch of spheres and cubes. The cubes are rendered in a render target using depth + a pre pass that invert their colors on top half of screen
// - then a post pro pass where the content of the depth buffer is drawn on the left half of the screen
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    BoxGeometry,
    Mesh,
    RenderTarget,
    ShaderPass,
    PlaneGeometry,
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

  // pre passes
  const prePassShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var bg: vec4f;
      
      let uv: vec2f = fsInput.uv * 2.0 - 1.0;
      
      if(abs(uv.x) < 0.5 && abs(uv.y) < 0.5) {
        bg = vec4(vec3(0.5), 1.0);
      } else {
        bg = vec4(0.0);
      }
    
      return bg;
    }
  `

  const bgPrePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Background pre pass',
    isPrePass: true,
    transparent: true, // blending
    shaders: {
      fragment: {
        code: prePassShader,
      },
    },
  })

  const planeTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Plane target without depth',
    useDepth: false,
  })

  const planePrePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Plane pre pass',
    inputTarget: planeTarget, // do nothing, just display plane
    isPrePass: true,
    transparent: true,
  })

  const plane = new Mesh(gpuCameraRenderer, {
    label: 'Plane',
    geometry: new PlaneGeometry(),
    outputTarget: planeTarget,
    cullMode: 'none',
    shaders: {
      fragment: {
        code: `
          @fragment fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {          
            return vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
      },
    },
  })

  plane.scale.set(8, 6, 1)

  const cubePrePassShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var texture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);

      return mix( vec4(texture.rgb, texture.a), vec4(1.0 - texture.rgb, texture.a), step(fsInput.uv.y, 0.5) );
    }
  `

  const cubePrePassTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Cube pre pass target',
  })

  const cubePrePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Cube pre pass',
    isPrePass: true,
    inputTarget: cubePrePassTarget,
    transparent: true, // blending
    shaders: {
      fragment: {
        code: cubePrePassShader,
      },
    },
  })

  console.log(gpuCameraRenderer.scene)

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()
  let meshes = []

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5
    const mesh = new Mesh(gpuCameraRenderer, {
      label: (isCube ? 'Cube' : 'Sphere') + ' mesh ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      outputTarget: isCube ? cubePrePassTarget : null,
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = Math.random() * 0.025

    mesh.userData.updateOutputTarget = isCube

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })

    meshes.push(mesh)
  }

  //
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
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Passes',
  })

  gui.add(bgPrePass, 'visible').name('Background pre pass visibility')

  gui
    .add({ usePlanePrePass: true }, 'usePlanePrePass')
    .name('Use red plane pre pass')
    .onChange((value) => {
      planePrePass.visible = value
      plane.setOutputTarget(value ? planeTarget : null)
    })

  gui
    .add({ useCubePrePass: true }, 'useCubePrePass')
    .name('Use cube pre pass')
    .onChange((value) => {
      meshes
        .filter((mesh) => mesh.userData.updateOutputTarget)
        .forEach((mesh) => {
          mesh.setOutputTarget(value ? cubePrePassTarget : null)
        })
      cubePrePass.visible = value
    })
  gui.add(postProPass, 'visible').name('Depth post processing pass visibility')
})
