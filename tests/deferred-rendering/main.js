// Goal of this test is to test and help visualize depth textures
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/gpu-curtains.mjs'
  const {
    BoxGeometry,
    GPUCameraRenderer,
    GPUDeviceManager,
    Mesh,
    ShaderPass,
    SphereGeometry,
    PlaneGeometry,
    Mat4,
    Vec2,
    Vec3,
    RenderTarget,
    RenderTexture,
    Object3D,
  } = await import(/* @vite-ignore */ path)

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
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  const cameraPivot = new Object3D()

  camera.parent = cameraPivot
  camera.position.y = 12.5
  camera.position.z = 25

  camera.lookAt(new Vec3(0, 2, 0))

  // camera.position.y = 12.5
  // camera.position.z = 25
  // camera.lookAt()
  //
  // camera.position.y = 3
  // camera.position.z = 20

  // render our scene manually
  const animate = () => {
    //camera.rotation.y += 0.01
    cameraPivot.rotation.y += 0.005

    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  // MSAA does not work with deferred rendering
  const sampleCount = 1

  const gBufferDepthTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'GBuffer depth texture',
    name: 'gBufferDepthTexture',
    usage: 'depth',
    format: 'depth24plus',
    sampleCount,
  })

  const writeGBufferRenderTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Write GBuffer render target',
    sampleCount,
    shouldUpdateView: false,
    colorAttachments: [
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'bgra8unorm', // albedo
      },
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'rgba16float', // normals
      },
    ],
    depthTexture: gBufferDepthTexture,
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()

  const writeGBufferVs = /*wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = attributes.uv;
      
      // this is not the right way to do it!
      //vsOutput.normal = normalize((matrices.world * vec4(attributes.normal, 0.0)).xyz);
      //vsOutput.normal = normalize((matrices.modelView * vec4(attributes.normal, 0.0)).xyz);
      vsOutput.normal = normalize((normals.inverseTransposeMatrix * vec4(attributes.normal, 0.0)).xyz);
      //vsOutput.normal = attributes.normal;
      
      return vsOutput;
    }
  `

  const writeGBufferFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    struct GBufferOutput {
      // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
      @location(0) albedo : vec4<f32>,
      
      @location(1) normal : vec4<f32>,
    };
    
    @fragment fn main(fsInput: VSOutput) -> GBufferOutput {
      // faking some kind of checkerboard texture
      let uv = floor(5.0 * fsInput.uv);
      let c = 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));
      
      var output : GBufferOutput;
      
      output.normal = vec4(normalize(fsInput.normal), 1.0);
      output.albedo = vec4(vec3(c, c, c), 1.0);
    
      return output;
    }
  `

  for (let i = 0; i < 10; i++) {
    const cubeMesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: cubeGeometry,
      renderTarget: writeGBufferRenderTarget,
      additionalTargets: [
        {
          format: 'rgba16float', // this would be patched anyway if not set here
        },
      ],
      shaders: {
        vertex: {
          code: writeGBufferVs,
        },
        fragment: {
          code: writeGBufferFs,
        },
      },
      uniforms: {
        normals: {
          struct: {
            inverseTransposeMatrix: {
              type: 'mat4x4f',
              value: new Mat4(),
            },
          },
        },
      },
    })

    // cubeMesh.position.x = (i - 5) * 3
    // cubeMesh.position.z = (i - 5) * 3
    cubeMesh.position.x = Math.random() * 20 - 10
    cubeMesh.position.z = Math.random() * 20 - 10
    cubeMesh.position.y = Math.random() * 3 + 2

    let rotationSpeed = Math.random() * 0.02 - 0.01

    cubeMesh.onRender(() => {
      cubeMesh.rotation.y += rotationSpeed
      cubeMesh.rotation.z += rotationSpeed

      cubeMesh.uniforms.normals.inverseTransposeMatrix.value.copy(cubeMesh.worldMatrix).invert().transpose()
      cubeMesh.material.shouldUpdateInputsBindings('normals', 'inverseTransposeMatrix')
    })
  }

  const floor = new Mesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    renderTarget: writeGBufferRenderTarget,
    additionalTargets: [
      {
        format: 'rgba16float',
      },
    ],
    shaders: {
      vertex: {
        code: writeGBufferVs,
      },
      fragment: {
        code: writeGBufferFs,
      },
    },
    uniforms: {
      normals: {
        struct: {
          inverseTransposeMatrix: {
            type: 'mat4x4f',
            value: new Mat4(),
          },
        },
      },
    },
  })

  floor.rotation.x = -Math.PI / 2
  floor.scale.set(20, 20, 1)

  floor.onRender(() => {
    floor.uniforms.normals.inverseTransposeMatrix.value.copy(floor.worldMatrix).invert().transpose()
    floor.material.shouldUpdateInputsBindings('normals', 'inverseTransposeMatrix')
  })

  console.log(gpuCameraRenderer.renderPass, writeGBufferRenderTarget, floor)

  const gBufferAlbedoTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'GBuffer albedo texture',
    name: 'gBufferAlbedoTexture',
    format: writeGBufferRenderTarget.renderPass.options.colorAttachments[0].targetFormat,
    fromTexture: writeGBufferRenderTarget.renderPass.viewTextures[0],
    sampleCount,
  })

  const gBufferNormalTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'GBuffer normal texture',
    name: 'gBufferNormalTexture',
    format: writeGBufferRenderTarget.renderPass.options.colorAttachments[1].targetFormat,
    fromTexture: writeGBufferRenderTarget.renderPass.viewTextures[1],
    sampleCount,
  })

  const nbLights = 50
  const lightsRadius = new Float32Array(nbLights)
  const lightsPositions = new Float32Array(4 * nbLights)
  const lightsColors = new Float32Array(3 * nbLights)

  for (let i = 0, j = 0, k = 0; i < nbLights; i++, j += 4, k += 3) {
    lightsRadius[i] = 5 + Math.random() * 5

    lightsPositions[j] = Math.random() * 40 - 20
    lightsPositions[j + 1] = Math.random() * 10
    lightsPositions[j + 2] = Math.random() * 40 - 20
    lightsPositions[j + 3] = 1

    lightsColors[k] = Math.random() * 0.75 + 0.25
    lightsColors[k + 1] = Math.random() * 0.75 + 0.25
    lightsColors[k + 2] = Math.random() * 0.75 + 0.25
  }

  // DEFERRED RENDERING

  const deferredPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    fn world_from_screen_coord(coord : vec2<f32>, depth_sample: f32) -> vec3<f32> {
      // reconstruct world-space position from the screen coordinate.
      let posClip = vec4(coord.x * 2.0 - 1.0, (1.0 - coord.y) * 2.0 - 1.0, depth_sample, 1.0);
      let posWorldW = params.cameraInverseViewProjectionMatrix * posClip;
      let posWorld = posWorldW.xyz / posWorldW.www;
      return posWorld;
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {     
      var result : vec3<f32>;

      let depth = textureLoad(
        gBufferDepthTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      );
    
      // Don't light the sky.
      if (depth >= 1.0) {
        discard;
      }
    
      let bufferSize = textureDimensions(gBufferDepthTexture);
      let coordUV = fsInput.position.xy / vec2<f32>(bufferSize);
      let position = world_from_screen_coord(coordUV, depth);
    
      let normal = textureLoad(
        gBufferNormalTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      ).xyz;
    
      let albedo = textureLoad(
        gBufferAlbedoTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      ).rgb;

      
      for (var i = 0u; i < arrayLength(&lights); i++) {
        let L = lights[i].position.xyz - position;
        let distance = length(L);
        if (distance > lights[i].radius) {
          continue;
        }
        let lambert = max(dot(normal, normalize(L)), 0.0);
        result += vec3<f32>(
          lambert * pow(1.0 - distance / lights[i].radius, 2.0) * lights[i].color * albedo
        );
      }
      
          
      // some manual ambient
      result += vec3(0.2);
    
      return vec4(result, 1.0);
    }
  `

  const deferredRenderingPass = new ShaderPass(gpuCameraRenderer, {
    shaders: {
      fragment: {
        code: deferredPassFs,
      },
    },
    renderTextures: [gBufferDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
    uniforms: {
      params: {
        struct: {
          cameraInverseViewProjectionMatrix: {
            type: 'mat4x4f',
            value: new Mat4().multiplyMatrices(camera.projectionMatrix, camera.viewMatrix).invert(),
          },
        },
      },
    },
    storages: {
      lights: {
        struct: {
          position: {
            type: 'array<vec4f>',
            value: lightsPositions,
          },
          color: {
            type: 'array<vec3f>',
            value: lightsColors,
          },
          radius: {
            type: 'array<f32>',
            value: lightsRadius,
          },
        },
      },
    },
  })

  deferredRenderingPass.onRender(() => {
    deferredRenderingPass.uniforms.params.cameraInverseViewProjectionMatrix.value
      .multiplyMatrices(camera.projectionMatrix, camera.viewMatrix)
      .invert()

    deferredRenderingPass.material.shouldUpdateInputsBindings('params', 'cameraInverseViewProjectionMatrix')
  })

  // DEBUG VIEW

  const debugPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {      
      var result : vec4<f32>;
      
      if (fsInput.uv.x < 0.33333) {
        let rawDepth = textureLoad(
          gBufferDepthTexture,
          vec2<i32>(floor(fsInput.position.xy)),
          0
        );
        // remap depth into something a bit more visible
        let depth = (1.0 - rawDepth) * 500.0;
        result = vec4(depth);
      } else if (fsInput.uv.x < 0.66667) {
        result = textureLoad(
          gBufferNormalTexture,
          vec2<i32>(floor(fsInput.position.xy)),
          0
        );
        result.x = (result.x + 1.0) * 0.5;
        result.y = (result.y + 1.0) * 0.5;
        result.z = (result.z + 1.0) * 0.5;
      } else {
        result = textureLoad(
          gBufferAlbedoTexture,
          vec2<i32>(floor(fsInput.position.xy)),
          0
        );
      }
      
      return result;
    }
  `

  const debugViewPass = new ShaderPass(gpuCameraRenderer, {
    shaders: {
      fragment: {
        code: debugPassFs,
      },
    },
    renderTextures: [gBufferDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
    visible: false,
  })

  const debugViewButton = document.querySelector('#debug-view-button')
  let isDebug = false

  debugViewButton.addEventListener('click', () => {
    debugViewButton.classList.toggle('active')
    isDebug = !isDebug

    if (isDebug) {
      deferredRenderingPass.visible = false
      debugViewPass.visible = true
    } else {
      deferredRenderingPass.visible = true
      debugViewPass.visible = false
    }
  })

  console.log(deferredRenderingPass)
  console.log(gpuCameraRenderer.scene)
  gpuCameraRenderer.scene.logRenderCommands()
})
