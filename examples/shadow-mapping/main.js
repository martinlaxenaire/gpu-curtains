import {
  PlaneGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  RenderMaterial,
  Mesh,
  SphereGeometry,
  Texture,
  Vec3,
  RenderTarget,
  Sampler,
  Object3D,
  Mat4,
  BoxGeometry,
  BufferBinding,
} from '../../dist/esm/index.mjs'

// Shadow mapping
//
// the idea is to render the scene objects twice:
// 1. In a render target that just renders to a shadow map depth texture, with only a vertex shader (the vertex shader returned position is the light view projection matrix multiplied by the object world matrix)
//
// 2. To the screen, using the previous shadow map depth texture to shade the objects
//
//
// refs:
// https://webgpu.github.io/webgpu-samples/samples/shadowMapping
// https://github.com/jack1232/webgpu-new-video-series/blob/video08/src/examples/sc02/shadow.ts

window.addEventListener('load', async () => {
  const systemSize = 10

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
  camera.position.z = systemSize * 4.5

  // lerp camera look at based on mouse/touch move
  const cameraLookAt = new Vec3()
  const lerpLookAt = new Vec3()

  const onPointerMove = (e) => {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e
    const { width, height } = gpuCameraRenderer.boundingRect

    lerpLookAt.set((3 * (clientX - width * 0.5)) / width, (-3 * (clientY - height * 0.5)) / height, 0)
  }

  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove)

  const meshesPivot = new Object3D()
  meshesPivot.parent = scene
  meshesPivot.position.z = systemSize * 0.5

  // render our scene manually
  const animate = () => {
    meshesPivot.rotation.y -= 0.01
    camera.lookAt(cameraLookAt.lerp(lerpLookAt, 0.05))

    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  // LIGHT POSITION & MATRICES

  const lightPosition = new Vec3(systemSize * 3, systemSize * 1.5, systemSize * 3)

  const lightViewMatrix = new Mat4().makeView(
    lightPosition,
    new Vec3(-systemSize * 2, -systemSize * 2, -systemSize * 2),
    new Vec3(0, 1, 0)
  )

  const lightProjectionMatrix = new Mat4().makeOrthographic({
    left: -systemSize * 5,
    right: systemSize * 5,
    bottom: -systemSize * 5,
    top: systemSize * 5,
    near: 1,
    far: systemSize * 30,
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
      @location(2) lightViewDirection: vec3f,
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
      
      // normals are in view space, so convert light direction to view space as well
      vsOutput.lightViewDirection = (
        camera.view * vec4(
          normalize(lightning.lightPosition - attributes.position),
          0.0
        )
      ).xyz;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      @location(1) shadowPos: vec3f,
      @location(2) lightViewDirection: vec3f,
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
      
      let lambertFactor = max(dot(normalize(fsInput.lightViewDirection), normalize(fsInput.normal)), 0.0);
      let lightingFactor = min(ambientFactor + visibility * lambertFactor, 1.0);

      return vec4(lightingFactor * shading.color, 1.0);
    }
  `

  const depthMeshes = []

  // for each mesh that need to be rendered on the depth map
  const createMeshDepthMaterial = (mesh) => {
    mesh.userData.depthMaterial = new RenderMaterial(gpuCameraRenderer, {
      label: mesh.options.label + ' Depth render material',
      ...mesh.material.options.rendering,
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

  // create meshes

  const sphereGeometry = new SphereGeometry()
  const cubeGeometry = new BoxGeometry()

  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const grey = new Vec3(0.35)

  for (let i = 0; i < 25; i++) {
    const isCube = i % 2 === 1

    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Mesh ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
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
              value: isCube ? grey : Math.random() > 0.5 ? blue : pink,
            },
          },
        },
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

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = (Math.random() * 0.01 + 0.01) * Math.sign(Math.random() - 0.5)

    mesh
      .onBeforeRender(() => {
        // onBeforeRender is just called once before updating the Scene matrix stack
        mesh.rotation.y += rotationSpeed
        mesh.rotation.z += rotationSpeed
      })
      .onRender(() => {
        // onRender is called when rendering the depth pass and the shading pass
        // be sure we're actually rendering the shading pass
        if (mesh.uniforms.normals) {
          mesh.uniforms.normals.inverseTransposeMatrix.value.copy(mesh.worldMatrix).invert().transpose()
          mesh.uniforms.normals.inverseTransposeMatrix.shouldUpdate = true
        }
      })

    createMeshDepthMaterial(mesh)

    mesh.parent = meshesPivot
  }

  // create walls

  const planeGeometry = new PlaneGeometry()

  const boxPivot = new Object3D()
  boxPivot.parent = scene

  const aspectRatio = gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height
  boxPivot.scale.set(systemSize * 2 * aspectRatio, systemSize * 2, systemSize * 2)

  gpuCameraRenderer.onAfterResize(() => {
    const aspectRatio = gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height
    boxPivot.scale.set(systemSize * 2 * aspectRatio, systemSize * 2, systemSize * 2)
  })

  const createBoxWall = (label = 'Wall', position = new Vec3(), rotation = new Vec3()) => {
    const wall = new Mesh(gpuCameraRenderer, {
      label,
      geometry: planeGeometry,
      textures: [shadowDepthTexture],
      samplers: [lessCompareSampler],
      frustumCulled: false, // always draw the walls
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
              value: new Vec3(0.5),
            },
          },
        },
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

    wall.onRender(() => {
      // onRender is called when rendering the depth pass and the shading pass
      // be sure we're actually rendering the shading pass
      if (wall.uniforms.normals) {
        wall.uniforms.normals.inverseTransposeMatrix.value.copy(wall.worldMatrix).invert().transpose()
        wall.uniforms.normals.inverseTransposeMatrix.shouldUpdate = true
      }
    })

    createMeshDepthMaterial(wall)

    wall.parent = boxPivot
    wall.position.copy(position)
    wall.rotation.copy(rotation)
  }

  createBoxWall('Back wall', new Vec3(0, 0, -1.5))
  createBoxWall('Bottom wall', new Vec3(0, -1, -0.5), new Vec3(-Math.PI / 2, 0, 0))
  createBoxWall('Left wall', new Vec3(-1, 0, -0.5), new Vec3(0, Math.PI / 2, 0))
  createBoxWall('Top wall', new Vec3(0, 1, -0.5), new Vec3(Math.PI / 2, 0, 0))
  createBoxWall('Right wall', new Vec3(1, 0, -0.5), new Vec3(0, -Math.PI / 2, 0))

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
