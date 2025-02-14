// Built to test a lot of important things:
// - Various renderer dependent objects renderer switching & context lost/restoration. Objects tested:
//   - Mesh & LitMesh (including transmissive)
//   - Lights & shadows
//   - EnvironmentMap
//   - IndirectBuffer
// - Dynamic meshes geometries and shadow maps
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    SphereGeometry,
    Geometry,
    OrbitControls,
    IndirectBuffer,
    GPUCameraRenderer,
    GPUDeviceManager,
    AmbientLight,
    DirectionalLight,
    PointLight,
    EnvironmentMap,
    Vec3,
    LitMesh,
    PlaneGeometry,
    Object3D,
  } = await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const leftRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    label: 'Left renderer',
    container: document.querySelector('#left-canvas'),
    renderPass: {
      colorAttachments: [
        {
          clearValue: [34 / 255, 34 / 255, 34 / 255, 1],
        },
      ],
    },
  })

  // create a camera renderer
  const rightRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    label: 'Right renderer',
    container: document.querySelector('#right-canvas'),
    lights: {
      maxDirectionalLights: 0,
      //maxPointLights: 0,
    },
    renderPass: {
      colorAttachments: [
        {
          clearValue: [34 / 255, 34 / 255, 34 / 255, 1],
        },
      ],
    },
  })

  const renderers = [leftRenderer, rightRenderer]
  let activeRenderer = renderers[0]
  console.log(renderers)

  renderers.forEach((renderer) => {
    renderer.camera.position.y = 7.5
    renderer.camera.position.z = 15
    renderer.camera.lookAt()
  })

  const orbitControls = new OrbitControls({
    camera: leftRenderer.camera,
    element: leftRenderer.domElement.element,
  })

  const ambientLights = []
  const directionalLights = []
  const pointLights = []

  ambientLights.push(
    new AmbientLight(leftRenderer, {
      intensity: 0.1,
    })
  )

  directionalLights.push(
    new DirectionalLight(leftRenderer, {
      color: new Vec3(1, 0, 0),
      position: new Vec3(10),
      intensity: 0.25,
      shadow: {
        intensity: 1,
      },
    })
  )

  console.log(directionalLights[0])

  directionalLights.push(
    new DirectionalLight(leftRenderer, {
      color: new Vec3(0, 1, 0),
      position: new Vec3(-10, 10, -10),
      intensity: 0.25,
    })
  )

  pointLights.push(
    new PointLight(leftRenderer, {
      color: new Vec3(0, 0, 1),
      position: new Vec3(-3, 4, -3),
      range: 50,
      intensity: 20,
      shadow: {
        intensity: 1,
      },
    })
  )

  console.log(pointLights[0].shadow)

  const environmentMap = new EnvironmentMap(leftRenderer)
  environmentMap.loadAndComputeFromHDR('../../website/assets/hdr/Colorful_Studio.hdr')

  // ---------------
  // GEOMETRIES
  // ---------------

  // prettier-ignore
  const vertices = new Float32Array([
    // front face
    1, -1, 1,
    0, 1, 0,
    -1, -1, 1,

    // right face
    1, -1, -1,
    0, 1, 0,
    1, -1, 1,

    // back face
    -1, -1, -1,
    0, 1, 0,
    1, -1, -1,

    // left face
    -1, -1, 1,
    0, 1, 0,
    -1, -1, -1,

    // bottom first
    -1, -1, -1,
    1, -1, -1,
    -1, -1, 1,
    // bottom second
    1, -1, 1,
    -1, -1, 1,
    1, -1, -1
  ])

  // prettier-ignore
  const uvs = new Float32Array([
    // front face
    1, 1,
    0.5, 0,
    0, 1,

    // right face
    1, 1,
    0.5, 0,
    0, 1,

    // back face
    1, 1,
    0.5, 0,
    0, 1,

    // left face
    1, 1,
    0.5, 0,
    0, 1,

    // bottom first
    0, 1,
    1, 1,
    0, 0,
    // bottom second
    1, 0,
    0, 0,
    1, 1,
  ])

  const frontNormal = new Vec3(0, 1, 1).normalize()
  const rightNormal = new Vec3(1, 1, 0).normalize()
  const backNormal = new Vec3(0, 1, -1).normalize()
  const leftNormal = new Vec3(-1, 1, 0).normalize()

  // prettier-ignore
  const normals = new Float32Array([
    // front face
    frontNormal.x, frontNormal.y, frontNormal.z,
    frontNormal.x, frontNormal.y, frontNormal.z,
    frontNormal.x, frontNormal.y, frontNormal.z,

    // right face
    rightNormal.x, rightNormal.y, rightNormal.z,
    rightNormal.x, rightNormal.y, rightNormal.z,
    rightNormal.x, rightNormal.y, rightNormal.z,

    // back face
    backNormal.x, backNormal.y, backNormal.z,
    backNormal.x, backNormal.y, backNormal.z,
    backNormal.x, backNormal.y, backNormal.z,

    // left face
    leftNormal.x, leftNormal.y, leftNormal.z,
    leftNormal.x, leftNormal.y, leftNormal.z,
    leftNormal.x, leftNormal.y, leftNormal.z,

    // bottom first
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
    // bottom second
    0, -1, 0,
    0, -1, 0,
    0, -1, 0,
  ])

  const customGeometry = new Geometry({
    vertexBuffers: [
      {
        name: 'attributes',
        stepMode: 'vertex', // explicitly set the stepMode even if not mandatory
        attributes: [
          {
            name: 'position',
            type: 'vec3f',
            bufferFormat: 'float32x3',
            size: 3,
            array: vertices,
          },
          {
            name: 'normal',
            type: 'vec3f',
            bufferFormat: 'float32x3',
            size: 3,
            array: normals,
          },
          {
            name: 'uv',
            type: 'vec2f',
            bufferFormat: 'float32x2',
            size: 2,
            array: uvs,
          },
        ],
      },
    ],
  })

  const boxGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()
  const planeGeometry = new PlaneGeometry()

  const indirectBuffer = new IndirectBuffer(leftRenderer, {
    label: 'Test indirect buffer',
    geometries: [boxGeometry, sphereGeometry, planeGeometry, customGeometry],
  })

  indirectBuffer.create()

  const mesh = new LitMesh(leftRenderer, {
    label: 'Cube',
    geometry: boxGeometry,
    castShadows: true,
    material: {
      shading: 'Phong',
      color: new Vec3(1),
      specularColor: new Vec3(1),
      specularIntensity: 1,
      shininess: 64,
    },
  })

  mesh.onBeforeRender(() => {
    mesh.rotation.x += 0.01
    mesh.rotation.y += 0.02
  })

  mesh.position.y = 2

  const bubble = new LitMesh(leftRenderer, {
    label: 'Transmissive bubble',
    geometry: sphereGeometry,
    transmissive: true,
    material: {
      shading: 'PBR',
      toneMapping: 'Khronos',
      metallic: 0.1, // if we'd set it to 0, we'd lose specular on transparent background
      roughness: 0.15,
      transmission: 1,
      thickness: 0.5,
      dispersion: 10,
      ior: 1.33,
      environmentMap,
    },
  })

  bubble.position.x = 1.5
  bubble.position.y = 3
  bubble.position.z = 4
  bubble.scale.set(1.5)

  const boxPivot = new Object3D()
  boxPivot.parent = leftRenderer.scene

  const floor = new LitMesh(leftRenderer, {
    label: 'Floor',
    geometry: planeGeometry,
    receiveShadows: true,
    frustumCulling: false, // always draw
    cullMode: 'none',
    material: {
      shading: 'Phong',
      color: new Vec3(0.7),
      specularColor: new Vec3(1),
      specularIntensity: 1,
      shininess: 32,
    },
  })

  floor.parent = boxPivot
  floor.position.set(0, -1, -0.5)
  floor.rotation.set(-Math.PI / 2, 0, 0)
  floor.scale.set(30)

  const geometries = {
    box: mesh.geometry,
    sphere: sphereGeometry,
    custom: customGeometry,
  }

  // GUI
  const gui = new lil.GUI({
    title: 'Lights test',
  })

  const meshFolder = gui.addFolder('Shadow casting mesh')

  meshFolder
    .add({ visible: true }, 'visible')
    .name('Visible')
    .onChange((value) => {
      mesh.visible = value
    })

  meshFolder
    .add({ geometry: 'box' }, 'geometry', geometries)
    .name('Geometry')
    .onChange((value) => {
      mesh.useGeometry(value)
    })

  const materialFolder = meshFolder.addFolder('Materials')
  const cubeFolder = materialFolder.addFolder('Cube')

  cubeFolder
    .addColor(
      {
        color: {
          r: mesh.uniforms.material.color.value.x,
          g: mesh.uniforms.material.color.value.y,
          b: mesh.uniforms.material.color.value.z,
        },
      },
      'color'
    )
    .onChange((value) => {
      mesh.uniforms.material.color.value.set(value.r, value.g, value.b)
    })
    .name('Color')

  cubeFolder
    .addColor(
      {
        specularColor: {
          r: mesh.uniforms.material.specularColor.value.x,
          g: mesh.uniforms.material.specularColor.value.y,
          b: mesh.uniforms.material.specularColor.value.z,
        },
      },
      'specularColor'
    )
    .onChange((value) => {
      mesh.uniforms.material.specularColor.value.set(value.r, value.g, value.b)
    })
    .name('Specular color')

  cubeFolder
    .add(
      {
        specularIntensity: mesh.uniforms.material.specularIntensity.value,
      },
      'specularIntensity',
      0,
      10,
      0.1
    )
    .onChange((value) => {
      mesh.uniforms.material.specularIntensity.value = value
    })
    .name('Specular intensity')

  cubeFolder
    .add(
      {
        shininess: mesh.uniforms.material.shininess.value,
      },
      'shininess',
      1,
      150,
      1
    )
    .onChange((value) => {
      mesh.uniforms.material.shininess.value = value
    })
    .name('Shininess')

  const rendererFolder = gui.addFolder('Renderer')
  rendererFolder
    .add({ activeRenderer: 'left' }, 'activeRenderer', { Left: 0, Right: 1 })
    .onChange((value) => {
      const renderer = renderers[value]
      activeRenderer = renderer

      console.log(renderer)

      orbitControls.useCamera(renderer.camera)
      orbitControls.element = renderer.domElement.element

      // you can chose which lights you'd want to update!
      ambientLights.forEach((light) => light.setRenderer(renderer))
      //directionalLights.forEach((light) => light.setRenderer(renderer))
      pointLights.forEach((light) => light.setRenderer(renderer))

      environmentMap.setRenderer(renderer)

      indirectBuffer.setRenderer(renderer)

      mesh.setRenderer(renderer)

      bubble.setRenderer(renderer)

      boxPivot.parent = renderer.scene
      floor.setRenderer(renderer)
    })
    .name('Active renderer')

  //materialShadingFolder.close()

  // const materialPhongFolder = materialFolder.addFolder('Phong')
  // materialPhongFolder
  //   .addColor(
  //     {
  //       color: {
  //         r: mesh.uniforms.phong.specularColor.value.x,
  //         g: mesh.uniforms.phong.specularColor.value.y,
  //         b: mesh.uniforms.phong.specularColor.value.z,
  //       },
  //     },
  //     'color'
  //   )
  //   .onChange((value) => {
  //     mesh.uniforms.phong.specularColor.value.set(value.r, value.g, value.b)
  //   })
  //   .name('Specular color')
  //
  // materialPhongFolder.add(mesh.uniforms.phong.specularStrength, 'value', 0, 1, 0.1).name('Specular strength')
  // materialPhongFolder.add(mesh.uniforms.phong.shininess, 'value', 2, 64, 2).name('Shininess')

  const ambientLightsFolder = gui.addFolder('Ambient lights')
  ambientLights.forEach((ambientLight, index) => {
    const ambientLightFolder = ambientLightsFolder.addFolder('Ambient light ' + index)
    ambientLightFolder.add(ambientLight, 'intensity', 0, 1, 0.01)
    ambientLightFolder
      .addColor({ color: { r: ambientLight.color.x, g: ambientLight.color.y, b: ambientLight.color.z } }, 'color')
      .onChange((value) => {
        ambientLight.color.set(value.r, value.g, value.b)
      })
  })

  ambientLightsFolder.close()

  const directionalLightsFolder = gui.addFolder('Directional lights')
  directionalLights.forEach((directionalLight, index) => {
    const directionalLightFolder = directionalLightsFolder.addFolder('Directional light ' + index)
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
    directionalLightPosFolder.add(directionalLight.position, 'x', -20, 20, 0.1)
    directionalLightPosFolder.add(directionalLight.position, 'y', -20, 20, 0.1)
    directionalLightPosFolder.add(directionalLight.position, 'z', -20, 20, 0.1)
  })

  directionalLightsFolder.close()

  const pointLightsFolder = gui.addFolder('Point lights')
  pointLights.forEach((pointLight, index) => {
    const pointLightFolder = pointLightsFolder.addFolder('Point light ' + index)
    pointLightFolder.add(pointLight, 'intensity', 0, 100, 0.01)
    pointLightFolder.add(pointLight, 'range', 0, 100000, 0.25)

    pointLightFolder
      .addColor({ color: { r: pointLight.color.x, g: pointLight.color.y, b: pointLight.color.z } }, 'color')
      .onChange((value) => {
        pointLight.color.set(value.r, value.g, value.b)
      })

    const pointLightPosFolder = pointLightFolder.addFolder('Position')
    pointLightPosFolder.add(pointLight.position, 'x', -20, 20, 0.1)
    pointLightPosFolder.add(pointLight.position, 'y', 4, 20, 0.1)
    pointLightPosFolder.add(pointLight.position, 'z', -20, 20, 0.1)
  })

  pointLightsFolder.close()

  // lost context

  const loseCtxButton = document.querySelector('#lose-context-button')

  let isContextActive = true

  loseCtxButton.addEventListener('click', () => {
    if (isContextActive) {
      activeRenderer.device?.destroy()
      loseCtxButton.textContent = 'Restore context'
      console.log('lost', activeRenderer)
    } else {
      console.log(activeRenderer.textures)
      activeRenderer.deviceManager.restoreDevice()
      loseCtxButton.textContent = 'Lose context'
      console.log('restored', activeRenderer)
    }

    isContextActive = !isContextActive
  })
})
