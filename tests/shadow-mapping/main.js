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
    Vec2,
    Mesh,
    SphereGeometry,
    BoxGeometry,
    Vec3,
    Object3D,
    getLambert,
  } = await import(/* @vite-ignore */ path)

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

  camera.position.y = 7.5
  camera.position.z = 12.5

  const scenePivot = new Object3D()
  scenePivot.parent = scene

  camera.lookAt()

  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.maxOrbit.x = Math.PI * 0.15
  orbitControls.zoomStep = 0.005
  orbitControls.minZoom = -5
  orbitControls.maxZoom = 15

  // LIGHTS

  const ambientLights = []
  const directionalLights = []
  const pointLights = []

  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  ambientLights.push(ambientLight)

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(15, 15, 15),
    shadow: {
      //intensity: 1,
      bias: 0.002,
      //normalBias: 0.002,
      depthTextureSize: new Vec2(256, 256),
    },
  })

  directionalLights.push(directionalLight)

  const directionalLight2 = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(-15, 15, 15),
    shadow: {
      //intensity: 1,
      bias: 0.002,
      //normalBias: 0.002,
      //depthTextureSize: new Vec2(512, 512),
    },
  })

  directionalLights.push(directionalLight2)

  const directionalLight3 = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(15, 15, -15),
    shadow: {
      //intensity: 1,
      bias: 0.002,
      //normalBias: 0.002,
      depthTextureSize: new Vec2(1024, 1024),
    },
  })

  directionalLights.push(directionalLight3)

  const directionalLight4 = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(-15, 15, -15),
    shadow: {
      //intensity: 1,
      bias: 0.002,
      //normalBias: 0.002,
      //depthTextureSize: new Vec2(512, 512),
    },
  })

  directionalLights.push(directionalLight4)

  const pointLight = new PointLight(gpuCameraRenderer, {
    position: new Vec3(0, 0.5, 0),
    color: new Vec3(1),
    range: 15,
    intensity: 5,
  })

  pointLight.shadow.cast({
    bias: 0.0005,
    //normalBias: 0.075,
    //intensity: 1,
    //depthTextureSize: new Vec2(512, 512),
    // camera: {
    //   near: 0.5,
    // },
    // autoRender: false,
  })

  pointLights.push(pointLight)

  // const pointLight2 = new PointLight(gpuCameraRenderer, {
  //   position: new Vec3(-5, 0.5, 0),
  //   color: new Vec3(1),
  //   range: 15,
  //   intensity: 3,
  //   shadow: {
  //     bias: 0.005,
  //     intensity: 5,
  //     depthTextureSize: new Vec2(512, 512),
  //   },
  // })
  //
  // pointLights.push(pointLight2)

  setTimeout(() => {
    //directionalLight.shadow.depthTextureSize.set(256, 256)
    //directionalLight.shadow.intensity = 0.1
  }, 2000)

  // RENDER

  let rotatePivot = true

  const animate = () => {
    if (rotatePivot) scenePivot.rotation.y += 0.015

    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  const meshVs = /* wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      @location(1) worldPosition: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.normal = getWorldNormal(attributes.normal);
      vsOutput.worldPosition = getWorldPosition(attributes.position).xyz;
      
      return vsOutput;
    }
  `

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @builtin(front_facing) frontFacing: bool,
      @location(0) normal: vec3f,
      @location(1) worldPosition: vec3f,
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

  // create sphere

  const sphereGeometry = new SphereGeometry()

  const sphere = new Mesh(gpuCameraRenderer, {
    label: 'Sphere',
    geometry: sphereGeometry,
    receiveShadows: true,
    castShadows: true, // could be added that way
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(1, 0, 0),
          },
        },
      },
    },
  })

  sphere.position.z = 2.5
  sphere.parent = scenePivot

  const cube = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    receiveShadows: true,
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0, 0, 1),
          },
        },
      },
    },
  })

  // or could be added that way with additional parameters
  directionalLight.shadow.addShadowCastingMesh(cube, {
    //cullMode: 'front',
  })

  directionalLight2.shadow.addShadowCastingMesh(cube, {
    //cullMode: 'front',
  })

  directionalLight3.shadow.addShadowCastingMesh(cube, {
    //cullMode: 'front',
  })

  directionalLight4.shadow.addShadowCastingMesh(cube, {
    //cullMode: 'front',
  })

  pointLight.shadow.addShadowCastingMesh(cube, {
    //cullMode: 'front',
  })

  // pointLight2.shadow.addShadowCastingMesh(cube, {
  //   //cullMode: 'front',
  // })

  cube.position.x = 2.5
  cube.parent = scenePivot

  cube.onBeforeRender(() => {
    cube.rotation.y = -scenePivot.rotation.y
  })

  const cube2 = new Mesh(gpuCameraRenderer, {
    label: 'Cube 2',
    geometry: new BoxGeometry(),
    castShadows: true,
    receiveShadows: true,
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0, 1, 0),
          },
        },
      },
    },
  })

  cube2.position.x = -2.5
  cube2.parent = scenePivot

  cube2.onBeforeRender(() => {
    cube2.rotation.y = -scenePivot.rotation.y
  })

  const sphere2 = new Mesh(gpuCameraRenderer, {
    label: 'Sphere 2',
    geometry: sphereGeometry,
    receiveShadows: true,
    castShadows: true,
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(1, 1, 0),
          },
        },
      },
    },
  })

  sphere2.position.z = -2.5
  sphere2.parent = scenePivot

  // let time = 0
  //
  // sphere2.onBeforeRender(() => {
  //   time += 0.0375
  //   sphere2.position.y = 1 + Math.sin(time)
  //   directionalLight.position.z = Math.cos(time * 0.75) * 15
  // })

  // create floor
  // the floor will not cast shadows, but it will receive them

  const planeGeometry = new PlaneGeometry()

  const boxPivot = new Object3D()
  boxPivot.parent = scene

  const floor = new Mesh(gpuCameraRenderer, {
    label: 'Floor',
    geometry: planeGeometry,
    receiveShadows: true,
    frustumCulling: false, // always draw
    cullMode: 'none',
    shaders: {
      vertex: {
        code: meshVs,
      },
      fragment: {
        code: meshFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.15),
          },
        },
      },
    },
  })

  floor.parent = boxPivot
  floor.position.set(0, -1, -0.5)
  floor.rotation.set(-Math.PI / 2, 0, 0)
  floor.scale.set(30)

  // finally render point light once
  // pointLight.shadow.renderOnce()

  // GUI
  const gui = new lil.GUI({
    title: 'Lights & shadows test',
  })

  gui.close()

  gui
    .add({ rotatePivot }, 'rotatePivot')
    .name('Rotate scene')
    .onChange((value) => {
      rotatePivot = value
    })

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
    directionalLightPosFolder.add(directionalLight.position, 'x', -20, 20, 0.25)
    directionalLightPosFolder.add(directionalLight.position, 'y', -20, 20, 0.25)
    directionalLightPosFolder.add(directionalLight.position, 'z', -20, 20, 0.25)

    if (directionalLight.shadow.isActive) {
      const directionalShadow = directionalLightFolder.addFolder('Shadow')
      directionalShadow.add(directionalLight.shadow, 'intensity', 0, 10, 0.01)
      directionalShadow.add(directionalLight.shadow, 'bias', 0, 0.01, 0.0001)
      directionalShadow.add(directionalLight.shadow, 'normalBias', 0, 0.01, 0.0001)
      directionalShadow.add(directionalLight.shadow.depthTextureSize, 'x', 128, 1024, 64).name('Texture width')
      directionalShadow.add(directionalLight.shadow.depthTextureSize, 'y', 128, 1024, 64).name('Texture height')
    }
  })

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
    pointLightPosFolder.add(pointLight.position, 'x', -10, 10, 0.25)
    pointLightPosFolder.add(pointLight.position, 'y', -1, 10, 0.25)
    pointLightPosFolder.add(pointLight.position, 'z', -10, 10, 0.25)

    if (pointLight.shadow.isActive) {
      const pointShadow = pointLightFolder.addFolder('Shadow')
      pointShadow.add(pointLight.shadow, 'intensity', 0, 10, 0.01)
      pointShadow.add(pointLight.shadow, 'bias', 0, 0.01, 0.0001)
      pointShadow.add(pointLight.shadow, 'normalBias', 0, 0.01, 0.0001)
      pointShadow.add(pointLight.shadow.depthTextureSize, 'x', 128, 1024, 64).name('Texture width')
      pointShadow.add(pointLight.shadow.depthTextureSize, 'y', 128, 1024, 64).name('Texture height')
    }
  })
})
