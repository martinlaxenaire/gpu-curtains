import {
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  Mesh,
  ShaderPass,
  PlaneGeometry,
  Mat4,
  Vec2,
  Vec3,
  RenderTarget,
  RenderTexture,
  Object3D,
} from '../../dist/esm/index.mjs'

// inspired by https://webgpu.github.io/webgpu-samples/samples/deferredRendering
window.addEventListener('load', async () => {
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

  const systemSize = new Vec3(30, 10, 30)

  // get the camera
  const { camera } = gpuCameraRenderer

  // create a camera pivot
  // so we can make the camera orbit while preserving a custom lookAt
  const cameraPivot = new Object3D()

  camera.parent = cameraPivot
  camera.position.y = systemSize.y * 2
  camera.position.z = systemSize.z * 1.5

  camera.lookAt(new Vec3(0, systemSize.y * 0.125, 0))

  // render our scene manually
  const animate = () => {
    // rotate our camera pivot
    cameraPivot.rotation.y += 0.005

    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  // MSAA does not work with deferred rendering
  const sampleCount = 1

  // Geometry buffer
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
    shouldUpdateView: false, // we don't want to render to the swap chain
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
      
      vsOutput.normal = normalize((normals.inverseTransposeMatrix * vec4(attributes.normal, 0.0)).xyz);
      
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
      //let uv = floor(params.checkerBoard * fsInput.uv);
      //var c = 0.2 + 0.5 * ((uv.x + uv.y) - 2.0 * floor((uv.x + uv.y) / 2.0));
      //c = 0.5;
      
      var output : GBufferOutput;
      
      output.normal = vec4(normalize(fsInput.normal), 1.0);
      output.albedo = vec4(shading.color, 1.0);
    
      return output;
    }
  `

  // we are going to put the cubes in cell grid
  // and then move them randomly a bit in their cells
  // to create a sense of "organized chaos"
  const gridDefinition = new Vec2(6, 6)
  const cellGridIndex = new Vec2()
  const cellSize = new Vec2(systemSize.x, systemSize.y).divide(gridDefinition)

  for (let i = 0; i < gridDefinition.x * gridDefinition.y; i++) {
    const cubeMesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: cubeGeometry,
      outputTarget: writeGBufferRenderTarget,
      // for the sake of clarity we are going to specify the targets formats
      // but they would be patched anyway if not set here
      targets: [
        {
          format: 'bgra8unorm', // albedo
        },
        {
          format: 'rgba16float', // normals
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
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: new Vec3(0.75),
            },
          },
        },
      },
    })

    // put in a grid
    cellGridIndex.set(
      (i % gridDefinition.x) - (gridDefinition.x - 1) * 0.5,
      Math.floor(i / gridDefinition.y) - (gridDefinition.y - 1) * 0.5
    )

    cubeMesh.position.x =
      cellGridIndex.x * (systemSize.x / (gridDefinition.x * 0.5)) + (Math.random() - 0.5) * cellSize.x * 1.25
    cubeMesh.position.z =
      cellGridIndex.y * (systemSize.z / (gridDefinition.y * 0.5)) + (Math.random() - 0.5) * cellSize.y * 1.25

    cubeMesh.position.y = Math.random() * 2 + 1.5

    const rotationSpeed = (Math.random() * 0.01 + 0.01) * Math.sign(Math.random() - 0.5)

    cubeMesh.onRender(() => {
      cubeMesh.rotation.y += rotationSpeed
      cubeMesh.rotation.z += rotationSpeed

      cubeMesh.uniforms.normals.inverseTransposeMatrix.value.copy(cubeMesh.worldMatrix).invert().transpose()
      // explicitly tell the uniform to update
      cubeMesh.uniforms.normals.inverseTransposeMatrix.shouldUpdate = true
    })
  }

  const floor = new Mesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    outputTarget: writeGBufferRenderTarget,
    // for the sake of clarity we are going to specify the targets formats
    // but they would be patched anyway if not set here
    targets: [
      {
        format: 'bgra8unorm', // albedo
      },
      {
        format: 'rgba16float', // normals
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
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.5),
          },
        },
      },
    },
  })

  floor.rotation.x = -Math.PI / 2
  floor.scale.set(systemSize.x, systemSize.z, 1)

  floor.onRender(() => {
    floor.uniforms.normals.inverseTransposeMatrix.value.copy(floor.worldMatrix).invert().transpose()
    // explicitly tell the uniform to update
    floor.uniforms.normals.inverseTransposeMatrix.shouldUpdate = true
  })

  // create 2 textures based on our GBuffer MRT output
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

  // we could eventually make the light move in a compute shader
  const nbLights = 100
  const lightsRadius = new Float32Array(nbLights)
  const lightsPositions = new Float32Array(4 * nbLights)
  const lightsColors = new Float32Array(3 * nbLights)
  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const color = new Vec3()

  for (let i = 0, j = 0, k = 0; i < nbLights; i++, j += 4, k += 3) {
    lightsRadius[i] = 7.5 + Math.random() * 7.5

    lightsPositions[j] = Math.random() * systemSize.x * Math.sign(Math.random() - 0.5)
    lightsPositions[j + 1] = Math.random() * 5 + 2.5
    lightsPositions[j + 2] = Math.random() * systemSize.z * Math.sign(Math.random() - 0.5)
    lightsPositions[j + 3] = 1

    color.copy(pink).lerp(blue, Math.random())

    lightsColors[k] = color.x
    lightsColors[k + 1] = color.y
    lightsColors[k + 2] = color.z
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
      let posWorldW = camera.inverseViewProjectionMatrix * posClip;
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
        
        let lightDir: vec3f = normalize(L);
        let lightStrength: f32 = pow(1.0 - distance / lights[i].radius, 2.0);
        
        let lambert = max(dot(normal, lightDir), 0.0);
        result += vec3<f32>(
          lambert * lightStrength * lights[i].color
        );
        
        // specular
        let viewDir: vec3f = normalize(camera.position - position);
        let reflectDir: vec3f = reflect(-lightDir, normal);
        let spec: f32 = pow(max(dot(viewDir, reflectDir), 0.0), phong.shininess);
        let specular: vec3f = phong.specularStrength * spec * lights[i].color * lightStrength;
        
        result += specular;
      }
          
      // some manual ambient
      result += vec3(0.2);
      
      // albedo
      result *= albedo;
    
      return vec4(result, 1.0);
    }
  `

  const deferredRenderingPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Deferred render pass',
    shaders: {
      fragment: {
        code: deferredPassFs,
      },
    },
    renderTextures: [gBufferDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
    uniforms: {
      camera: {
        struct: {
          inverseViewProjectionMatrix: {
            type: 'mat4x4f',
            value: new Mat4().multiplyMatrices(camera.projectionMatrix, camera.viewMatrix).invert(),
          },
          position: {
            type: 'vec3f',
            value: camera.position,
          },
        },
      },
      phong: {
        struct: {
          specularStrength: {
            type: 'f32',
            value: 0.5,
          },
          shininess: {
            type: 'f32',
            value: 32,
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
    deferredRenderingPass.uniforms.camera.inverseViewProjectionMatrix.value
      .multiplyMatrices(camera.projectionMatrix, camera.viewMatrix)
      .invert()

    // explicitly tell the uniform to update
    deferredRenderingPass.uniforms.camera.inverseViewProjectionMatrix.shouldUpdate = true
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
        let depth = (1.0 - rawDepth) * 100.0;
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
})
