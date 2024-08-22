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
    buildShaders,
    AmbientLight,
    DirectionalLight,
    OrbitControls,
    Vec3,
    Vec2,
    Mesh,
    PlaneGeometry,
  } = await import(/* @vite-ignore */ path)

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
      far: 2000,
    },
  })

  const { camera } = gpuCameraRenderer
  const orbitControls = new OrbitControls(gpuCameraRenderer)

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

  let shadingModel = 'PBR' // 'IBL', 'PBR', 'Phong' or 'Lambert'

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.3,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(60, 200, 20),
    intensity: 4,
    shadow: {
      bias: 0.007,
      depthTextureSize: new Vec2(2048),
      camera: {
        left: -20,
        right: 20,
        bottom: -20,
        top: 20,
        near: 1,
        far: 500,
      },
    },
  })

  // gltf
  const gltfLoader = new GLTFLoader()

  let gltfScenesManager = null

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

    const { center, radius } = boundingBox

    // center model
    node.position.sub(center)

    // reset orbit controls
    orbitControls.reset()

    camera.position.x = 0
    camera.position.y = center.y * 0.25 + node.position.y
    camera.position.z = radius * 0.225
    camera.fov = 75

    orbitControls.zoomStep = radius * 0.00025
    orbitControls.minZoom = radius * -0.225

    orbitControls.maxZoom = radius * 2
    camera.far = radius * 6

    const meshes = gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // add clamp sampler
      parameters.samplers = [...parameters.samplers, clampSampler]

      // disable frustum culling
      parameters.frustumCulling = false

      // shadows
      parameters.castShadows = true
      parameters.receiveShadows = true

      if (shadingModel === 'IBL') {
        ambientLight.intensity = 0
      } else {
        ambientLight.intensity = 0.3
      }

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
          diffuseStrength: 1,
          specularStrength: 1,
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

    console.log(gpuCameraRenderer.samplers, meshes[0])
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

        if (gltfScenesManager) {
          gltfScenesManager.destroy()
        }

        gltfScenesManager = null

        await loadGLTF()
      }
    })
    .name('Shading')

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
  directionalLightPosFolder.add(directionalLight.position, 'x', -100, 100, 0.5)
  directionalLightPosFolder.add(directionalLight.position, 'y', 0, 500, 0.5)
  directionalLightPosFolder.add(directionalLight.position, 'z', -100, 100, 0.5)

  const directionalLightTargetFolder = directionalLightFolder.addFolder('Target')
  directionalLightTargetFolder.add(directionalLight.target, 'x', -100, 100, 0.5)
  directionalLightTargetFolder.add(directionalLight.target, 'y', -100, 100, 0.5)
  directionalLightTargetFolder.add(directionalLight.target, 'z', -100, 100, 0.5)

  let isDebug = false

  const shadowFolder = gui.addFolder('Shadow map')
  const showShadowMap = shadowFolder.add({ isDebug }, 'isDebug').name('Show shadow map')

  await loadGLTF()

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

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

  const scale = new Vec3(0.25, 0.25 * (gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height), 1)

  const debugPlane = new Mesh(gpuCameraRenderer, {
    label: 'Debug depth plane',
    geometry: new PlaneGeometry(),
    depthWriteEnabled: false,
    frustumCulling: false,
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
