// TODO we could use a skybox instead
// see https://webgpufundamentals.org/webgpu/lessons/webgpu-skybox.html
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUDeviceManager,
    GPUCameraRenderer,
    BoxGeometry,
    PlaneGeometry,
    Mesh,
    Vec2,
    Vec3,
    EnvironmentMap,
    constants,
    common,
    toneMappingUtils,
  } = await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    camera: {
      fov: 65,
    },
    context: {
      format: 'rgba16float', // allow HDR output
      toneMapping: { mode: 'standard' },
    },
  })

  const { camera } = gpuCameraRenderer

  camera.position.z = 0

  const envMaps = {
    cannon: {
      name: 'Cannon',
      url: '../../website/assets/hdr/cannon_1k.hdr',
    },
    colorfulStudio: {
      name: 'Colorful studio',
      url: '../../website/assets/hdr/Colorful_Studio.hdr',
    },
  }

  const currentEnvMapKey = 'cannon'
  let currentEnvMap = envMaps[currentEnvMapKey]

  const environmentMap = new EnvironmentMap(gpuCameraRenderer)
  await environmentMap.loadAndComputeFromHDR(currentEnvMap.url, {
    specularTextureParams: {
      generateMips: false,
    },
  })

  console.log(environmentMap)

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()

  const cubeMapVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) direction: vec3f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
     
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.direction = normalize(attributes.position * params.envRotation);

      return vsOutput;
    }
  `

  const cubeMapFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) direction: vec3f,
    };
    
    ${constants}
    ${common}
    ${toneMappingUtils}

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = select(
        textureSample(${environmentMap.specularTexture.options.name}, clampSampler, fsInput.direction),
        textureSample(${environmentMap.diffuseTexture.options.name}, clampSampler, fsInput.direction),
        params.useDiffuse > 0.0
      );
      
      color = vec4(KhronosToneMapping(color.rgb), color.a);
      color = linearTosRGB_4(color);
      
      return color;
    }
  `

  const cubeMap = new Mesh(gpuCameraRenderer, {
    geometry: cubeGeometry,
    textures: [environmentMap.diffuseTexture, environmentMap.specularTexture],
    samplers: [environmentMap.sampler],
    cullMode: 'front',
    shaders: {
      vertex: {
        code: cubeMapVs,
      },
      fragment: {
        code: cubeMapFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          envRotation: {
            type: 'mat3x3f',
            value: environmentMap.rotation,
          },
          useDiffuse: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  const lutPlane = new Mesh(gpuCameraRenderer, {
    geometry: new PlaneGeometry(),
    textures: [environmentMap.lutTexture],
    samplers: [environmentMap.sampler],
    visible: false,
    shaders: {
      fragment: {
        code: `
          struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
          };
          
          @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {            
            return textureSample(lutTexture, clampSampler, fsInput.uv);
          }
        `,
      },
    },
  })

  lutPlane.position.z = -0.5
  lutPlane.scale.set(0.075)

  console.log(cubeMap)

  //--------------
  // CUBEMAP ROTATION CONTROLS
  //--------------

  // now the orbit controls
  const mouse = {
    current: new Vec2(Infinity),
    last: new Vec2(Infinity),
    delta: new Vec2(),
    isDown: false,
  }

  const targetRotation = new Vec3()

  window.addEventListener('touchstart', () => {
    mouse.isDown = true
  })
  window.addEventListener('mousedown', () => {
    mouse.isDown = true
  })

  window.addEventListener('touchend', () => {
    mouse.isDown = false
    mouse.last.set(Infinity)
  })
  window.addEventListener('mouseup', () => {
    mouse.isDown = false
    mouse.last.set(Infinity)
  })

  window.addEventListener('pointermove', (e) => {
    if (!mouse.isDown) return

    mouse.current.set(e.clientX, e.clientY)

    if (mouse.last.x === Infinity) {
      mouse.last.copy(mouse.current)
    }

    mouse.delta.set(mouse.current.x - mouse.last.x, mouse.current.y - mouse.last.y)

    targetRotation.y -= mouse.delta.x * 0.005
    targetRotation.x = Math.min(Math.max(targetRotation.x - mouse.delta.y * 0.005, -Math.PI / 2), Math.PI / 2)

    mouse.last.copy(mouse.current)
  })

  cubeMap.onBeforeRender(() => {
    cubeMap.rotation.lerp(targetRotation, 0.15)
  })

  const gui = new lil.GUI({
    title: 'Env textures',
  })

  const envFolder = gui.addFolder('Environment')

  envFolder
    .add(
      { [currentEnvMap.name]: currentEnvMapKey },
      currentEnvMap.name,
      Object.keys(envMaps).reduce((acc, v) => {
        return { ...acc, [envMaps[v].name]: v }
      }, {})
    )
    .onChange(async (value) => {
      if (envMaps[value].name !== currentEnvMap.name) {
        currentEnvMap = envMaps[value]
        await environmentMap.loadAndComputeFromHDR(envMaps[value].url)
      }
    })
    .name('Maps')

  const envTexturesFolder = gui.addFolder('Environment textures')

  envTexturesFolder
    .add({ useDiffuse: false }, 'useDiffuse')
    .onChange((value) => {
      cubeMap.uniforms.params.useDiffuse.value = value ? 1 : 0
    })
    .name('Display diffuse cubemap')

  const lutTextureFolder = gui.addFolder('LUT texture')
  lutTextureFolder.add(lutPlane, 'visible').name('Show LUT texture')
})
