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
    PointLight,
    Sampler,
    Mesh,
    LitMesh,
    SphereGeometry,
    BoxGeometry,
    Vec3,
    Object3D,
    BufferBinding,
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
    // lights: {
    //   maxPointLights: 1,
    //   useUniformsForShadows: true,
    // },
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

  const pointLightPivot = new Object3D()
  pointLightPivot.parent = gpuCameraRenderer.scene

  const pointLight = new PointLight(gpuCameraRenderer, {
    label: 'Pink point light',
    position: new Vec3(0, 1, 0),
    color: pink,
    intensity: 40,
    shadow: {
      intensity: 1,
      // depthTextureFormat: 'depth32float',
      camera: {
        near: 0.01,
        far: 200,
      },
    },
  })

  pointLight.parent = pointLightPivot

  const pointLightHelper = new LitMesh(gpuCameraRenderer, {
    label: 'Point light helper',
    geometry: new SphereGeometry(),
    material: {
      shading: 'Unlit',
      color: pink,
    },
  })

  pointLightHelper.scale.set(0.1)
  pointLightHelper.parent = pointLight

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

  mesh.position.x = -3
  mesh.position.y = 1

  // pointLight.shadow.depthMeshes.forEach(async (depthMesh) => {
  //   console.log('DEPTH VERTEX SHADER >>>\n\n', await depthMesh.material.getShaderCode('vertex'))
  //   console.log('DEPTH FRAGMENT SHADER >>>\n\n', await depthMesh.material.getShaderCode('fragment'))
  // })

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

    fn faceDirection(face: u32, uv: vec2f) -> vec3f {
      switch(face) {
        case 0u: { return vec3( 1.0,  uv.y,  -uv.x); }  // +X
        case 1u: { return vec3(-1.0,  uv.y,   uv.x); }  // -X
        case 2u: { return vec3( uv.x,  -1.0,  uv.y); }  // +Y
        case 3u: { return vec3( uv.x,  1.0,  -uv.y); }  // -Y
        case 4u: { return vec3( uv.x,  uv.y,  1.0); }  // +Z
        default: { return vec3(-uv.x,  uv.y, -1.0); }   // -Z
      }
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      let uv = fsInput.uv * 2.0 - 1.0;

      let dir = normalize(faceDirection(params.faceIndex, uv));

      let rawDepth = textureSampleCompare(
        depthTexture,
        debugDepthSampler,
        dir,
        0.5
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
    lighting: false,
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
          faceIndex: {
            type: 'u32',
            value: 0,
          },
        },
      },
    },
  })

  const depthTexture = debugPlane.createTexture({
    label: 'Debug depth texture',
    name: 'depthTexture',
    type: 'depth',
    fromTexture: pointLight.shadow.depthTexture,
  })

  debugPlane.transformOrigin.set(-1, -1, 0)

  debugPlane.scale.copy(scale)

  debugPlane.onAfterResize(() => {
    scale.set(0.15, 0.15 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)
    debugPlane.scale.copy(scale)
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Point shadows test',
  })

  const meshFolder = gui.addFolder('Mesh')
  const meshPosFolder = meshFolder.addFolder('Position')
  meshPosFolder.add(mesh.position, 'x', -10, 10, 0.25)
  meshPosFolder.add(mesh.position, 'y', -1, 10, 0.25)
  meshPosFolder.add(mesh.position, 'z', -10, 10, 0.25)

  const pointLightFolder = gui.addFolder('Point light')

  pointLightFolder.add(pointLight, 'intensity', 0, 100, 0.01)
  pointLightFolder.add(pointLight, 'range', 0, 100, 0.25)

  pointLightFolder
    .addColor({ color: { r: pointLight.color.x, g: pointLight.color.y, b: pointLight.color.z } }, 'color')
    .onChange((value) => {
      pointLight.color.set(value.r, value.g, value.b)
    })

  const pointLightPosFolder = pointLightFolder.addFolder('Position')
  pointLightPosFolder.add(pointLight.position, 'x', -10, 10, 0.25)
  pointLightPosFolder.add(pointLight.position, 'y', -1, 10, 0.25)
  pointLightPosFolder.add(pointLight.position, 'z', -10, 10, 0.25)

  if (pointLight.shadow.isActive) {
    const pointShadow = pointLightFolder.addFolder('Shadow')

    pointShadow.add(pointLight.shadow, 'intensity', 0, 1, 0.005)
    pointShadow.add(pointLight.shadow, 'bias', 0, 0.01, 0.0001)
    pointShadow.add(pointLight.shadow, 'normalBias', 0, 0.01, 0.0001)
    pointShadow.add(pointLight.shadow, 'pcfSamples', 1, 5, 1)
    pointShadow
      .add(pointLight.shadow.depthTextureSize, 'x', 128, 1024, 64)
      .name('Texture size')
      .onChange(() => {
        depthTexture.copy(pointLight.shadow.depthTexture)
      })

    const debugFolder = pointShadow.addFolder('Debug shadow depth cube texture')
    debugFolder.add(debugPlane, 'visible').name('Visible')
    debugFolder
      .add(debugPlane.uniforms.params.faceIndex, 'value', { '+X': 0, '-X': 1, '+Y': 2, '-Y': 3, '+Z': 4, '-Z': 5 })
      .name('Cubemap face')
  }
})
