import {
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  AmbientLight,
  PointLight,
  getPhong,
  Mesh,
  ShaderPass,
  PlaneGeometry,
  Mat4,
  Vec2,
  Vec3,
  RenderTarget,
  Texture,
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

  const nbLights = 100

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    lights: {
      maxPointLights: nbLights, // we'll use 100 point lights!
    },
  })

  const systemSize = new Vec3(30, 10, 30)

  // get the camera
  const { camera } = gpuCameraRenderer

  // create a camera pivot
  // so we can make the camera orbit while preserving a custom lookAt
  const cameraPivot = new Object3D()
  // add the scene as the pivot parent
  cameraPivot.parent = gpuCameraRenderer.scene

  camera.parent = cameraPivot
  camera.position.y = systemSize.y * 2
  camera.position.z = systemSize.z * 1.5

  camera.lookAt(new Vec3(0, systemSize.y * 0.125, 0))

  gpuDeviceManager.onBeforeRender(() => {
    // rotate our camera pivot
    cameraPivot.rotation.y += 0.005
  })

  // get sample count from url search params or default to 1
  // beware that MSAA + deferred rendering can be quite expensive!
  const url = new URL(window.location)
  const searchParams = new URLSearchParams(url.search)
  const urlSampleCount = searchParams.get('sampleCount') && parseInt(searchParams.get('sampleCount'))
  const sampleCount = urlSampleCount && urlSampleCount === 4 ? urlSampleCount : 1

  // Geometry buffer
  const gBufferDepthTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer depth texture',
    name: 'gBufferDepthTexture',
    type: 'depth',
    format: 'depth24plus',
    sampleCount,
  })

  const writeGBufferRenderTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Write GBuffer render target',
    sampleCount,
    renderToSwapChain: false, // we don't want to render to the swap chain
    colorAttachments: [
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'bgra8unorm-srgb', // albedo
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
      
      // use view space normal when dealing using a geometry buffer
      vsOutput.normal = getViewNormal(attributes.normal);
      
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

    cubeMesh.onBeforeRender(() => {
      cubeMesh.rotation.y += rotationSpeed
      cubeMesh.rotation.z += rotationSpeed
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

  // create 2 textures based on our GBuffer MRT output
  const gBufferAlbedoTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer albedo texture',
    name: 'gBufferAlbedoTexture',
    format: writeGBufferRenderTarget.outputTextures[0].format,
    fromTexture: writeGBufferRenderTarget.outputTextures[0],
  })

  const gBufferNormalTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer normal texture',
    name: 'gBufferNormalTexture',
    format: writeGBufferRenderTarget.outputTextures[1].format,
    fromTexture: writeGBufferRenderTarget.outputTextures[1],
  })

  // we could eventually make the light move in a compute shader
  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const color = new Vec3()

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.2,
  })

  const pointLights = []

  for (let i = 0, j = 0, k = 0; i < nbLights; i++, j += 4, k += 3) {
    pointLights.push(
      new PointLight(gpuCameraRenderer, {
        position: new Vec3(
          Math.random() * systemSize.x * Math.sign(Math.random() - 0.5),
          Math.random() * 5 + 2.5,
          Math.random() * systemSize.z * Math.sign(Math.random() - 0.5)
        ),
        color: color.copy(pink).lerp(blue, Math.random()),
        intensity: 1,
        range: 7.5 + Math.random() * 7.5,
      })
    )
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
    
    ${getPhong()}

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

      // cheap phong
      // library built-in is Blinn-Phong (more expensive)
      var reflectedLight: ReflectedLight;

      for (var i = 0i; i < pointLights.count; i++) {
        let L = pointLights.elements[i].position.xyz - position;
        let distance = length(L);
        
        if (distance > pointLights.elements[i].range) {
          continue;
        }
        
        let lightDir: vec3f = normalize(L);
        let attenuation: f32 = pow(1.0 - distance / pointLights.elements[i].range, 2.0);
        
        let NdotL = max(dot(normal, lightDir), 0.0);
        reflectedLight.directDiffuse += vec3(
          BRDF_Lambert(albedo) * NdotL * attenuation * pointLights.elements[i].color
        );
        
        // cheap phong specular
        let viewDir: vec3f = normalize(camera.position - position);
        let reflectDir: vec3f = reflect(-lightDir, normal);
        let spec: f32 = pow(max(dot(viewDir, reflectDir), 0.0), phong.shininess);

        reflectedLight.directSpecular += phong.specularStrength * spec * pointLights.elements[i].color * attenuation;
      }
      
      // ambient lights
      var irradiance: vec3f = vec3(0.0);
      RE_IndirectDiffuse(irradiance, albedo, &reflectedLight);
    
      result = reflectedLight.indirectDiffuse + reflectedLight.directDiffuse + reflectedLight.directSpecular;
      
    
      return vec4(linearTosRGB(result), 1.0);
    }
  `

  const deferredRenderingPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Deferred render pass',
    shaders: {
      fragment: {
        code: deferredPassFs,
      },
    },
    textures: [gBufferDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
    // we need all the renderer lights bindings
    bindings: [
      gpuCameraRenderer.bindings.ambientLights,
      gpuCameraRenderer.bindings.directionalLights,
      gpuCameraRenderer.bindings.pointLights,
      gpuCameraRenderer.bindings.spotLights,
    ],
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
          specularColor: {
            type: 'vec3f',
            value: new Vec3(1),
          },
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
    textures: [gBufferDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
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
