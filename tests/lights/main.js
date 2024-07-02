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
    //pixelRatio: window.devicePixelRatio,
  })

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    requestAnimationFrame(animate)
  }

  animate()

  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.minZoom = -5

  const vs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = attributes.uv;
      vsOutput.normal = getWorldNormal(attributes.normal);
      vsOutput.worldPosition = getWorldPosition(attributes.position).xyz;
      vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
      
      return vsOutput;
    }
  `

  const fs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec3f = shading.color;
      
      let normal = normalize(fsInput.normal);
      let worldPosition = fsInput.worldPosition;
      let viewDirection = normalize(fsInput.viewDirection);
      
      //let totalAmbient: vec3f = getAmbientContribution();
      
      // diffuse lambert shading
      //let totalDiffuse: vec3f = getTotalDiffuseContribution(normal, worldPosition);
      
      var lightContribution: LightContribution;
      
      if(shading.useLambert == 1) {
        // lambert
        lightContribution = getLambertLightContribution(normal, worldPosition);
      } else {
        // phong shading
        let specularStrength: f32 = 1.0;
        let specularColor: vec3f = vec3(1.0);
        let shininess: f32 = 30;
        lightContribution = getPhongLightContribution(
          normal,
          worldPosition,
          viewDirection,
          phong.shininess,
          phong.specularColor,
          phong.specularStrength
        );
      }
      
      color = (lightContribution.ambient + lightContribution.diffuse + lightContribution.specular) * color;
      
      return vec4(color, 1.0);
    }
  `

  const ambientLights = []
  const directionalLights = []
  const pointLights = []

  ambientLights.push(new AmbientLight(gpuCameraRenderer))

  // setTimeout(() => {
  //   ambientLights.push(
  //     new AmbientLight(gpuCameraRenderer, {
  //       color: new Vec3(0, 1, 0),
  //       intensity: 0.2,
  //     })
  //   )
  // }, 3000)

  directionalLights.push(
    new DirectionalLight(gpuCameraRenderer, {
      color: new Vec3(1, 0, 0),
      position: new Vec3(10),
    })
  )

  pointLights.push(
    new PointLight(gpuCameraRenderer, {
      color: new Vec3(0, 0, 1),
      position: new Vec3(-0.7, -1.25, 2),
      range: 10,
    })
  )

  pointLights.push(
    new PointLight(gpuCameraRenderer, {
      color: new Vec3(0, 1, 0),
      position: new Vec3(-3, 0, -1.5),
      range: 10,
    })
  )

  const mesh = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
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
          useLambert: {
            type: 'i32',
            value: 0,
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
      // mesh.rotation.x += 0.01
      // mesh.rotation.y += 0.02
    })
    .onReady(() => {
      //console.log(mesh.material.getAddedShaderCode('vertex'))
    })

  // mesh.rotation.x = 0.5
  // mesh.rotation.y = -1

  console.log(mesh, gpuCameraRenderer)

  // GUI
  const gui = new lil.GUI({
    title: 'Lights test',
  })

  const materialFolder = gui.addFolder('Material')
  const materialShadingFolder = materialFolder.addFolder('Shading')
  materialShadingFolder
    .add({ useLambert: !!mesh.uniforms.shading.useLambert.value }, 'useLambert', [false, true])
    .name('Use lambert shading')
    .onChange((value) => {
      mesh.uniforms.shading.useLambert.value = value ? 1 : 0
    })
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

  const materialPhongFolder = materialFolder.addFolder('Phong')
  materialPhongFolder
    .addColor(
      {
        color: {
          r: mesh.uniforms.phong.specularColor.value.x,
          g: mesh.uniforms.phong.specularColor.value.y,
          b: mesh.uniforms.phong.specularColor.value.z,
        },
      },
      'color'
    )
    .onChange((value) => {
      mesh.uniforms.phong.specularColor.value.set(value.r, value.g, value.b)
    })
    .name('Specular color')

  materialPhongFolder.add(mesh.uniforms.phong.specularStrength, 'value', 0, 1, 0.1).name('Specular strength')
  materialPhongFolder.add(mesh.uniforms.phong.shininess, 'value', 2, 64, 2).name('Shininess')

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
    directionalLightPosFolder.add(directionalLight.position, 'x', -20, 20, 0.1)
    directionalLightPosFolder.add(directionalLight.position, 'y', -20, 20, 0.1)
    directionalLightPosFolder.add(directionalLight.position, 'z', -20, 20, 0.1)
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
    pointLightPosFolder.add(pointLight.position, 'x', -20, 20, 0.1)
    pointLightPosFolder.add(pointLight.position, 'y', -20, 20, 0.1)
    pointLightPosFolder.add(pointLight.position, 'z', -20, 20, 0.1)
  })
})
