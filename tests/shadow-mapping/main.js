// goal of this test is to ensure we can render custom materials outside of the main scene loop
// for a real usecase, see the example section
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    PlaneGeometry,
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    RenderMaterial,
    Mesh,
    SphereGeometry,
    Texture,
    Vec3,
    RenderTarget,
    Sampler,
    Object3D,
    Mat4,
    BufferBinding,
  } = await import(/* @vite-ignore */ path)

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
  const { scene, camera } = gpuCameraRenderer

  // const cameraPivot = new Object3D()
  // cameraPivot.parent = scene

  camera.position.y = 10
  camera.position.z = 20

  camera.lookAt()

  //camera.parent = cameraPivot

  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.maxOrbit.x = Math.PI * 0.15
  orbitControls.zoomStep = 0.022
  orbitControls.minZoom = -5
  orbitControls.maxZoom = 15

  // render our scene manually
  const animate = () => {
    //cameraPivot.rotation.y += 0.005
    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  // LIGHT POSITION & MATRICES

  const lightPosition = new Vec3(15, 15, 15)

  const lightViewMatrix = new Mat4().makeView(lightPosition, new Vec3(0, 0, 0), new Vec3(0, 1, 0))

  const lightProjectionMatrix = new Mat4().makeOrthographic({
    left: -40,
    right: 40,
    bottom: -40,
    top: 40,
    near: 1,
    far: 200,
  })

  const lightViewProjMatrix = new Mat4().multiplyMatrices(lightProjectionMatrix, lightViewMatrix)

  // create one uniform buffer that will be used by all the meshes
  const lightBufferBinding = new BufferBinding({
    name: 'lightning',
    bindingType: 'uniform',
    struct: {
      lightViewProjectionMatrix: {
        type: 'mat4x4f',
        value: lightViewProjMatrix,
      },
      lightPosition: {
        type: 'vec3f',
        value: lightPosition,
      },
    },
  })

  // DEPTH RENDER TARGET

  //const shadowMapTextureFormat = 'depth32float'
  const shadowMapTextureFormat = 'depth24plus'
  // mandatory so we could use textureSampleCompare()
  const shadowDepthSampleCount = 1
  const shadowMapSize = 1024

  const shadowDepthTexture = new Texture(gpuCameraRenderer, {
    label: 'Shadow depth texture',
    name: 'shadowDepthTexture',
    type: 'depth',
    format: shadowMapTextureFormat,
    sampleCount: shadowDepthSampleCount,
    fixedSize: {
      width: shadowMapSize,
      height: shadowMapSize,
    },
  })

  const depthTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Shadow map render target',
    useColorAttachments: false,
    depthTexture: shadowDepthTexture,
    sampleCount: shadowDepthSampleCount,
  })

  const lessCompareSampler = new Sampler(gpuCameraRenderer, {
    label: 'Shadow sampler',
    name: 'shadowSampler',
    compare: 'less',
    type: 'comparison',
  })

  const depthVs = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> @builtin(position) vec4<f32> {
      return lightning.lightViewProjectionMatrix * matrices.model * vec4(attributes.position, 1.0);
    }
  `

  const meshVs = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      @location(1) shadowPos: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.normal = normalize(matrices.normal * attributes.normal);
      
      // XY is in (-1, 1) space, Z is in (0, 1) space
      let posFromLight = lightning.lightViewProjectionMatrix * matrices.model * vec4(attributes.position, 1.0);
    
      // Convert XY to (0, 1)
      // Y is flipped because texture coords are Y-down.
      vsOutput.shadowPos = vec3(
        posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
        posFromLight.z
      );
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      @location(1) shadowPos: vec3f,
    };
    
    const ambientFactor = 0.5;
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // Percentage-closer filtering. Sample texels in the region
      // to smooth the result.
      var visibility = 0.0;
      
      let size = f32(textureDimensions(shadowDepthTexture).y);
      
      let oneOverShadowDepthTextureSize = 1.0 / size;
      for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
          let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;
    
          visibility += textureSampleCompare(
            shadowDepthTexture,
            shadowSampler,
            fsInput.shadowPos.xy + offset,
            fsInput.shadowPos.z - 0.007
          );
        }
      }
      visibility /= 9.0;
      
      let lambertFactor = max(dot(normalize(lightning.lightPosition), normalize(fsInput.normal)), 0.0);
      let lightingFactor = min(ambientFactor + visibility * lambertFactor, 1.0);

      return vec4(lightingFactor * shading.color, 1.0);
    }
  `

  const depthMeshes = []

  // for each mesh that need to be rendered on the depth map
  const createMeshDepthMaterial = (mesh) => {
    const renderingOptions = { ...mesh.material.options.rendering }

    // explicitly set empty output targets
    // we just want to write to the depth texture
    renderingOptions.targets = []

    mesh.userData.depthMaterial = new RenderMaterial(gpuCameraRenderer, {
      label: mesh.options.label + ' Depth render material',
      ...renderingOptions,
      shaders: {
        vertex: {
          code: depthVs,
        },
        fragment: false,
      },
      sampleCount: depthTarget.renderPass.options.sampleCount,
      depthFormat: shadowMapTextureFormat,
      bindings: [lightBufferBinding, mesh.material.getBufferBindingByName('matrices')],
    })

    // keep track of original material as well
    mesh.userData.originalMaterial = mesh.material

    depthMeshes.push(mesh)
  }

  // create sphere

  const sphereGeometry = new SphereGeometry()

  const sphere = new Mesh(gpuCameraRenderer, {
    label: 'Sphere',
    geometry: sphereGeometry,
    textures: [shadowDepthTexture],
    samplers: [lessCompareSampler],
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    bindings: [lightBufferBinding],
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(1, 0, 0),
          },
        },
      },
    },
  })

  sphere.position.y = 3
  sphere.scale.set(2)

  let time = 0

  sphere.onBeforeRender(() => {
    time += 0.05
    sphere.position.y = 3 + Math.cos(time) * 1.5
  })

  createMeshDepthMaterial(sphere)

  console.log(gpuCameraRenderer.pipelineManager, sphere.userData)

  // create floor
  // the floor will not cast shadows, but it will receive them

  const planeGeometry = new PlaneGeometry()

  const boxPivot = new Object3D()
  boxPivot.parent = scene

  const floor = new Mesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: planeGeometry,
    textures: [shadowDepthTexture],
    samplers: [lessCompareSampler],
    frustumCulled: false, // always draw
    cullMode: 'none',
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    bindings: [lightBufferBinding],
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.35),
          },
        },
      },
    },
  })

  floor.parent = boxPivot
  floor.position.set(0, -1, -0.5)
  floor.rotation.set(-Math.PI / 2, 0, 0)
  floor.scale.set(30)

  // DEPTH PASS

  // add the depth pre-pass (rendered each tick before our main scene)
  gpuCameraRenderer.onBeforeRenderScene.add((commandEncoder) => {
    // assign depth material to meshes
    depthMeshes.forEach((mesh) => {
      mesh.useMaterial(mesh.userData.depthMaterial)
    })

    // reset renderer current pipeline
    gpuCameraRenderer.pipelineManager.resetCurrentPipeline()

    // begin depth pass
    const depthPass = commandEncoder.beginRenderPass(depthTarget.renderPass.descriptor)

    // render meshes with their depth material
    depthMeshes.forEach((mesh) => {
      if (mesh.ready) mesh.render(depthPass)
    })

    depthPass.end()

    // reset depth meshes material to use the original
    // so the scene renders them normally
    depthMeshes.forEach((mesh) => {
      mesh.useMaterial(mesh.userData.originalMaterial)
    })

    // reset renderer current pipeline again
    gpuCameraRenderer.pipelineManager.resetCurrentPipeline()
  })

  // DEBUG DEPTH

  const debugDepthVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;

      // just use the world matrix here, do not take the projection into account
      vsOutput.position = matrices.model * vec4(attributes.position, 1.0);
      vsOutput.uv = attributes.uv;
      
      return vsOutput;
    }
  `

  const debugDepthFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {          
      
      let rawDepth = textureSampleLevel(
        depthTexture,
        defaultSampler,
        fsInput.uv,
        0
      );
      
      // remap depth into something a bit more visible
      let depth = (1.0 - rawDepth);
      
      var color: vec4f = vec4(vec3(depth), 1.0);

      return color;
    }
  `

  const scale = new Vec3(0.15, 0.15 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)

  const debugPlane = new Mesh(gpuCameraRenderer, {
    label: 'Debug depth plane',
    geometry: new PlaneGeometry(),
    depthWriteEnabled: false,
    frustumCulled: false,
    visible: false,
    shaders: {
      vertex: {
        code: debugDepthVs,
      },
      fragment: {
        code: debugDepthFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          scale: {
            type: 'vec3f',
            value: scale,
          },
        },
      },
    },
  })

  const depthTexture = debugPlane.createTexture({
    label: 'Debug depth texture',
    name: 'depthTexture',
    type: 'depth',
    fromTexture: shadowDepthTexture,
  })

  debugPlane.transformOrigin.set(-1, -1, 0)

  debugPlane.scale.copy(scale)

  debugPlane.onAfterResize(() => {
    scale.set(0.15, 0.15 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)
    debugPlane.scale.copy(scale)
  })

  const debugViewButton = document.querySelector('#debug-view-button')
  let isDebug = false

  debugViewButton.addEventListener('click', () => {
    debugViewButton.classList.toggle('active')
    isDebug = !isDebug
    debugPlane.visible = isDebug
  })
})
