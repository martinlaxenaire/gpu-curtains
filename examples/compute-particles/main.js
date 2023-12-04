// inspired by https://barradeau.com/blog/?p=621 and https://www.clicktorelease.com/code/polygon-shredder/
// TODO use bitangent noise? https://github.com/atyuwen/bitangent_noise/blob/main/BitangentNoise.hlsl#L41
window.addEventListener('DOMContentLoaded', async () => {
  // number of particles instances
  const nbParticles = 500_000
  const systemSize = new GPUCurtains.Vec3(150)

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 1,
      far: systemSize.z * 50,
    },
  })

  await gpuCurtains.setRendererContext()

  let now = performance.now()

  const particlesBindGroup = new GPUCurtains.BindGroup(gpuCurtains.renderer, {
    label: 'Particles bind group',
    inputs: {
      uniforms: {
        params: {
          bindings: {
            systemSize: {
              type: 'vec3f',
              value: systemSize,
            },
            nbParticles: {
              type: 'f32',
              value: nbParticles,
            },
            time: {
              type: 'f32',
              value: 0,
            },
            frequency: {
              type: 'f32',
              value: 0.01,
            },
            amplitude: {
              type: 'f32',
              value: 0.5,
            },
          },
        },
      },
      storages: {
        particles: {
          access: 'read_write', // we want a readable AND writable buffer!
          bindings: {
            position: {
              type: 'array<vec4f>',
              value: new Float32Array(nbParticles * 4),
            },
          },
        },
        particlesStaticData: {
          access: 'read_write', // we want a readable AND writable buffer!
          bindings: {
            maxLife: {
              type: 'array<f32>',
              value: new Float32Array(nbParticles),
            },
            position: {
              type: 'array<vec4f>',
              value: new Float32Array(nbParticles * 4),
            },
          },
        },
      },
    },
  })

  const computeInitData = /* wgsl */ `
    // https://github.com/Cyan4973/xxHash
    // https://www.shadertoy.com/view/Xt3cDn
    fn xxhash32(n: u32) -> u32 {
        var h32 = n + 374761393u;
        h32 = 668265263u * ((h32 << 17) | (h32 >> (32 - 17)));
        h32 = 2246822519u * (h32 ^ (h32 >> 15));
        h32 = 3266489917u * (h32 ^ (h32 >> 13));
        return h32^(h32 >> 16);
    }

    // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
    //fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
    fn rand11(f: f32) -> f32 { return f32(xxhash32(bitcast<u32>(f))) / f32(0xffffffff); }

    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
    ) {
      var index = GlobalInvocationID.x;
      
      var fIndex: f32 = f32(index);
      
      // calculate a random particle max life
      // max life is in number of frames
      var maxLife: f32 = 1500.0 + round(rand11(asin(fIndex / params.nbParticles)) * 1000.0);
      particlesStaticData[index].maxLife = maxLife;
      
      // now set a different initial life for each particle
      var initLife: f32 = round(maxLife * rand11(acos(fIndex / params.nbParticles)));
      
      particles.position[index].w = initLife;
      particlesStaticData[index].position.w = initLife;
      
      // now the positions
      // calculate an initial random position along a sphere the size of our system
      var position: vec3f;
      position.x = rand11(cos(fIndex / params.nbParticles)) * 2.0 - 1.0;
      position.y = rand11(sin(fIndex / params.nbParticles)) * 2.0 - 1.0;
      position.z = rand11(tan(fIndex / params.nbParticles)) * 2.0 - 1.0;
      
      var posLength = length(position);
      if(posLength > 1.0) {
        posLength *= 1.0 / posLength;
      }
      
      position = normalize(position) * params.systemSize;
      
      // write positions
      particles.position[index].x = position.x;
      particles.position[index].y = position.y;
      particles.position[index].z = position.z;
      
      particlesStaticData[index].position.x = position.x;
      particlesStaticData[index].position.y = position.y;
      particlesStaticData[index].position.z = position.z;
    }
  `

  // first our compute pass
  const computeInit = new GPUCurtains.ComputePass(gpuCurtains, {
    label: 'Compute initial data',
    shaders: {
      compute: {
        code: computeInitData,
      },
    },
    dispatchSize: Math.ceil(nbParticles / 64), // Note that we divide the vertex count by the workgroup_size!
    bindGroups: [particlesBindGroup],
    autoAddToScene: false,
  })

  // now we should await pipeline compilation!
  await computeInit.material.setMaterial()

  // now compute the init data just once
  const commandEncoder = gpuCurtains.renderer.device.createCommandEncoder({
    label: 'Compute init data command encoder',
  })

  const pass = commandEncoder.beginComputePass()
  computeInit.render(pass)
  pass.end()

  const commandBuffer = commandEncoder.finish()
  gpuCurtains.renderer.device.queue.submit([commandBuffer])

  console.log('time to generate particles positions on the GPU', performance.now() - now)

  const computeParticles = /* wgsl */ `
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
    fn mod289_3(x: vec3f) -> vec3f {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    fn mod289(x: vec2f) -> vec2f {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    fn permute3(x: vec3f) -> vec3f {
      return mod289_3(((x*34.0)+1.0)*x);
    }
    
    //  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket
    fn simplexNoise2(v: vec2f) -> f32 {
        let C = vec4(
            0.211324865405187, // (3.0-sqrt(3.0))/6.0
            0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
            -0.577350269189626, // -1.0 + 2.0 * C.x
            0.024390243902439 // 1.0 / 41.0
        );
    
        // First corner
        var i = floor(v + dot(v, C.yy));
        let x0 = v - i + dot(i, C.xx);
    
        // Other corners
        var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);
    
        // x0 = x0 - 0.0 + 0.0 * C.xx ;
        // x1 = x0 - i1 + 1.0 * C.xx ;
        // x2 = x0 - 1.0 + 2.0 * C.xx ;
        var x12 = x0.xyxy + C.xxzz;
        x12.x = x12.x - i1.x;
        x12.y = x12.y - i1.y;
    
        // Permutations
        i = mod289(i); // Avoid truncation effects in permutation
    
        var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
        var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));
        m *= m;
        m *= m;
    
        // Gradients: 41 points uniformly over a line, mapped onto a diamond.
        // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
        let x = 2. * fract(p * C.www) - 1.;
        let h = abs(x) - 0.5;
        let ox = floor(x + 0.5);
        let a0 = x - ox;
    
        // Normalize gradients implicitly by scaling m
        // Approximation of: m *= inversesqrt( a0*a0 + h*h );
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    
        // Compute final noise value at P
        let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
        return 130. * dot(m, g);
    }
    
    fn curl(position: vec3f) -> vec3f {
    
      var	eps: f32	= 1.0;
      var eps2: f32 = 2. * eps;
      var	n1: f32;
      var n2: f32;
      var a: f32;
      var b: f32;
      
      var x: f32 = position.x;
      var y: f32 = position.y;
      var z: f32 = position.z;
  
      var curl: vec3f = vec3(0.);
  
      n1	=	simplexNoise2(vec2( x,	y	+	eps ));
      n2	=	simplexNoise2(vec2( x,	y	-	eps ));
      a	=	(n1	-	n2)/eps2;
  
      n1	=	simplexNoise2(vec2( x,	z	+	eps));
      n2	=	simplexNoise2(vec2( x,	z	-	eps));
      b	=	(n1	-	n2)/eps2;
  
      curl.x	=	a	-	b;
  
      n1	=	simplexNoise2(vec2( y,	z	+	eps));
      n2	=	simplexNoise2(vec2( y,	z	-	eps));
      a	=	(n1	-	n2)/eps2;
  
      n1	=	simplexNoise2(vec2( x	+	eps,	z));
      n2	=	simplexNoise2(vec2( x	+	eps,	z));
      b	=	(n1	-	n2)/eps2;
  
      curl.y	=	a	-	b;
  
      n1	=	simplexNoise2(vec2( x	+	eps,	y));
      n2	=	simplexNoise2(vec2( x	-	eps,	y));
      a	=	(n1	-	n2)/eps2;
  
      n1	=	simplexNoise2(vec2(  y	+	eps,	z));
      n2	=	simplexNoise2(vec2(  y	-	eps,	z));
      b	=	(n1	-	n2)/eps2;
  
      curl.z	=	a	-	b;
  
      return	curl;
    }


    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
    ) {
      var index = GlobalInvocationID.x;
      
      var vPos: vec3f = particles.position[index].xyz;
      var life: f32 = particles.position[index].w;
      let maxLife: f32 = particlesStaticData[index].maxLife;
      //let maxLife: f32 = 180;
      
      var curlPos: vec3f = curl( vPos * params.frequency + params.time * 0.05 ) * params.amplitude;
      vPos = vPos + curlPos;

      life += 1.0;
      
      
      // reset particle
      if(life >= maxLife) {
        life = 0.0;
        //vPos = particlesStaticData[index].position.xyz;
      }
      
      let lifeRatio = life / maxLife;
      var mixCurlOriginal = abs(lifeRatio * 2.0 - 1.0);
      mixCurlOriginal = pow(mixCurlOriginal, 0.015);
      
      vPos = mix(particlesStaticData[index].position.xyz, vPos, mixCurlOriginal);
      
      // Write back      
      particles.position[index] = vec4(vPos, life);
    }
  `

  // first our compute pass
  const computePass = new GPUCurtains.ComputePass(gpuCurtains, {
    label: 'Compute particles positions',
    shaders: {
      compute: {
        code: computeParticles,
      },
    },
    dispatchSize: Math.ceil(nbParticles / 64), // Note that we divide the vertex count by the workgroup_size!
    bindGroups: [particlesBindGroup],
    // inputs: {
    //   uniforms: {
    //     params: {
    //       bindings: {
    //         time: {
    //           type: 'f32',
    //           value: 0,
    //         },
    //         frequency: {
    //           type: 'f32',
    //           value: 0.01,
    //         },
    //         amplitude: {
    //           type: 'f32',
    //           value: 0.5,
    //         },
    //       },
    //     },
    //   },
    //   storages: {
    //     particles: {
    //       label: 'Particle',
    //       access: 'read_write', // we want a readable AND writable buffer!
    //       bindings: {
    //         position: {
    //           type: 'array<vec4f>',
    //           value: initialParticlePosition,
    //         },
    //       },
    //     },
    //     particlesStaticData: {
    //       bindings: {
    //         maxLife: {
    //           type: 'array<f32>',
    //           value: particleMaxLife,
    //         },
    //         position: {
    //           type: 'array<vec4f>',
    //           value: initialParticlePosition,
    //         },
    //       },
    //     },
    //   },
    // },
  })

  console.log(computePass)

  computePass
    .onReady(() => {
      // useful to get the WGSL struct and variables code generated based on input bindings
      console.log(computePass.material.getAddedShaderCode('compute'))
    })
    .onRender(() => {
      computePass.uniforms.params.time.value += 0.1
    })

  // now the render part
  gpuCurtains.camera.position.z = systemSize.z * 3

  const particlesVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      var transformed: vec3f = attributes.instancePosition.xyz;
      vsOutput.position = getOutputPosition(camera, matrices, transformed);
      
      return vsOutput;
    }
  `

  const particlesFs = `
      struct VSOutput {
      @builtin(position) position: vec4f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return vec4(normalize(fsInput.position.xyz) * 0.5 + 0.5, 1.0);
    }
  `

  // create a geometry from scratch that
  // but this could also work with any geometry, topology, etc
  // as long as we pass the instanced vertex buffer attributes
  const particlesGeometry = new GPUCurtains.Geometry({
    instancesCount: nbParticles,
    // we will draw points
    topology: 'point-list',
    // and they will use instancing
    vertexBuffers: [
      {
        stepMode: 'instance',
        name: 'instanceAttributes',
        attributes: [
          {
            name: 'instancePosition',
            type: 'vec4f',
            bufferFormat: 'float32x4',
            size: 4,
            array: new Float32Array(nbParticles * 4),
          },
        ],
      },
    ],
  })

  particlesGeometry.setAttribute({
    name: 'position',
    type: 'vec3f',
    bufferFormat: 'float32x3',
    size: 3,
    array: new Float32Array([0, 0, 0]),
  })

  const particles = new GPUCurtains.Mesh(gpuCurtains, {
    label: 'Particles mesh',
    geometry: particlesGeometry,
    shaders: {
      vertex: {
        code: particlesVs,
      },
      fragment: {
        code: particlesFs,
      },
    },
    transparent: true,
    frustumCulled: false,
    // TODO test blending with other objects!
    // blend: {
    //   color: {
    //     //srcFactor: 'src-alpha',
    //     srcFactor: 'one',
    //     dstFactor: 'one',
    //   },
    //   alpha: {
    //     srcFactor: 'zero',
    //     dstFactor: 'one',
    //   },
    // },
  })

  particles.onRender(() => {
    const instanceVertexBuffer = particles.geometry.getVertexBufferByName('instanceAttributes')
    const particleBuffer = computePass.material.getBindingByName('particles')
    //const particleBuffer = computeInit.material.getBindingByName('particles')

    instanceVertexBuffer.buffer = particleBuffer?.buffer

    particles.rotation.x = ((Math.cos(Date.now() * 0.001) * Math.PI) / 180) * 2
    particles.rotation.y -= (Math.PI / 180) * 0.05
  })

  // test timings
  now = performance.now()
  const initialParticlePosition = new Float32Array(nbParticles * 4)
  const particleMaxLife = new Float32Array(nbParticles)
  const position = new GPUCurtains.Vec3()

  for (let i = 0; i < nbParticles; ++i) {
    position.x = Math.random() * 2 - 1
    position.y = Math.random() * 2 - 1
    position.z = Math.random() * 2 - 1

    const length = position.length()
    if (length > 1) {
      position.multiplyScalar(1 / length)
    }

    position.normalize().multiply(systemSize)

    // number of frames for a cycle
    const maxLife = 1500 + Math.ceil(Math.random() * 1000)
    particleMaxLife[i] = maxLife

    initialParticlePosition[4 * i + 0] = position.x
    initialParticlePosition[4 * i + 1] = position.y
    initialParticlePosition[4 * i + 2] = position.z
    initialParticlePosition[4 * i + 3] = Math.ceil(maxLife * Math.random()) // initial life
  }

  console.log('time to generate positions on CPU', performance.now() - now)
})
