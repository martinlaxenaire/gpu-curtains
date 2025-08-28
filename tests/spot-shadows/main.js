// goal of this test is to ensure we can render custom materials outside of the main scene loop
// for a real usecase, see the example section

window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    PlaneGeometry,
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    AmbientLight,
    DirectionalLight,
    SpotLight,
    Sampler,
    Mesh,
    LitMesh,
    BoxGeometry,
    Vec3,
    Object3D,
  } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

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

  gpuDeviceManager
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

  // get the camera
  const { camera } = gpuCameraRenderer

  camera.position.y = 5
  camera.position.z = 12.5

  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.domElement.element,
  })

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  // directional light

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    label: 'White directional light',
    position: new Vec3(10, 5, 10),
    target: new Vec3(0, 1, 0),
    intensity: 1,
  })

  // point light

  const pink = new Vec3(1, 0, 1)

  const spotLight = new SpotLight(gpuCameraRenderer, {
    label: 'Pink spot light',
    color: pink,
    position: new Vec3(-3, 4, 0),
    target: new Vec3(0, 1, 0),
    intensity: 40,
    range: 30,
    penumbra: 0.4,
    shadow: {
      intensity: 1,
      normalBias: 0.01,
      // depthTextureFormat: 'depth32float',
      camera: {
        near: 0.5,
      },
    },
  })

  spotLight.userData.time = 0

  spotLight.onBeforeRender(() => {
    spotLight.target.x = (Math.cos(spotLight.userData.time) * 0.5 - 0.5) * 3
    spotLight.userData.time += 0.01
  })

  console.log(spotLight.shadow)

  const spotLightHelper = new LitMesh(gpuCameraRenderer, {
    label: 'Spot light helper',
    geometry: new BoxGeometry(),
    material: {
      shading: 'Unlit',
      color: pink,
    },
  })

  spotLightHelper.scale.set(0.3, 0.3, 0.025)
  spotLightHelper.parent = spotLight

  const floorPivot = new Object3D()
  floorPivot.parent = gpuCameraRenderer.scene

  const floor = new LitMesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: new PlaneGeometry(),
    receiveShadows: true,
    frustumCulling: false, // always draw
    cullMode: 'none',
    material: {
      shading: 'Lambert',
      color: new Vec3(0.6),
    },
  })

  floor.parent = floorPivot
  floor.rotation.set(-Math.PI / 2, 0, 0)
  floor.scale.set(100)

  // create meshes
  const mesh = new LitMesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    castShadows: true,
    material: {
      shading: 'Phong',
      color: new Vec3(0.75),
      specularColor: new Vec3(1),
      specularIntensity: 1,
      shininess: 64,
    },
  })

  mesh.position.y = 1

  spotLight.shadow.depthMeshes.forEach(async (depthMesh) => {
    console.log('DEPTH VERTEX SHADER >>>\n\n', await depthMesh.material.getShaderCode('vertex'))
    console.log('DEPTH FRAGMENT SHADER >>>\n\n', await depthMesh.material.getShaderCode('fragment'))
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
      let rawDepth = textureSampleCompare(
        depthTexture,
        debugDepthSampler,
        fsInput.uv,
        0.99
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
    visible: true,
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
    fromTexture: spotLight.shadow.depthTexture,
  })

  debugPlane.transformOrigin.set(-1, -1, 0)

  debugPlane.scale.copy(scale)

  debugPlane.onAfterResize(() => {
    scale.set(0.15, 0.15 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)
    debugPlane.scale.copy(scale)
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Spot shadows test',
  })

  const meshFolder = gui.addFolder('Mesh')
  const meshPosFolder = meshFolder.addFolder('Position')
  meshPosFolder.add(mesh.position, 'x', -10, 10, 0.25)
  meshPosFolder.add(mesh.position, 'y', -1, 10, 0.25)
  meshPosFolder.add(mesh.position, 'z', -10, 10, 0.25)

  const spotLightFolder = gui.addFolder('Spot light')

  spotLightFolder.add(spotLight, 'intensity', 0, 100, 0.01)
  spotLightFolder.add(spotLight, 'range', 0, 100, 0.25)
  spotLightFolder.add(spotLight, 'angle', 0, Math.PI / 2, Math.PI / 20)
  spotLightFolder.add(spotLight, 'penumbra', 0, 1, 0.1)

  spotLightFolder
    .addColor({ color: { r: spotLight.color.x, g: spotLight.color.y, b: spotLight.color.z } }, 'color')
    .onChange((value) => {
      spotLight.color.set(value.r, value.g, value.b)
    })

  const spotLightPosFolder = spotLightFolder.addFolder('Position')
  spotLightPosFolder.add(spotLight.position, 'x', -10, 10, 0.25)
  spotLightPosFolder.add(spotLight.position, 'y', -1, 10, 0.25)
  spotLightPosFolder.add(spotLight.position, 'z', -10, 10, 0.25)

  if (spotLight.shadow.isActive) {
    const pointShadow = spotLightFolder.addFolder('Shadow')
    const pointShadowCamera = pointShadow.addFolder('Camera')

    pointShadowCamera.add(spotLight.shadow.camera, 'near', 0.01, 3, 0.01).name('near plane')

    pointShadow.add(spotLight.shadow, 'intensity', 0, 1, 0.005)
    pointShadow.add(spotLight.shadow, 'bias', 0, 0.01, 0.0001)
    pointShadow.add(spotLight.shadow, 'normalBias', 0, 0.01, 0.0001)
    pointShadow.add(spotLight.shadow, 'pcfSamples', 1, 5, 1)
    pointShadow
      .add(spotLight.shadow.depthTextureSize, 'x', 128, 1024, 64)
      .name('Texture width')
      .onChange(() => {
        depthTexture.copy(spotLight.shadow.depthTexture)
      })
    pointShadow
      .add(spotLight.shadow.depthTextureSize, 'y', 128, 1024, 64)
      .name('Texture height')
      .onChange(() => {
        depthTexture.copy(spotLight.shadow.depthTexture)
      })

    const debugFolder = pointShadow.addFolder('Debug shadow depth texture')
    debugFolder.add(debugPlane, 'visible').name('Visible')
  }
})
