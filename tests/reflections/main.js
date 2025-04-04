// Reflections test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
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
    EnvironmentMap,
    RenderBundle,
    LitMesh,
    Object3D,
    PlaneGeometry,
    SphereGeometry,
  } = await import(/* @vite-ignore */ path)

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

  const { camera, scene, cameraLightsBindGroup } = renderer

  camera.position.y = 5
  camera.position.z = 12.5

  const ambientLight = new AmbientLight(renderer, {
    intensity: 0.2,
  })

  const directionalLight = new DirectionalLight(renderer, {
    intensity: 1.25,
    position: new Vec3(15),
    shadow: {},
  })

  const environmentMap = new EnvironmentMap(renderer, {
    diffuseIntensity: 0.25,
  })
  environmentMap.loadAndComputeFromHDR('../../website/assets/hdr/cannon_1k.hdr')

  const orbitControls = new OrbitControls({
    camera,
    element: renderer.domElement.element,
    target: new Vec3(0, 2, 0),
    maxPolarAngle: Math.PI * 0.5, // not lower than the floor
    minZoom: 3,
    maxZoom: 25,
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
  const sphereGeometry = new SphereGeometry()

  const silver = new Vec3(0.972, 0.96, 0.915)
  const gold = new Vec3(1.0, 0.765, 0.336)

  const reflectedMeshes = []
  const useMeshCopy = true
  const NB_MESHES = 3

  const originalRenderBundle = new RenderBundle(renderer, {
    label: 'Reflected objects original render bundle',
    size: NB_MESHES,
    useBuffer: true,
  })

  let copyRenderBundle
  if (useMeshCopy) {
    copyRenderBundle = new RenderBundle(renderer, {
      label: 'Reflected objects copy render bundle',
      size: NB_MESHES,
      useBuffer: true,
      renderPass: reflectionTarget.renderPass,
    })
  }

  const baseMaterialOptions = {
    shading: 'PBR',
    toneMapping: 'Khronos',
    environmentMap,
  }

  const reflectedMaterialOptions = {
    ...baseMaterialOptions,
    metallic: 1,
    roughness: 0.5,
  }

  for (let i = 0; i < NB_MESHES; i++) {
    const color = i < NB_MESHES - 1 ? silver : gold

    const mesh = new LitMesh(renderer, {
      label: `Cube ${i}`,
      geometry: i < NB_MESHES - 1 ? boxGeometry : sphereGeometry,
      ...(!useMeshCopy && { additionalOutputTargets: [reflectionTarget] }),
      renderBundle: originalRenderBundle,
      castShadows: true,
      material: { ...reflectedMaterialOptions, color },
    })

    if (i < NB_MESHES - 1) {
      mesh.position.x = i % 2 === 0 ? 4 : -4
    }

    mesh.position.y = 2

    if (i < NB_MESHES - 1) {
      mesh.onBeforeRender(() => {
        mesh.rotation.y += i % 2 === 0 ? 0.01 : -0.01
        mesh.rotation.z += i % 2 === 0 ? 0.01 : -0.01
      })
    } else {
      let t = 0

      mesh.onBeforeRender(() => {
        mesh.position.y = 2 + Math.cos(t * 0.04)
        t++
      })
    }

    if (!useMeshCopy) {
      reflectedMeshes.push(mesh)
    } else {
      const reflectedMesh = new LitMesh(renderer, {
        label: `Reflected cube ${i}`,
        geometry: mesh.geometry,
        outputTarget: reflectionTarget,
        renderBundle: copyRenderBundle,
        material: {
          ...reflectedMaterialOptions,
          color,
        },
      })

      reflectedMesh.parent = mesh

      reflectedMesh.onReady(() => {
        reflectedMesh.setCameraBindGroup(reflectionCameraBindGroup)
        copyRenderBundle.ready = false // invalidate bundle since we changed the mesh bind group
      })
    }
  }

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

  const floor = new LitMesh(renderer, {
    label: 'Reflection floor',
    geometry: planeGeometry,
    textures: [reflectionTarget.renderTexture], // use the reflection target texture
    receiveShadows: true,
    material: {
      ...baseMaterialOptions,
      color: new Vec3(0.5),
      metallic: 0.5,
      roughness: 0.4,
      fragmentChunks: {
        preliminaryContribution: /* wgsl */ `
        var reflectionUv = fsInput.position.xy * params.reflectionQuality / vec2f(textureDimensions(reflectionTexture));
        reflectionUv.y = 1.0 - reflectionUv.y;

        // Sample the reflection texture
        var reflectionSample = textureSample(reflectionTexture, defaultSampler, reflectionUv);

        let cosTheta = saturate(dot(normal, viewDirection));

        // Compute F0 based on metallic
        let F0 = mix(vec3(0.04), outputColor.rgb, metallic);

        // Apply Schlick's Fresnel approximation
        let fresnelFactor = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);

        // Reduce reflections for rough surfaces
        let reflectionStrength = 1.0 - roughness * roughness; // Adjust reflection intensity

        reflectionSample = mix(reflectionSample, vec4(0.0, 0.0, 0.0, reflectionSample.a), vec4(fresnelFactor * reflectionStrength, 1.0));

        outputColor = mix(outputColor, reflectionSample, reflectionSample.a * params.reflectionStrength);
        `,
      },
    },
    uniforms: {
      params: {
        visibility: ['fragment'],
        struct: {
          reflectionStrength: {
            type: 'f32',
            value: 0.375,
          },
          reflectionQuality: {
            type: 'f32',
            value: reflectionQuality,
          },
        },
      },
    },
  })

  floor.parent = floorPivot
  floor.scale.set(200, 200, 1)
})
