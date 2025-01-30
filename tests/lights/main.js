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
    getLambert,
    getPhong,
    Object3D,
    getVertexShaderCode,
    getFragmentShaderCode,
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

  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.canvas,
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
        
    ${getPhong({
      toneMapping: false,
    })}
    
    ${getLambert({
      addUtils: false,
      toneMapping: false,
    })}
    

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec3f = shading.color;
      
      // negate the normals if we're using front face culling
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let normal = normalize(faceDirection * fsInput.normal);
      
      let worldPosition = fsInput.worldPosition;
      let viewDirection = normalize(fsInput.viewDirection);
      
      if(shading.useLambert == 1) {
        // lambert
        color = getLambert(
          normal,
          worldPosition,
          color
        );
      } else {
        // phong shading
        color = getPhong(
          normal,
          worldPosition,
          color,
          viewDirection,
          phong.specularColor,
          phong.specularStrength,
          phong.shininess
        );
      }
      
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
  //       color: new Vec3(1, 1, 0),
  //       intensity: 0.2,
  //     })
  //   )
  // }, 3000)

  directionalLights.push(
    new DirectionalLight(gpuCameraRenderer, {
      color: new Vec3(1, 0, 0),
      position: new Vec3(10),
      // shadow: {
      //   intensity: 1,
      // },
    })
  )

  pointLights.push(
    new PointLight(gpuCameraRenderer, {
      color: new Vec3(0, 0, 1),
      position: new Vec3(-0.7, -1.5, 3),
      range: 10,
      intensity: 3,
    })
  )

  pointLights.push(
    new PointLight(gpuCameraRenderer, {
      color: new Vec3(0, 1, 0),
      position: new Vec3(-3, 0, -1.5),
      range: 10,
    })
  )

  console.log(gpuCameraRenderer.lights)

  const boxGeometry = new BoxGeometry()

  const mesh = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: boxGeometry,
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
      console.log(mesh.material.getAddedShaderCode('fragment'))
    })

  // mesh.rotation.x = 0.5
  // mesh.rotation.y = -1

  console.log(mesh, gpuCameraRenderer)

  // test with other builtin shaders!
  const autoLitMeshParameters = {
    label: 'Auto lit mesh',
    geometry: boxGeometry,
    uniforms: {
      material: {
        visibility: ['fragment'],
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(1),
          },
        },
      },
    },
  }

  const testAutoLitMesh = new Mesh(gpuCameraRenderer, {
    ...autoLitMeshParameters,
    shaders: {
      vertex: {
        code: getVertexShaderCode({ geometry: autoLitMeshParameters.geometry }),
      },
      fragment: {
        code: getFragmentShaderCode({
          geometry: autoLitMeshParameters.geometry,
          materialUniform: autoLitMeshParameters.uniforms.material,
          materialUniformName: 'material',
          shadingModel: 'Phong',
          toneMapping: false,
        }),
      },
    },
  })

  const pivot = new Object3D()
  pivot.parent = gpuCameraRenderer.scene

  testAutoLitMesh.parent = pivot

  testAutoLitMesh.position.x = -3

  testAutoLitMesh.onBeforeRender(() => {
    pivot.rotation.z += 0.01
  })

  /*
  "
    struct VSOutput {
      @builtin(position) position: vec4f,
      @builtin(front_facing) frontFacing: bool,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };

    undefined




const PI = 3.141592653589793;
const RECIPROCAL_PI = 0.3183098861837907;
const RECIPROCAL_PI2 = 0.15915494309189535;
const EPSILON = 1e-6;

   */

  // GUI
  const gui = new lil.GUI({
    title: 'Lights test',
  })

  const materialFolder = gui.addFolder('Material')
  const materialShadingFolder = materialFolder.addFolder('Shading')

  // materialShadingFolder
  //   .add({ materials }, 'material', materials)
  //   .name('Material')
  //   .onChange((value) => {
  //     mesh.useMaterial(value)
  //   })

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
