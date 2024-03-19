// real basic instancing stress test
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCurtains, Mesh, SphereGeometry } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  const systemSize = 50

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: systemSize,
      far: systemSize * 4,
    },
    //production: true, // you can always gain a couple fps by not tracking the errors
  })

  await gpuCurtains.setDevice()

  gpuCurtains.renderer
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

  gpuCurtains.camera.position.z = systemSize * 2

  // not specifically designed to be responsive
  const aspectRatio = gpuCurtains.boundingRect.width / gpuCurtains.boundingRect.height

  console.time('creation time')
  let nbMeshes = 3000

  const nbCubes = Math.round(nbMeshes * 0.5)

  const cubeGeometry = new BoxGeometry({
    instancesCount: nbCubes,
  })
  const sphereGeometry = new SphereGeometry({
    instancesCount: nbMeshes - nbCubes,
  })

  const instanceVs = /* wgsl */ `
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
      var instanceIndex: f32 = f32(attributes.instanceIndex);
      
      // rotate instance first
      let instanceSpeed: f32 = rand11(instanceIndex) * 0.5 + 0.5;
      var angle: f32 = 3.141592 * frames.elapsed * 0.0025 * instanceSpeed + instanceIndex;
      
      var transformed: vec3f = attributes.position;
      
      var rotatedTransformed: vec4f = vec4(transformed, 1.0) * rotationMatrix(vec3(0.0, 1.0, 1.0), angle);
      transformed = rotatedTransformed.xyz;
            
      // then instance translation
      transformed.x += rand11(cos(instanceIndex * instancing.seed)) * instancing.systemSize * 2.0 * instancing.aspectRatio - instancing.systemSize * instancing.aspectRatio;
      transformed.y += rand11(sin(instanceIndex * instancing.seed)) * instancing.systemSize * 2 - instancing.systemSize;
      transformed.z += -1.0 * rand11(tan(instanceIndex * instancing.seed)) * instancing.systemSize * 2;
      
      vsOutput.position = getOutputPosition(transformed);
      
      vsOutput.uv = attributes.uv;
      
      // normals
      var rotatedNormal: vec4f = vec4(attributes.normal, 1.0) * rotationMatrix(vec3(0.0, 1.0, 1.0), angle);
      
      // vsOutput.normal = getOutputPosition(rotatedNormal.xyz).xyz;
      // vsOutput.normal = (vsOutput.position * rotatedNormal).xyz;
      // vsOutput.normal = rotatedNormal.xyz;
      
      vsOutput.normal = (matrices.world * rotatedNormal).xyz;
      
      //vsOutput.angle = attributes.instancePosition.w / (3.141592 * 2.0);
      
      return vsOutput;
    }
  `

  const cubeInstances = new Mesh(gpuCurtains, {
    geometry: cubeGeometry,
    //frustumCulled: false,
    shaders: {
      vertex: {
        code: instanceVs,
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

  const sphereInstances = new Mesh(gpuCurtains, {
    geometry: sphereGeometry,
    //frustumCulled: false,
    shaders: {
      vertex: {
        code: instanceVs,
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

  // const addMesh = (index) => {
  //   const mesh = new Mesh(gpuCurtains, {
  //     geometry: Math.random() > 0.5 ? cubeGeometry : sphereGeometry,
  //     //frustumCulled: false, // you can also gain a few fps without checking for frustum
  //   })
  //
  //   mesh.position.x = Math.random() * systemSize * 2 * aspectRatio - systemSize * aspectRatio
  //   mesh.position.y = Math.random() * systemSize * 2 - systemSize
  //   mesh.position.z = -Math.random() * systemSize * 2
  //
  //   const rotationSpeed = Math.random() * 0.025
  //
  //   mesh.onRender(() => {
  //     mesh.rotation.y += rotationSpeed
  //     mesh.rotation.z += rotationSpeed
  //   })
  //
  //   meshes.push(mesh)
  // }
  //
  // for (let i = 0; i < nbMeshes; i++) {
  //   addMesh(i)
  //
  //   meshes[i].onReady(() => {
  //     createdMeshes++
  //     if (createdMeshes === nbMeshes) {
  //       console.timeEnd('creation time')
  //     }
  //   })
  // }

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
