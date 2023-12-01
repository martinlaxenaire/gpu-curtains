// inspired by https://barradeau.com/blog/?p=621 and https://www.clicktorelease.com/code/polygon-shredder/
// TODO use bitangent noise? https://github.com/atyuwen/bitangent_noise/blob/main/BitangentNoise.hlsl#L41
window.addEventListener('DOMContentLoaded', async () => {
  // number of particles instances
  const numParticles = 200_000
  const systemSize = new GPUCurtains.Vec3(128)

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

  gpuCurtains.camera.position.z = systemSize.z * 3

  const initialParticlePosition = new Float32Array(numParticles * 4)
  const particleMaxLife = new Float32Array(numParticles)
  const position = new GPUCurtains.Vec3()

  for (let i = 0; i < numParticles; ++i) {
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

  const computeParticles = /* wgsl */ `
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
    label: 'Compute test',
    shaders: {
      compute: {
        code: computeParticles,
      },
    },
    dispatchSize: Math.ceil(numParticles / 64), // Note that we divide the vertex count by the workgroup_size!
    inputs: {
      uniforms: {
        params: {
          bindings: {
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
          label: 'Particle',
          access: 'read_write', // we want a readable AND writable buffer!
          bindings: {
            position: {
              type: 'array<vec4f>',
              value: initialParticlePosition,
            },
          },
        },
        particlesStaticData: {
          bindings: {
            maxLife: {
              type: 'array<f32>',
              value: particleMaxLife,
            },
            position: {
              type: 'array<vec4f>',
              value: initialParticlePosition,
            },
          },
        },
      },
    },
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

  const particlesGeometry = new GPUCurtains.Geometry({
    instancesCount: numParticles,
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
            array: initialParticlePosition,
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

  // this could also work with a box geometry!
  // const particlesGeometry = new GPUCurtains.BoxGeometry({
  //   instancesCount: numParticles,
  //   vertexBuffers: [
  //     {
  //       stepMode: 'instance',
  //       name: 'instanceAttributes',
  //       attributes: [
  //         {
  //           name: 'instancePosition',
  //           type: 'vec4f',
  //           bufferFormat: 'float32x4',
  //           size: 4,
  //           array: initialParticlePosition,
  //         },
  //       ],
  //     },
  //   ],
  // })

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
    //transparent: true,
    frustumCulled: false,
    blend: {
      color: {
        srcFactor: 'src-alpha',
        dstFactor: 'one',
      },
      alpha: {
        srcFactor: 'zero',
        dstFactor: 'one',
      },
    },
  })

  particles.onRender(() => {
    const instanceVertexBuffer = particles.geometry.getVertexBufferByName('instanceAttributes')
    const particleBuffer = computePass.material.getBindingByName('particles')

    instanceVertexBuffer.buffer = particleBuffer?.buffer

    particles.rotation.x = ((Math.cos(Date.now() * 0.001) * Math.PI) / 180) * 2
    particles.rotation.y -= (Math.PI / 180) * 0.05
  })
})
