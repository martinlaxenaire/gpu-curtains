// Goals of this test:
// - test various capacities of the gltf loader
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    Texture,
    computeDiffuseFromSpecular,
    HDRLoader,
    Sampler,
    GLTFLoader,
    GLTFScenesManager,
    RenderBundle,
    buildShaders,
    AmbientLight,
    DirectionalLight,
    PointLight,
    OrbitControls,
    Vec3,
    Vec2,
    Mesh,
    PlaneGeometry,
  } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  const container = document.querySelector('#canvas')

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container,
    pixelRatio: Math.min(1, window.devicePixelRatio),
    camera: {
      near: 0.001,
      far: 150,
      fov: 75,
    },
  })

  // render it
  const animate = () => {
    requestAnimationFrame(animate)

    stats.begin()

    gpuDeviceManager.render()
    stats.end()
  }

  animate()

  const { camera } = gpuCameraRenderer
  camera.position.set(7, 2.5, 0)

  const orbitControls = new OrbitControls({
    camera,
    element: container,
    target: new Vec3(0, 0.5, 0),
    zoomSpeed: 0.5,
    maxZoom: 40,
  })

  // IBL textures
  const loadImageBitmap = async (src) => {
    const response = await fetch(src)
    return createImageBitmap(await response.blob())
  }

  const iblLUTBitmap = await loadImageBitmap('./assets/lut.png')
  // const envDiffuseBitmap = await loadImageBitmap('./assets/royal_esplanade_1k-diffuse-RGBM.png')
  // const envSpecularBitmap = await loadImageBitmap('./assets/royal_esplanade_1k-specular-RGBM.png')

  const iblLUTTexture = new Texture(gpuCameraRenderer, {
    name: 'iblLUTTexture',
    visibility: ['fragment'],
    format: 'rgba32float',
    //generateMips: true,
    fixedSize: {
      width: iblLUTBitmap.width,
      height: iblLUTBitmap.height,
    },
    flipY: true, // from a WebGL texture!
    autoDestroy: false, // keep alive when changing glTF
  })

  iblLUTTexture.uploadSource({
    source: iblLUTBitmap,
  })

  const hdrLoader = new HDRLoader()
  const specularHDR = await hdrLoader.loadFromUrl('./assets/cannon_1k.hdr')

  // TODO use a compute pass?
  const specFaceData = hdrLoader.equirectangularToCubeMap(specularHDR)

  const envSpecularTexture = new Texture(gpuCameraRenderer, {
    label: 'Environment specular texture',
    name: 'envSpecularTexture',
    visibility: ['fragment', 'compute'],
    format: 'rgba32float',
    generateMips: true,
    viewDimension: 'cube',
    fixedSize: {
      width: specFaceData[0].width,
      height: specFaceData[0].height,
    },
    autoDestroy: false, // keep alive when changing glTF
  })

  for (let i = 0; i < specFaceData.length; i++) {
    envSpecularTexture.uploadData({
      data: specFaceData[i].data,
      origin: [0, 0, i],
      depth: 1, // explicitly set the depth to 1
    })
  }

  // diffuse cube map computed from the specular cube map in a compute shader
  const envDiffuseTexture = new Texture(gpuCameraRenderer, {
    label: 'Environment diffuse texture',
    name: 'envDiffuseTexture',
    visibility: ['fragment'],
    format: 'rgba32float',
    viewDimension: 'cube',
    fixedSize: {
      width: specFaceData[0].width,
      height: specFaceData[0].height,
    },
    autoDestroy: false, // keep alive when changing glTF
  })

  // compute diffuse texture
  await computeDiffuseFromSpecular(gpuCameraRenderer, envDiffuseTexture, envSpecularTexture)

  // finally we will need a clamp-to-edge sampler for those textures
  const clampSampler = new Sampler(gpuCameraRenderer, {
    label: 'Clamp sampler',
    name: 'clampSampler',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  let shadingModel = 'IBL' // 'IBL', 'PBR', 'Phong' or 'Lambert'

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 1,
    color: new Vec3(0.2, 0.4, 0.8),
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(-10, 30, 3),
    color: new Vec3(0.2, 0.4, 0.8),
    //intensity: 6,
    intensity: 3,
    shadow: {
      bias: 0.001,
      depthTextureSize: new Vec2(1500),
      pcfSamples: 2,
      camera: {
        left: -20,
        right: 20,
        bottom: -20,
        top: 20,
        near: 0.01,
        far: 200,
      },
      autoRender: false,
    },
  })

  const pointLights = []
  const pointLightsSettings = {
    color: new Vec3(0.85, 0.15, 0),
    intensity: 7.5,
    range: 10,
    shadow: {
      bias: 0.001,
      pcfSamples: 1,
      depthTextureSize: new Vec2(512),
      camera: {
        near: 0.01,
        far: 200,
      },
      autoRender: false,
    },
  }

  // put point lights on the torches
  const pointLightsPos = [
    new Vec3(-4.45, 1.15, -1.45),
    new Vec3(-4.45, 1.15, 1.45),
    new Vec3(4.45, 1.15, -1.45),
    new Vec3(4.45, 1.15, 1.45),
  ]

  pointLightsPos.forEach((position) => {
    const pointLight = new PointLight(gpuCameraRenderer, {
      position,
      ...pointLightsSettings,
    })

    pointLights.push(pointLight)
  })

  let time = 0
  gpuCameraRenderer.onBeforeRender(() => {
    time++
    pointLights.forEach((pointLight, i) => {
      const sinusoidal = i % 2 === 0 ? Math.cos : Math.sin
      pointLight.intensity = 6 + (sinusoidal(time * 0.05) + 1) * 0.5 + (Math.random() * 2 + 1)
    })
  })

  // gltf
  const gltfLoader = new GLTFLoader()

  let gltfScenesManager = null
  let renderBundle = null

  const loadGLTF = async () => {
    container.classList.add('loading')

    //const url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Sponza/glTF/Sponza.gltf'
    const url = 'https://raw.githubusercontent.com/toji/sponza-optimized/main/Sponza.gltf'

    const gltf = await gltfLoader.loadFromUrl(url)
    gltfScenesManager = new GLTFScenesManager({ renderer: gpuCameraRenderer, gltf })

    const { scenesManager } = gltfScenesManager
    const { scenes, boundingBox, node } = scenesManager
    container.classList.remove('loading')

    console.log({ gltf, scenesManager, scenes, boundingBox })

    renderBundle = new RenderBundle(gpuCameraRenderer, {
      label: 'glTF render bundle',
      size: scenesManager.meshesDescriptors.length,
      useBuffer: true,
    })

    const { center } = boundingBox

    // center model
    node.position.sub(center)
    node.position.y = 0

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // add render bundle
      parameters.renderBundle = renderBundle

      // add clamp sampler
      parameters.samplers = [...parameters.samplers, clampSampler]

      // disable frustum culling
      parameters.frustumCulling = false

      // shadows
      parameters.castShadows = true
      parameters.receiveShadows = true

      // debug
      const additionalColorContribution = `
        // color = vec4(vec3(metallic), color.a);
      `

      parameters.shaders = buildShaders(meshDescriptor, {
        shadingModel,
        chunks: {
          additionalColorContribution,
        },
        iblParameters: {
          diffuseStrength: 0.1,
          specularStrength: 0.4,
          lutTexture: {
            texture: iblLUTTexture,
            samplerName: 'clampSampler', // use clamp sampler for LUT texture
          },
          envDiffuseTexture: {
            texture: envDiffuseTexture,
            samplerName: 'clampSampler', // use clamp sampler for cube maps
          },
          envSpecularTexture: {
            texture: envSpecularTexture,
            samplerName: 'clampSampler', // use clamp sampler for cube maps
          },
        },
      })
    })

    // finally render shadows
    directionalLight.shadow.renderOnce()

    pointLights.forEach((pointLight) => {
      pointLight.shadow.renderOnce()
    })

    console.log(gpuCameraRenderer, meshes)
  }

  // GUI
  const gui = new lil.GUI({
    title: 'GLTF loader',
  })

  gui
    .add({ shadingModel }, 'shadingModel', ['IBL', 'PBR', 'Phong', 'Lambert'])
    .onChange(async (value) => {
      if (value !== shadingModel) {
        shadingModel = value

        if (renderBundle) {
          renderBundle.destroy()
        }

        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        renderBundle = null
        gltfScenesManager = null

        await loadGLTF()
      }
    })
    .name('Shading')

  const ambientLightFolder = gui.addFolder('Ambient light')
  ambientLightFolder.add(ambientLight, 'intensity', 0, 1, 0.01)
  ambientLightFolder
    .addColor({ color: { r: ambientLight.color.x, g: ambientLight.color.y, b: ambientLight.color.z } }, 'color')
    .onChange((value) => {
      ambientLight.color.set(value.r, value.g, value.b)
    })

  const directionalLightFolder = gui.addFolder('Directional light')
  directionalLightFolder.add(directionalLight, 'intensity', 0, 10, 0.01)
  directionalLightFolder
    .addColor(
      { color: { r: directionalLight.color.x, g: directionalLight.color.y, b: directionalLight.color.z } },
      'color'
    )
    .onChange((value) => {
      directionalLight.color.set(value.r, value.g, value.b)
    })

  const directionalLightPosFolder = directionalLightFolder.addFolder('Position')
  directionalLightPosFolder
    .add(directionalLight.position, 'x', -60, 60, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightPosFolder
    .add(directionalLight.position, 'y', 0, 200, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightPosFolder
    .add(directionalLight.position, 'z', -60, 60, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())

  const directionalLightTargetFolder = directionalLightFolder.addFolder('Target')
  directionalLightTargetFolder
    .add(directionalLight.target, 'x', -100, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightTargetFolder
    .add(directionalLight.target, 'y', -100, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  directionalLightTargetFolder
    .add(directionalLight.target, 'z', -100, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())

  let isDebug = false

  const shadowFolder = gui.addFolder('Directional shadow')
  shadowFolder.add(directionalLight.shadow, 'intensity', 0, 1, 0.01)
  shadowFolder.add(directionalLight.shadow, 'bias', 0, 0.01, 0.0001)
  shadowFolder.add(directionalLight.shadow, 'normalBias', 0, 0.01, 0.0001)
  shadowFolder.add(directionalLight.shadow, 'pcfSamples', 1, 5, 1)
  const shadowTextureSizeFolder = shadowFolder.addFolder('Depth texture size')
  shadowTextureSizeFolder
    .add(directionalLight.shadow.depthTextureSize, 'x', 100, 2048, 2)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowTextureSizeFolder
    .add(directionalLight.shadow.depthTextureSize, 'y', 100, 2048, 2)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  const shadowCameraFolder = shadowFolder.addFolder('Camera')
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'left', -100, 1, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'right', 1, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'bottom', -100, 1, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'top', 1, 100, 0.5)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'near', 0.001, 1, 0.001)
    .onChange(async () => await directionalLight.shadow.renderOnce())
  shadowCameraFolder
    .add(directionalLight.shadow.camera, 'far', 20, 500, 1)
    .onChange(async () => await directionalLight.shadow.renderOnce())

  const shadowMapFolder = shadowFolder.addFolder('Debug')
  const showShadowMap = shadowMapFolder.add({ isDebug }, 'isDebug').name('Show shadow map')

  await loadGLTF()

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
      
      var color: vec4f = vec4(vec3(pow(depth, 5.0)), 1.0);

      return color;
    }
  `

  const scale = new Vec3(0.25, 0.25 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)

  const debugPlane = new Mesh(gpuCameraRenderer, {
    label: 'Debug depth plane',
    geometry: new PlaneGeometry(),
    depthWriteEnabled: false,
    frustumCulling: false,
    visible: false,
    renderOrder: 10,
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
    scale.set(0.25, 0.25 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)
    debugPlane.scale.copy(scale)
  })

  showShadowMap.onChange((value) => {
    isDebug = value
    debugPlane.visible = isDebug
  })
})
