// Geometry buffer test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    Texture,
    RenderTarget,
    Mesh,
    Vec3,
    ShaderPass,
  } = await import(/* @vite-ignore */ path)

  // get sample count from url search params or default to 1
  // beware that MSAA + deferred rendering can be quite expensive!
  const url = new URL(window.location)
  const searchParams = new URLSearchParams(url.search)
  const urlSampleCount = searchParams.get('sampleCount') && parseInt(searchParams.get('sampleCount'))
  const sampleCount = urlSampleCount && urlSampleCount === 4 ? urlSampleCount : 1

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
  })

  const { camera } = gpuCameraRenderer
  const zPos = 50

  camera.position.z = zPos

  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.zoomSpeed = zPos * 0.1
  orbitControls.minZoom = zPos * 0.1
  orbitControls.maxZoom = zPos * 3

  let visibleSize = camera.getVisibleSizeAtDepth()

  gpuCameraRenderer.onResize(() => {
    visibleSize = camera.getVisibleSizeAtDepth()
  })

  // Geometry buffer target
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
        targetFormat: 'rgba8unorm-srgb', // albedo
      },
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'bgra8unorm', // normals, encoded to [0, 1] in g-buffer
      },
    ],
    depthTexture: gBufferDepthTexture,
  })

  // Add meshes
  const cubeGeometry = new BoxGeometry()

  const NB_MESHES = 100
  const meshPositions = []
  for (let i = 0; i < NB_MESHES; i++) {
    meshPositions.push(new Vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1))
  }

  const setMeshPosition = (mesh, index) => {
    mesh.position.set(
      meshPositions[index].x * visibleSize.width * 0.4,
      meshPositions[index].y * visibleSize.height * 0.4,
      meshPositions[index].z * zPos * 0.25
    )
  }

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
      var output : GBufferOutput;
      
      let n = normalize(fsInput.normal);
      output.normal = vec4(n * 0.5 + 0.5, 1.0);
      output.albedo = vec4(shading.color, 1.0);
    
      return output;
    }
  `

  for (let i = 0; i < NB_MESHES; i++) {
    const mesh = new Mesh(gpuCameraRenderer, {
      label: `Cube ${i}`,
      geometry: cubeGeometry,
      outputTarget: writeGBufferRenderTarget,
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
              value: Math.random() > 0.5 ? new Vec3(0, 1, 1) : new Vec3(1, 0, 1),
            },
          },
        },
      },
    })

    setMeshPosition(mesh, i)

    const randomRotation = new Vec3(Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02)

    mesh
      .onBeforeRender(() => {
        mesh.rotation.add(randomRotation)
      })
      .onAfterResize(() => {
        setMeshPosition(mesh, i)
      })
  }

  // G-buffer output
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

  const gBufferResultingDepthTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer resulting depth texture',
    name: 'gBufferDepthTexture',
    fromTexture: gBufferDepthTexture,
  })

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
          vec2<i32>(fsInput.position.xy),
          0
        ).x;
        // remap depth into something a bit more visible
        let depth = (1.0 - rawDepth) * 200.0;
        result = vec4(depth);
      } else if (fsInput.uv.x < 0.66667) {
        result = textureLoad(
          gBufferNormalTexture,
          vec2<i32>(fsInput.position.xy),
          0
        );
      } else {
        result = textureLoad(
          gBufferAlbedoTexture,
          vec2<i32>(fsInput.position.xy),
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
    textures: [gBufferResultingDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
    targets: [
      {
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
          },
        },
      },
    ],
  })
})
