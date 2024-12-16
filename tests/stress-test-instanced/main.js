// real basic instancing stress test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUDeviceManager, GPUCameraRenderer, BoxGeometry, Mesh, SphereGeometry } = await import(
    /* @vite-ignore */ path
  )

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  const systemSize = 50

  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    // production: true, // you can always gain a couple fps by not tracking the errors
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: systemSize,
      far: systemSize * 4,
    },
    lights: false, // disable lights and shadows buffer, we want the bare minimum
  })

  // render it
  const animate = () => {
    requestAnimationFrame(animate)

    stats.begin()

    gpuDeviceManager.render()
    stats.end()
  }

  animate()

  gpuCameraRenderer.camera.position.z = systemSize * 2

  // not specifically designed to be responsive
  const aspectRatio = gpuCameraRenderer.boundingRect.width / gpuCameraRenderer.boundingRect.height

  console.time('creation time')

  // get meshes count from url search params
  const url = new URL(window.location)
  const searchParams = new URLSearchParams(url.search)
  const urlCount = searchParams.get('count') && parseInt(searchParams.get('count'))
  let nbMeshes = urlCount || 10_000

  const nbCubes = Math.round(nbMeshes * 0.5)

  const cubeGeometry = new BoxGeometry({
    instancesCount: nbCubes,
  })
  const sphereGeometry = new SphereGeometry({
    instancesCount: nbMeshes - nbCubes,
  })

  const instancesVs = /* wgsl */ `
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
  
    // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
    fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
    
    fn rotationMatrix(axis: vec3f, angle: f32) -> mat4x4f {
      var nAxis: vec3f = normalize(axis);
      var s: f32 = sin(angle);
      var c: f32 = cos(angle);
      var oc: f32 = 1.0 - c;
  
      return mat4x4f(
        oc * nAxis.x * nAxis.x + c, oc * nAxis.x * nAxis.y - nAxis.z * s,  oc * nAxis.z * nAxis.x + nAxis.y * s,  0.0,
        oc * nAxis.x * nAxis.y + nAxis.z * s,  oc * nAxis.y * nAxis.y + c, oc * nAxis.y * nAxis.z - nAxis.x * s,  0.0,
        oc * nAxis.z * nAxis.x - nAxis.y * s,  oc * nAxis.y * nAxis.z + nAxis.x * s,  oc * nAxis.z * nAxis.z + c, 0.0,
        0.0, 0.0, 0.0, 1.0);
    }
    
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      // get what instance is actually drawn
      let instanceIndex: f32 = f32(attributes.instanceIndex);
      
      // rotate instance first
      let instanceSpeed: f32 = rand11(instanceIndex) * 0.5 + 0.5;
      let angle: f32 = 3.141592 * frames.elapsed * 0.0025 * instanceSpeed + instanceIndex;
      
      var transformed: vec3f = attributes.position;
      
      let rotatedTransformed: vec4f = vec4(transformed, 1.0) * rotationMatrix(vec3(0.0, 1.0, 1.0), angle);
      transformed = rotatedTransformed.xyz;
            
      // then instance translation
      transformed.x +=
        rand11(cos(instanceIndex * instancing.seed))
        * instancing.systemSize * 2.0 * instancing.aspectRatio
        - instancing.systemSize * instancing.aspectRatio;
      
      transformed.y +=
        rand11(sin(instanceIndex * instancing.seed))
        * instancing.systemSize * 2
        - instancing.systemSize;
      
      transformed.z +=
        -1.0 * rand11(tan(instanceIndex * instancing.seed))
        * instancing.systemSize * 2;
      
      vsOutput.position = getOutputPosition(transformed);
      
      // uv
      vsOutput.uv = attributes.uv;
      
      // normals      
      let rotatedNormal: vec4f = vec4(attributes.normal, 1.0) * rotationMatrix(vec3(0.0, 1.0, 1.0), angle);
      vsOutput.normal = rotatedNormal.xyz;
            
      return vsOutput;
    }
  `

  const cubeInstances = new Mesh(gpuCameraRenderer, {
    geometry: cubeGeometry,
    //frustumCulling: false,
    shaders: {
      vertex: {
        code: instancesVs,
      },
    },
    uniforms: {
      frames: {
        struct: {
          elapsed: {
            type: 'f32',
            value: 0,
          },
        },
      },
      instancing: {
        struct: {
          systemSize: {
            type: 'f32',
            value: systemSize,
          },
          aspectRatio: {
            type: 'f32',
            value: aspectRatio,
          },
          seed: {
            type: 'f32',
            value: Math.random(),
          },
        },
      },
    },
  })

  cubeInstances.onRender(() => {
    cubeInstances.uniforms.frames.elapsed.value++
  })

  const sphereInstances = new Mesh(gpuCameraRenderer, {
    geometry: sphereGeometry,
    //frustumCulling: false,
    shaders: {
      vertex: {
        code: instancesVs,
      },
    },
    uniforms: {
      frames: {
        struct: {
          elapsed: {
            type: 'f32',
            value: 0,
          },
        },
      },
      instancing: {
        struct: {
          systemSize: {
            type: 'f32',
            value: systemSize,
          },
          aspectRatio: {
            type: 'f32',
            value: aspectRatio,
          },
          seed: {
            type: 'f32',
            value: Math.random(),
          },
        },
      },
    },
  })

  sphereInstances.onRender(() => {
    sphereInstances.uniforms.frames.elapsed.value++
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Instancing stress test',
  })

  gui
    .add({ nbMeshes }, 'nbMeshes', 500, 50_000, 2)
    .name('Number of instances')
    .onFinishChange((value) => {
      const diff = value - nbMeshes

      cubeInstances.geometry.instancesCount += diff * 0.5
      sphereInstances.geometry.instancesCount += diff * 0.5

      nbMeshes = value
    })
})
