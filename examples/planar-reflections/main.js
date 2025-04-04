import {
  BoxGeometry,
  GPUCameraRenderer,
  OrbitControls,
  GPUDeviceManager,
  Vec2,
  Vec3,
  PerspectiveCamera,
  RenderTarget,
  AmbientLight,
  DirectionalLight,
  RenderBundle,
  LitMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
} from '../../dist/esm/index.mjs'

// Planar reflections implementation
// The idea is to render the reflected meshes twice:
// - first, to a render target with a camera which position is inverted along the mirror plane position
// - then to the main buffer with the regular renderer camera
// Then, we use the reflection render target texture in the mirror plane shader
//
// This means we're actually rendering the reflected meshes twice, which can be expensive for large scenes
// In this case it'd probably better to use screen space reflections (SSR)
window.addEventListener('load', async () => {
  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const renderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
  })

  const systemSize = 10

  const { camera, scene, cameraLightsBindGroup } = renderer

  camera.position.y = systemSize * 2
  camera.position.z = systemSize * 4

  const ambientLight = new AmbientLight(renderer, {
    intensity: 0.2,
  })

  const directionalLight = new DirectionalLight(renderer, {
    intensity: 1.25,
    position: new Vec3(systemSize * 3),
  })

  const orbitControls = new OrbitControls({
    camera,
    element: renderer.domElement.element,
    target: new Vec3(0, systemSize * 0.5, 0),
    maxPolarAngle: Math.PI * 0.495, // not lower than the floor
    minZoom: systemSize * 1.5,
    maxZoom: systemSize * 6,
  })

  const reflectionQuality = 0.5

  const reflectionTarget = new RenderTarget(renderer, {
    label: 'Reflection render target',
    depthStoreOp: 'discard', // important so we don't interfer with the main buffer
    renderTextureName: 'reflectionTexture',
    qualityRatio: reflectionQuality,
  })

  // create a camera based on our renderer camera
  const reflectionCamera = new PerspectiveCamera({
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
    width: camera.size.width,
    height: camera.size.height,
    pixelRatio: camera.pixelRatio,
  })

  // don't forget to update perspective on resize
  renderer.onAfterResize(() => {
    reflectionCamera.setPerspective({
      width: renderer.boundingRect.width,
      height: renderer.boundingRect.height,
    })
  })

  reflectionCamera.parent = scene

  // create a camera buffer binding
  const reflectionCameraBinding = renderer.createCameraBinding(reflectionCamera, 'Reflection camera')

  // create a camera bind group
  const reflectionCameraBindGroup = cameraLightsBindGroup.clone({
    label: 'Reflection camera render bind group',
    bindings: [reflectionCameraBinding, ...cameraLightsBindGroup.bindings.slice(1)],
    keepLayout: true,
  })

  // not really needed, here for the sake of clarity
  // as the camera bind group always has an index of 0
  // and this is also the default bind group index
  reflectionCameraBindGroup.setIndex(0)

  const boxGeometry = new BoxGeometry()
  const planeGeometry = new PlaneGeometry()

  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const white = new Vec3(1)
  const black = new Vec3()

  const NB_ORBITING_MESHES = 50
  const reflectedMeshes = []

  const renderBundle = new RenderBundle(renderer, {
    label: 'Reflected objects render bundle',
    size: NB_ORBITING_MESHES + 1, // used for totem as well
    useBuffer: true,
  })

  // this means we'll be rendering the meshes to the main buffer
  // but, before that, they'll be rendered into the reflection target
  const reflectedMeshOutputTarget = {
    additionalOutputTargets: [reflectionTarget],
  }

  const orbitingPivot = new Object3D()
  orbitingPivot.parent = scene

  renderer.onBeforeRender(() => {
    orbitingPivot.rotation.y += 0.01
  })

  for (let i = 0; i < NB_ORBITING_MESHES; i++) {
    const randomColorPick = Math.random()

    const mesh = new LitMesh(renderer, {
      label: `Cube ${i}`,
      geometry: boxGeometry,
      ...reflectedMeshOutputTarget,
      renderBundle,
      material: {
        shading: 'Lambert',
        toneMapping: 'Khronos',
        color: randomColorPick > 0.9 ? white : randomColorPick > 0.45 ? blue : pink,
      },
    })

    const theta = Math.random() * Math.PI * 2
    const radius = Math.random() * systemSize * 1.25 + systemSize * 0.75 + 2

    mesh.position.x = radius * Math.cos(theta)
    mesh.position.y = Math.random() * systemSize * 1.25 + systemSize * 0.125 + 2
    mesh.position.z = radius * Math.sin(theta)

    mesh.scale.set(0.5)

    mesh.parent = orbitingPivot

    const rotationSpeed = (Math.random() * 0.01 + 0.01) * Math.sign(Math.random() - 0.5)

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })

    reflectedMeshes.push(mesh)

    // for more complex scenarios, like casting shadows
    // we'd probably have to create another mesh instead
    // the good news is that they could be rendered inside their own render bundle
    // see 'reflections' in the tests directory
    // const reflectedMesh = new LitMesh(renderer, {
    //   label: 'Reflected cube',
    //   geometry: mesh.geometry,
    //   outputTarget: reflectionTarget,
    //   material: {
    //     shading: 'Lambert',
    //     toneMapping: 'Khronos',
    //     color: randomColorPick > 0.9 ? white : randomColorPick > 0.45 ? blue : pink,
    //   },
    // })
    //
    // reflectedMesh.parent = mesh
    //
    // reflectedMesh.onReady(() => {
    //   reflectedMesh.setCameraBindGroup(reflectionCameraBindGroup)
    // })
  }

  // very basic noise WGSL function
  const wgslNoise = /* wgsl */ `
  fn hash(p: vec2<f32>) -> f32 {
    let h = dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
  }
  
  // Smooth noise function
  fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    
    let a = hash(i);
    let b = hash(i + vec2<f32>(1.0, 0.0));
    let c = hash(i + vec2<f32>(0.0, 1.0));
    let d = hash(i + vec2<f32>(1.0, 1.0));
    
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  `

  const totemFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) worldPosition: vec3f,
    @location(3) viewDirection: vec3f,
  };

  ${wgslNoise}

  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    var uv = (fsInput.uv * 2.0 - 1.0) * ${Math.PI};

    let cosx = cos(uv.x * 0.5 + params.time * params.speed * 0.9) * 0.5 + 0.5;
    let siny = sin(uv.y * 1.5 - params.time * params.speed * 1.15) * 0.5 + 0.5;

    let noiseUv = vec2(uv.x, uv.y + cos(uv.x + params.time * params.speed * 2.0) * 1.5);

    var totemNoise = siny * 0.325 + cosx * 0.325 + saturate(noise(noiseUv * params.noiseScale - vec2(0.0, params.time * params.speed * 1.6))) * 0.25;

    totemNoise = smoothstep(0.1, 0.9, totemNoise);

    let color = mix(params.black, params.white, vec3(totemNoise));

    return vec4(color, 1.0);
  }
  `

  const totem = new Mesh(renderer, {
    label: 'Noisy totem',
    geometry: boxGeometry,
    cullMode: 'none',
    ...reflectedMeshOutputTarget,
    renderBundle: renderBundle,
    shaders: {
      fragment: {
        code: totemFs,
      },
    },
    uniforms: {
      params: {
        visibility: ['fragment'],
        struct: {
          time: {
            type: 'f32',
            value: 0,
          },
          noiseScale: {
            type: 'vec2f',
            value: new Vec2(2, 0.75),
          },
          noiseStrength: {
            type: 'f32',
            value: 0.15,
          },
          speed: {
            type: 'f32',
            value: 0.01,
          },
          black: {
            type: 'vec3f',
            value: black,
          },
          white: {
            type: 'vec3f',
            value: white,
          },
        },
      },
    },
  })

  totem.scale.set(systemSize * 0.375, systemSize, systemSize * 0.375)
  totem.position.y = systemSize

  totem.onBeforeRender(() => {
    totem.uniforms.params.time.value++
  })

  reflectedMeshes.push(totem)

  const reflectionCameraLookAt = new Vec3()
  const reflectionScenePassEntry = scene.getRenderTargetPassEntry(reflectionTarget)

  reflectionScenePassEntry.onBeforeRenderPass = () => {
    // negate Y position and lookAt
    reflectionCamera.position.copy(camera.actualPosition)
    reflectionCamera.position.y *= -1

    reflectionCameraLookAt.copy(orbitControls.target)
    reflectionCameraLookAt.y *= -1
    reflectionCamera.lookAt(reflectionCameraLookAt)

    // update reflection camera matrices
    reflectionCamera.updateMatrixStack()

    // force the reflection camera buffer to update
    reflectionCameraBinding.shouldUpdateBinding('view')
    reflectionCameraBinding.shouldUpdateBinding('projection')
    reflectionCameraBinding.shouldUpdateBinding('position')
    // equivalent to:
    // reflectionCameraBinding.inputs.view.shouldUpdate = true
    // reflectionCameraBinding.inputs.projection.shouldUpdate = true
    // reflectionCameraBinding.inputs.position.shouldUpdate = true

    // update the reflection camera bind group
    reflectionCameraBindGroup.update()

    // use the reflection camera bind group
    reflectedMeshes.forEach((mesh) => {
      mesh.setCameraBindGroup(reflectionCameraBindGroup)
    })
  }

  reflectionScenePassEntry.onAfterRenderPass = () => {
    // reset to the original camera bind group
    reflectedMeshes.forEach((mesh) => {
      mesh.setCameraBindGroup(cameraLightsBindGroup)
    })
  }

  const floorPivot = new Object3D()
  floorPivot.parent = scene

  floorPivot.rotation.x = -Math.PI / 2

  const reflectionFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };

    ${wgslNoise}

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var uv = fsInput.position.xy * params.reflectionQuality / vec2f(textureDimensions(reflectionTexture));
      uv.y = 1.0 - uv.y;

      var noise = noise(fsInput.uv * params.noiseScale);

      var noiseOffset = vec2f(
        noise - 0.5,
        noise - 0.5
      ) * params.noiseStrength;

      // Sample the reflection texture
      var reflectionSample = textureSample(reflectionTexture, defaultSampler, uv + noiseOffset);

      let cosTheta = saturate(dot(normalize(fsInput.normal), normalize(fsInput.viewDirection)));
      let F0 = vec3(0.04);
      let fresnelFactor = F0 + (vec3(1.0) - F0) * pow(1.0 - cosTheta, 5.0);

      reflectionSample = mix(reflectionSample, vec4(0.0, 0.0, 0.0, reflectionSample.a), vec4(fresnelFactor, 1.0));

      let floorBaseColor = vec4(params.color, 1.0) * (noise * 0.15 + 0.85);

      let floorReflection = mix(floorBaseColor, reflectionSample, reflectionSample.a * params.reflectionStrength * (noise * 0.15 + 0.85));

      return floorReflection;
    }
  `

  const floor = new Mesh(renderer, {
    label: 'Reflection floor',
    geometry: planeGeometry,
    textures: [reflectionTarget.renderTexture], // use the reflection target texture
    shaders: {
      fragment: {
        code: reflectionFs,
      },
    },
    uniforms: {
      params: {
        visibility: ['fragment'],
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.05),
          },
          reflectionStrength: {
            type: 'f32',
            value: 0.325,
          },
          reflectionQuality: {
            type: 'f32',
            value: reflectionQuality,
          },
          noiseScale: {
            type: 'vec2f',
            value: new Vec2(50, 500),
          },
          noiseStrength: {
            type: 'f32',
            value: 0.0025,
          },
        },
      },
    },
  })

  floor.parent = floorPivot
  floor.scale.set(systemSize * 20, systemSize * 20, 1)
})
