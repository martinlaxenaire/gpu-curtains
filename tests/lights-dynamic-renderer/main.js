// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    OrbitControls,
    GPUCameraRenderer,
    GPUDeviceManager,
    AmbientLight,
    DirectionalLight,
    PointLight,
    Vec3,
    Mesh,
    toneMappingUtils,
    getLambert,
    getPhong,
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
    //pixelRatio: window.devicePixelRatio,
    // lights: {
    //   maxPointLights: 0,
    // },
  })

  // create a camera renderer
  const rightRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    label: 'Right renderer',
    container: document.querySelector('#right-canvas'),
    //pixelRatio: window.devicePixelRatio,
    lights: {
      maxPointLights: 0,
    },
  })

  const renderers = [leftRenderer, rightRenderer]

  renderers.forEach((renderer) => {
    renderer.camera.position.y = 7.5
    renderer.camera.position.z = 15
    renderer.camera.lookAt()
  })

  const orbitControls = new OrbitControls({
    camera: leftRenderer.camera,
    element: leftRenderer.domElement.element,
  })

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @builtin(front_facing) frontFacing: bool,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };
    
    ${getLambert()}
    

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec3f = shading.color;
      
      // negate the normals if we're using front face culling
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let normal = normalize(faceDirection * fsInput.normal);
      
      let worldPosition = fsInput.worldPosition;
      let viewDirection = normalize(fsInput.viewDirection);
      
      // lambert
      color = getLambert(
        normal,
        worldPosition,
        color
      );
      
      return vec4(color, 1.0);
      //return vec4(linearToOutput3(color), 1.0);
    }
  `

  const ambientLights = []
  const directionalLights = []
  const pointLights = []

  ambientLights.push(new AmbientLight(leftRenderer))

  directionalLights.push(
    new DirectionalLight(leftRenderer, {
      color: new Vec3(1, 0, 0),
      position: new Vec3(10),
      intensity: 0.5,
      shadow: {
        intensity: 1,
      },
    })
  )

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
      position: new Vec3(-3, 3, -3),
      range: 50,
      intensity: 20,
      shadow: {
        intensity: 1,
      },
    })
  )

  console.log(leftRenderer.lights)

  const mesh = new Mesh(leftRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    castShadows: true,
    shaders: {
      // vertex: {
      //   code: vs,
      // },
      fragment: {
        code: fs,
      },
    },
    uniforms: {
      shading: {
        visibility: ['fragment'],
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(1),
          },
        },
      },
      phong: {
        visibility: ['fragment'],
        struct: {
          specularColor: {
            type: 'vec3f',
            value: new Vec3(1),
          },
          specularStrength: {
            type: 'f32',
            value: 1,
          },
          shininess: {
            type: 'f32',
            value: 32,
          },
        },
      },
    },
  })

  mesh
    .onBeforeRender(() => {
      mesh.rotation.x += 0.01
      mesh.rotation.y += 0.02
    })
    .onReady(() => {
      //console.log(mesh.material.getAddedShaderCode('fragment'))
    })

  mesh.position.y = 2

  console.log(mesh, leftRenderer)

  const floorFs = /* wgsl */ `
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
      //let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let faceDirection = 1.0;
      
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

  const planeGeometry = new PlaneGeometry()

  const boxPivot = new Object3D()
  boxPivot.parent = leftRenderer.scene

  const floor = new Mesh(leftRenderer, {
    label: 'Floor',
    geometry: planeGeometry,
    receiveShadows: true,
    frustumCulling: false, // always draw
    cullMode: 'none',
    shaders: {
      // vertex: {
      //   code: floorVs,
      // },
      fragment: {
        code: floorFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.65),
          },
        },
      },
    },
  })

  floor.parent = boxPivot
  floor.position.set(0, -1, -0.5)
  floor.rotation.set(-Math.PI / 2, 0, 0)
  floor.scale.set(30)

  // GUI
  const gui = new lil.GUI({
    title: 'Lights test',
  })

  const rendererFolder = gui.addFolder('Renderer')
  rendererFolder
    .add({ activeRenderer: 'left' }, 'activeRenderer', { Left: 0, Right: 1 })
    .onChange((value) => {
      const renderer = renderers[value]

      console.log(renderer)

      orbitControls.useCamera(renderer.camera)
      orbitControls.element = renderer.domElement.element

      // you can chose which lights you'd want to update!
      ambientLights.forEach((light) => light.setRenderer(renderer))
      //directionalLights.forEach((light) => light.setRenderer(renderer))
      pointLights.forEach((light) => light.setRenderer(renderer))

      mesh.setRenderer(renderer)

      boxPivot.parent = renderer.scene
      floor.setRenderer(renderer)
    })
    .name('Active renderer')

  const materialFolder = gui.addFolder('Material')
  const materialShadingFolder = materialFolder.addFolder('Shading')

  // materialShadingFolder
  //   .add({ materials }, 'material', materials)
  //   .name('Material')
  //   .onChange((value) => {
  //     mesh.useMaterial(value)
  //   })

  // materialShadingFolder
  //   .add({ useLambert: !!mesh.uniforms.shading.useLambert.value }, 'useLambert', [false, true])
  //   .name('Use lambert shading')
  //   .onChange((value) => {
  //     mesh.uniforms.shading.useLambert.value = value ? 1 : 0
  //   })

  materialShadingFolder
    .addColor(
      {
        color: {
          r: mesh.uniforms.shading.color.value.x,
          g: mesh.uniforms.shading.color.value.y,
          b: mesh.uniforms.shading.color.value.z,
        },
      },
      'color'
    )
    .onChange((value) => {
      mesh.uniforms.shading.color.value.set(value.r, value.g, value.b)
    })
    .name('Base color')

  materialShadingFolder.close()

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
    pointLightPosFolder.add(pointLight.position, 'y', -20, 20, 0.1)
    pointLightPosFolder.add(pointLight.position, 'z', -20, 20, 0.1)
  })

  pointLightsFolder.close()

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()
})
