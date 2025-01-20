import {
  PlaneGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  AmbientLight,
  DirectionalLight,
  getLambert,
  Mesh,
  SphereGeometry,
  Vec2,
  Vec3,
  Object3D,
  BoxGeometry,
  Sampler,
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

  // rotate pivot each frame
  gpuDeviceManager.onBeforeRender(() => {
    meshesPivot.rotation.y -= 0.01
    camera.lookAt(cameraLookAt.lerp(lerpLookAt, 0.05))
  })

  // LIGHTS & SHADOWS SETUP
  //const shadowMapTextureFormat = 'depth32float'
  const shadowMapTextureFormat = 'depth24plus'
  const shadowMapSize = 1024

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.2,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize * 6, systemSize * 4.5, systemSize * 6),
    intensity: 1,
    shadow: {
      bias: 0.007,
      //normalBias: 0.001,
      depthTextureSize: new Vec2(shadowMapSize),
      depthTextureFormat: shadowMapTextureFormat,
      camera: {
        left: -systemSize * 2,
        right: systemSize * 2,
        bottom: -systemSize * 2,
        top: systemSize * 2,
        near: 1,
        far: systemSize * 30,
      },
    },
  })

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @builtin(front_facing) frontFacing: bool,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };
    
    ${getLambert({
      receiveShadows: true,
    })}
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // negate the normals if we're using front face culling
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      
      // apply lightning and shadows
      let normal: vec3f = normalize(faceDirection * fsInput.normal);
      
      let worldPosition: vec3f = fsInput.worldPosition;
      
      var color: vec3f = shading.color;
      
      color = getLambert(
        normal,
        worldPosition,
        color
      );
      
      return vec4(color, 1.0);
    }
  `

  // create meshes

  const sphereGeometry = new SphereGeometry()
  const cubeGeometry = new BoxGeometry()

  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const grey = new Vec3(0.2)

  for (let i = 0; i < 25; i++) {
    const isCube = i % 2 === 1

    const mesh = new Mesh(gpuCameraRenderer, {
      label: 'Mesh ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      shaders: {
        fragment: {
          code: meshFs,
        },
      },
      castShadows: true,
      receiveShadows: true,
      uniforms: {
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: isCube ? grey : Math.random() > 0.5 ? blue : pink,
            },
          },
        },
      },
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = (Math.random() * 0.01 + 0.01) * Math.sign(Math.random() - 0.5)

    mesh.onBeforeRender(() => {
      // onBeforeRender is just called once before updating the Scene matrix stack
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })

    mesh.parent = meshesPivot
  }

  // create a wrapping box
  // the box will not cast shadows, but it will receive them
  // it will be drawn by culling the front faces
  const wrappingBox = new Mesh(gpuCameraRenderer, {
    label: 'Wrapping box',
    geometry: cubeGeometry,
    cullMode: 'front',
    receiveShadows: true,
    frustumCulling: false, // always draw the walls
    shaders: {
      fragment: {
        code: meshFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.85),
          },
        },
      },
    },
  })

  const setWrappingBoxScale = () => {
    const visibleWidth = camera.getVisibleSizeAtDepth()
    // should be multiplied by 0.5 to exactly fit the window sizes
    // since we're gonna move the camera a bit, make the cube overflow a bit
    // so we never see its edges
    wrappingBox.scale.x = visibleWidth.width * 0.6
    wrappingBox.scale.y = visibleWidth.height * 0.6
  }

  wrappingBox.scale.z = systemSize * 3
  //wrappingBox.position.z = -wrappingBox.scale.z * 0.5

  setWrappingBoxScale()

  wrappingBox.onAfterResize(setWrappingBoxScale)

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
      
      let rawDepth = textureSampleCompare(
        depthTexture,
        debugDepthSampler,
        fsInput.uv,
        0.1
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
    frustumCulling: false,
    visible: false,
    samplers: [
      new Sampler(gpuCameraRenderer, {
        label: 'Debug depth sampler',
        name: 'debugDepthSampler',
        type: 'comparison',
        compare: 'less',
      }),
    ],
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
    //fromTexture: shadowDepthTexture,
    fromTexture: directionalLight.shadow.depthTexture,
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
