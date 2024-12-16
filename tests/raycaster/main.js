// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    BoxGeometry,
    SphereGeometry,
    GPUCameraRenderer,
    GPUDeviceManager,
    Raycaster,
    Vec2,
    Vec3,
    Mesh,
    Object3D,
    Geometry,
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

  const { camera, scene } = gpuCameraRenderer

  let visibleSize = camera.getVisibleSizeAtDepth()

  gpuCameraRenderer.onResize(() => {
    visibleSize = camera.getVisibleSizeAtDepth()
  })

  let time = 0

  // render it
  const animate = () => {
    gpuDeviceManager.render()
    time++
    requestAnimationFrame(animate)
  }

  animate()

  const meshes = []
  const raycastedObjects = []

  // SHADERS
  const vs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) raycastingDistance: vec3f,
  };
  
  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {
    var vsOutput: VSOutput;
  
    vsOutput.position = getOutputPosition(attributes.position);
    
    var raycastPosition: vec3f = (camera.projection * camera.view * vec4(raycasting.position, 1.0)).xyz;
    vsOutput.raycastingDistance = vsOutput.position.xyz - raycastPosition;
    
    vsOutput.uv = attributes.uv;
    vsOutput.normal = getWorldNormal(attributes.normal);
    
    return vsOutput;
  }`

  const fs = `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) raycastingDistance: vec3f,
  };
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    // normals
    var normalColor: vec4f = vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
        
    var cursorUv: vec2f = fsInput.uv - raycasting.uv;
    var cursorPosition: vec3f = fsInput.raycastingDistance;
    
    // whether to highlight hit position based on UV or vertex position
    var cursorSize: f32 = select(
      step(length(cursorUv), 0.2),
      1.0 - step(1.0, length(cursorPosition)),
      bool(raycasting.usePosition)
    );
    
    return mix(normalColor, vec4(1.0), cursorSize);
  }`

  // CUBE
  const cube = new Mesh(gpuCameraRenderer, {
    label: 'Cube',
    geometry: new BoxGeometry(),
    shaders: {
      vertex: {
        code: vs,
      },
      fragment: {
        code: fs,
      },
    },
    uniforms: {
      raycasting: {
        struct: {
          position: {
            type: 'vec3f',
            value: new Vec3(Infinity),
          },
          uv: {
            type: 'vec2f',
            value: new Vec2(Infinity),
          },
          usePosition: {
            type: 'f32',
            value: 1,
          },
        },
      },
    },
  })

  cube.onBeforeRender(() => {
    cube.rotation.y += 0.02
    cube.position.x = Math.cos(time * 0.01) * (visibleSize.width * 0.33)
  })

  meshes.push(cube)
  raycastedObjects.push(cube)

  // SPHERE
  const sphere = new Mesh(gpuCameraRenderer, {
    label: 'Sphere',
    geometry: new SphereGeometry(),
    shaders: {
      vertex: {
        code: vs,
      },
      fragment: {
        code: fs,
      },
    },
    uniforms: {
      raycasting: {
        struct: {
          position: {
            type: 'vec3f',
            value: new Vec3(Infinity),
          },
          uv: {
            type: 'vec2f',
            value: new Vec2(Infinity),
          },
          usePosition: {
            type: 'f32',
            value: 1,
          },
        },
      },
    },
  })

  sphere.scale.set(1.25)

  sphere.onBeforeRender(() => {
    sphere.position.y = Math.sin(time * 0.01) * (visibleSize.height * 0.33)
  })

  meshes.push(sphere)
  raycastedObjects.push(sphere)

  // PYRAMIDS (custom geometry + parent pivot)
  const pyramidsParent = new Object3D()
  pyramidsParent.parent = scene

  raycastedObjects.push(pyramidsParent)

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

  const pyramidGeometry = new Geometry({
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
            name: 'normal', // normal and uvs attributes are inverted, just to test pipeline recompilations!
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

  for (let i = 0; i < 4; i++) {
    const pyramid = new Mesh(gpuCameraRenderer, {
      label: 'Pyramid ' + i,
      geometry: pyramidGeometry,
      shaders: {
        vertex: {
          code: vs,
        },
        fragment: {
          code: fs,
        },
      },
      uniforms: {
        raycasting: {
          struct: {
            position: {
              type: 'vec3f',
              value: new Vec3(Infinity),
            },
            uv: {
              type: 'vec2f',
              value: new Vec2(Infinity),
            },
            usePosition: {
              type: 'f32',
              value: 1,
            },
          },
        },
      },
    })

    pyramid.parent = pyramidsParent

    const setPosition = () => {
      pyramid.position.x = i < 2 ? visibleSize.width * 0.33 : visibleSize.width * -0.33
      pyramid.position.y = i % 2 === 1 ? visibleSize.height * 0.33 : visibleSize.height * -0.33
    }

    pyramid
      .onBeforeRender(() => {
        pyramid.rotation.y += 0.01
      })
      .onAfterResize(setPosition)

    setPosition()

    meshes.push(pyramid)
  }

  // RAYCASTING
  const raycaster = new Raycaster(gpuCameraRenderer)

  console.log(raycastedObjects)

  const onMouseMove = (e) => {
    // raycasting
    raycaster.setFromMouse(e)

    const intersections = raycaster.intersectObjects(raycastedObjects)

    if (intersections.length) {
      const closestIntersection = intersections[0]
      // console.log(intersects)

      closestIntersection.object.uniforms.raycasting.position.value.copy(closestIntersection.point)
      closestIntersection.object.uniforms.raycasting.uv.value.copy(closestIntersection.uv)
    } else {
      meshes.forEach((mesh) => {
        mesh.uniforms.raycasting.position.value.set(Infinity)
        mesh.uniforms.raycasting.uv.value.set(Infinity)
      })
    }
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('touchmove', onMouseMove)

  // GUI
  const gui = new lil.GUI({
    title: 'Raycasting',
  })

  gui
    .add({ usePosition: 1 }, 'usePosition', { Vertices: 1, UV: 0 })
    .name('Highlight hit point using:')
    .onChange((value) => {
      meshes.forEach((mesh) => {
        mesh.uniforms.raycasting.usePosition.value = value
      })
    })
})
