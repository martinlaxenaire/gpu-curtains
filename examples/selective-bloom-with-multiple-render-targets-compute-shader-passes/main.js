import {
  OrbitControls,
  AmbientLight,
  DirectionalLight,
  SphereGeometry,
  LitMesh,
  Vec3,
  RenderTarget,
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  ComputeShaderPass,
  ShaderPass,
  constants,
  common,
  toneMappingUtils,
  Texture,
  Raycaster,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
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
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
  })

  const systemSize = 10

  gpuCameraRenderer.camera.position.z = systemSize * 3.5

  // orbit controls
  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.domElement.element,
  })

  // lights
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.3,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize * 2.5, systemSize * 20, systemSize * 15),
    intensity: 1.5,
  })

  const selectiveMRT = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective MRT',
    depthTexture: gpuCameraRenderer.renderPass.depthTexture,
    colorAttachments: [
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: gpuCameraRenderer.options.context.format, // selective mask
      },
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: gpuCameraRenderer.options.context.format, // original scene
      },
    ],
  })

  // create two render targets that we'll be ping ponging
  const renderTargetsOptions = {
    renderTextureName: 'bloomTexture', // used in our final composite pass
    useDepth: false, // no need for depth
    sampleCount: 1, // no need for MSAA
  }

  const selectiveTargetA = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom target A',
    ...renderTargetsOptions,
  })

  const selectiveTargetB = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom target B',
    ...renderTargetsOptions,
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const sphereColor1 = new Vec3(0, 1, 1)
  const sphereColor2 = new Vec3(1, 0, 1)
  const cubeColor = new Vec3(0.95)

  const meshPosition = new Vec3()

  // keep track of the cube meshes
  // we'll raycast them to add them to the bloom pass on mouse over
  const cubeMeshes = []

  for (let i = 0; i < 75; i++) {
    const isCube = Math.random() > 0.5

    const rotationSpeed = 0.005 + Math.random() * 0.02

    meshPosition.set(
      Math.random() * systemSize * 2 - systemSize,
      Math.random() * systemSize * 2 - systemSize,
      Math.random() * systemSize * 2 - systemSize
    )

    const mesh = new LitMesh(gpuCameraRenderer, {
      label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      outputTarget: selectiveMRT,
      material: {
        shading: 'Lambert',
        color: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
        // render in linear space without tone mapping
        toneMapping: false,
        outputColorSpace: 'linear',
        fragmentOutput: {
          // matches the MRT attachments
          struct: [
            {
              type: 'vec4f',
              name: 'mask',
            },
            {
              type: 'vec4f',
              name: 'scene',
            },
          ],
          output: /* wgsl */ `
          var output: FSOutput;
          output.scene = outputColor;
          output.mask = select(vec4(0.0), outputColor, params.isMasked == 0);

          return output;`,
        },
      },
      uniforms: {
        params: {
          struct: {
            isMasked: {
              type: 'i32',
              value: isCube ? 1 : 0,
            },
          },
        },
      },
    })

    mesh.position.copy(meshPosition)

    // initial rotation
    mesh.rotation.y = rotationSpeed * 10
    mesh.rotation.z = rotationSpeed * 10

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })

    if (isCube) {
      cubeMeshes.push(mesh)
    }
  }

  const brightnessComputeShader = /* wgsl */ `
    @compute @workgroup_size(16, 16) fn main(
        @builtin(global_invocation_id) id: vec3<u32>
    ) {
      let dims = textureDimensions(renderTexture);

      if (id.x >= dims.x || id.y >= dims.y) {
        return;
      }

      let uv: vec2f = vec2(vec2f(id.xy) / vec2f(dims));

      let color = textureLoad(renderTexture, vec2<i32>(id.xy), 0u);

      let brightness: f32 = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      let result: vec4f = mix(vec4(0), color, step(params.threshold, brightness));

      // bloom object with brightness extracted
      textureStore(storageRenderTexture, vec2<i32>(id.xy), result);
    }`

  const computeBrightnessPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute brightness shader pass',
    shaders: {
      compute: {
        code: brightnessComputeShader,
      },
    },
    uniforms: {
      params: {
        struct: {
          threshold: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
    inputTarget: selectiveMRT, // use our mask render target texture as input
    outputTarget: selectiveTargetA,
  })

  const gaussianBlurComputePasses = /* wgsl */ `
    // example Gaussian weights for radius 2: [0.06136, 0.24477, 0.38774, 0.24477, 0.06136]
    // we'll sample offsets -2..+2
    const weights : array<f32,5> = array<f32,5>(
      0.06136, 0.24477, 0.38774, 0.24477, 0.06136
    );

    fn gaussianWeight(x: f32, sigma: f32) -> f32 {
      return exp(-0.5 * (x * x) / (sigma * sigma));
    }

    @compute @workgroup_size(16,8)
    fn horizontal(@builtin(global_invocation_id) gid : vec3<u32>) {
      let size = textureDimensions(storageRenderTexture);
      if (gid.x >= size.x || gid.y >= size.y) { return; }

      let uv = vec2f(gid.xy) + 0.5; // pixel center

      var sum: vec4f = vec4f(0.0);
      var weightSum: f32 = 0.0;

      for (var i = -params.radius; i <= params.radius; i = i + 1) {
          let offset: vec2f = vec2f(f32(i), 0.0);

          let sampleUV = uv + offset;
          let w = gaussianWeight(f32(i), params.sigma);

          sum += textureLoad(renderTexture, vec2i(sampleUV), 0) * w;
          weightSum += w;
      }

      let result = sum / weightSum;

      textureStore(storageRenderTexture, vec2i(gid.xy), result);
    }

    @compute @workgroup_size(8,16)
    fn vertical(@builtin(global_invocation_id) gid : vec3<u32>) {
      let size = textureDimensions(storageRenderTexture);
      if (gid.x >= size.x || gid.y >= size.y) { return; }

      let uv = vec2f(gid.xy) + 0.5; // pixel center

      var sum: vec4f = vec4f(0.0);
      var weightSum: f32 = 0.0;

      for (var i = -params.radius; i <= params.radius; i = i + 1) {
          let offset: vec2f = vec2f(0.0, f32(i));

          let sampleUV = uv + offset;
          let w = gaussianWeight(f32(i), params.sigma);

          sum += textureLoad(renderTexture, vec2i(sampleUV), 0) * w;
          weightSum += w;
      }

      let result = sum / weightSum;

      textureStore(storageRenderTexture, vec2i(gid.xy), result);
    }`

  const gaussianParams = {
    sigma: 7,
    radius: 10,
  }

  const computeHorizontalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute horizontal blur shader pass',
    shaders: {
      compute: {
        code: gaussianBlurComputePasses,
        entryPoint: 'horizontal',
      },
    },
    textureDispatchSize: [16, 8],
    uniforms: {
      params: {
        struct: {
          sigma: {
            type: 'f32',
            value: gaussianParams.sigma,
          },
          radius: {
            type: 'i32',
            value: gaussianParams.radius,
          },
        },
      },
    },
    inputTarget: selectiveTargetA,
    outputTarget: selectiveTargetB,
  })

  const computeVerticalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute vertical blur shader pass',
    shaders: {
      compute: {
        code: gaussianBlurComputePasses,
        entryPoint: 'vertical',
      },
    },
    textureDispatchSize: [8, 16],
    uniforms: {
      params: {
        struct: {
          sigma: {
            type: 'f32',
            value: gaussianParams.sigma,
          },
          radius: {
            type: 'i32',
            value: gaussianParams.radius,
          },
        },
      },
    },
    inputTarget: selectiveTargetB,
    outputTarget: selectiveTargetA,
  })

  // composite pass: blend the original scene pass with the bloom result
  const compositePassFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      // chunks needed for tone mapping
      ${constants}
      ${common}
      ${toneMappingUtils}
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        let originalScene: vec4f = textureSample(sceneTexture, defaultSampler, fsInput.uv);   
        let bloomScene: vec4f = textureSample(bloomTexture, defaultSampler, fsInput.uv);

        var result: vec4f = originalScene + bloomScene * params.strength;

        if(params.outputResult == 1) {
          result = originalScene;
        } else if(params.outputResult == 2) {
          result = bloomScene;
        }

        // tone mapping
        result = vec4(KhronosToneMapping(result.rgb), result.a);
        result = linearTosRGB_4(result);
        
        return result;
      }
    `

  // get our MRT scene texture and pass it to the composite pass
  const sceneTexture = new Texture(gpuCameraRenderer, {
    label: 'MRT scene texture',
    name: 'sceneTexture',
    fromTexture: selectiveMRT.outputTextures[1],
  })

  const compositePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Composite pass',
    shaders: {
      fragment: {
        code: compositePassFs,
      },
    },
    textures: [
      // the MRT texture containing our original scene
      sceneTexture,
      // last selective ping pong target onto which we rendered
      selectiveTargetA.renderTexture,
    ],
    uniforms: {
      params: {
        struct: {
          strength: {
            type: 'f32',
            value: 1,
          },
          // debug
          outputResult: {
            type: 'i32',
            value: 0,
          },
        },
      },
    },
  })

  // raycasting
  const raycaster = new Raycaster(gpuCameraRenderer)

  const onMouseMove = (e) => {
    // reset every mesh hit value
    cubeMeshes.forEach((mesh) => {
      mesh.uniforms.params.isMasked.value = 1
    })

    raycaster.setFromMouse(e)

    // notice we're raycasting the meshes parent recursively
    const intersections = raycaster.intersectObjects(cubeMeshes)

    if (intersections.length) {
      // highlight only the closest hit mesh
      intersections[0].object.uniforms.params.isMasked.value = 0
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onMouseMove)

  // debug
  const gui = new lil.GUI({
    title: 'Compute selective bloom',
  })

  const brightnessFolder = gui.addFolder('Brightness extraction pass')
  brightnessFolder.add(computeBrightnessPass.uniforms.params.threshold, 'value', 0, 1, 0.01).name('Threshold')

  const gaussianFolder = gui.addFolder('Gaussian blur passes')
  gaussianFolder
    .add(gaussianParams, 'sigma', 1, 15, 0.25)
    .onChange((value) => {
      computeHorizontalBlurPass.uniforms.params.sigma.value = value
      computeVerticalBlurPass.uniforms.params.sigma.value = value
    })
    .name('Sigma')

  gaussianFolder
    .add(gaussianParams, 'radius', 1, 15, 1)
    .onChange((value) => {
      computeHorizontalBlurPass.uniforms.params.radius.value = value
      computeVerticalBlurPass.uniforms.params.radius.value = value
    })
    .name('Radius')

  const compositeFolder = gui.addFolder('Composite pass')
  compositeFolder.add(compositePass.uniforms.params.strength, 'value', 0, 1.5, 0.1).name('Bloom strength')

  compositeFolder
    .add({ output: 0 }, 'output', { 'Composited result': 0, 'Original scene': 1, 'Bloom scene': 2 })
    .onChange((value) => {
      compositePass.uniforms.params.outputResult.value = value
    })
    .name('Output')
})
