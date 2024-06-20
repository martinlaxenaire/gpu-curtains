import { BindGroup, ComputePass, Geometry, GPUCurtains, OrbitControls, Mesh, Vec3 } from '../../dist/esm/index.mjs'

// inspired by https://barradeau.com/blog/?p=621
// and https://www.clicktorelease.com/code/polygon-shredder/
// TODO use bitangent noise? https://github.com/atyuwen/bitangent_noise/blob/main/BitangentNoise.hlsl#L41

const computeParticles = /* wgsl */ `
  // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39

  // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
  fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
  
  // set initial positions and data
  @compute @workgroup_size(256) fn setInitData(
    @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
  ) {
    let index = GlobalInvocationID.x;
    
    if(index < arrayLength(&particles.position)) {
      let nbParticles: f32 = f32(arrayLength(&particles.position));
      let fIndex: f32 = f32(index);
      let PI: f32 = 3.14159265359;
      
      // calculate a random particle max life
      // max life is in number of frames
      var maxLife: f32 = 250.0 + round( max(rand11(sin(cos(fIndex * PI / nbParticles) * PI)), 0.0) * 1500.0 );
      particlesStaticData[index].maxLife = maxLife;
      
      // now set a different initial life for each particle
      var initLife: f32 = round( maxLife * max(rand11(cos(fIndex * PI * 2.0 / nbParticles)), 0.0) );
      
      particles.position[index].w = initLife;
      particlesStaticData[index].position.w = initLife;
      
      // now the positions
      // calculate an initial random position along a sphere the size of our system
      var position: vec3f;
      position.x = rand11(cos(fIndex * PI / nbParticles)) * 2.0 - 1.0;
      position.y = rand11(sin(fIndex * PI / nbParticles)) * 2.0 - 1.0;
      position.z = rand11(cos(sin(fIndex * PI / nbParticles) * PI)) * 2.0 - 1.0;
      
      let posLength = length(position);
      if(posLength > 1.0) {
        position *= 1.0 / posLength;
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
  }
  
  
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
  
  // update particle positions
  @compute @workgroup_size(256) fn updatePos(
    @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
  ) {
    let index = GlobalInvocationID.x;
    
    if(index < arrayLength(&particles.position)) {
      var vPos: vec3f = particles.position[index].xyz;
      var life: f32 = particles.position[index].w;
      
      life += 1.0;
      
      let maxLife: f32 = particlesStaticData[index].maxLife;
      
      // reset particle
      life = select(life, 0.0, life >= maxLife);
      
      let lifeRatio = life / maxLife;
      var mixCurlOriginal = abs(lifeRatio * 2.0 - 1.0);
      mixCurlOriginal = 0.85 + pow(mixCurlOriginal, 0.25) * 0.15;
      
      let curlPos: vec3f = curl( vPos * params.frequency + params.time * 0.05 ) * params.amplitude;
      vPos = mix(particlesStaticData[index].position.xyz, vPos + curlPos, mixCurlOriginal);
  
      
      // Write back      
      particles.position[index] = vec4(vPos, life);
    }
  }
`

window.addEventListener('load', async () => {
  // number of particles instances
  const nbParticles = 1_000_000
  //const nbParticles = 500_000
  const systemSize = new Vec3(150)

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 0.1,
      far: systemSize.z * 50,
    },
  })

  gpuCurtains.onError(() => {
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  // The basic idea here is to place instanced points on a sphere surface
  // and then displace them with curl noise in a compute shader
  // since we are going to draw A LOT of particles
  // instead of computing their initial position on a sphere on the CPU
  // we are going to run a compute shader once instead!

  // first we're creating a bind group that is going to be used by both compute passes
  const particlesBindGroup = new BindGroup(gpuCurtains.renderer, {
    label: 'Particles bind group',
    uniforms: {
      params: {
        struct: {
          systemSize: {
            type: 'vec3f',
            value: systemSize,
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
        access: 'read_write',
        usage: ['vertex'], // we're going to use this buffer as a vertex buffer along default usages
        struct: {
          position: {
            type: 'array<vec4f>',
            value: new Float32Array(nbParticles * 4),
          },
        },
      },
      particlesStaticData: {
        access: 'read_write', // we want a readable AND writable buffer!
        struct: {
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
  })

  // now the compute pass that is going to place the points on a sphere
  const computeInitDataPass = new ComputePass(gpuCurtains, {
    label: 'Compute initial data',
    shaders: {
      compute: {
        code: computeParticles,
        entryPoint: 'setInitData',
      },
    },
    dispatchSize: Math.ceil(nbParticles / 256), //we divide the vertex count by the workgroup_size
    bindGroups: [particlesBindGroup],
    autoRender: false, // we don't want to run this pass each frame
  })

  // we should wait for pipeline compilation!
  await computeInitDataPass.material.compileMaterial()

  // now run the compute pass just once
  gpuCurtains.renderer.renderOnce([computeInitDataPass])

  // then the compute pass that is going to displace our particles
  const computePass = new ComputePass(gpuCurtains, {
    label: 'Compute particles positions',
    shaders: {
      compute: {
        code: computeParticles,
        entryPoint: 'updatePos',
      },
    },
    dispatchSize: Math.ceil(nbParticles / 256),
    bindGroups: [particlesBindGroup],
  })

  // we're done with our first compute pass, remove it
  computeInitDataPass.remove()

  computePass
    .onReady(() => console.log(computePass.material.getAddedShaderCode('compute')))
    .onRender(() => {
      computePass.uniforms.params.time.value += 0.1
    })

  // now the render part
  gpuCurtains.renderer.camera.position.z = systemSize.z * 3

  // orbit controls
  const orbitControls = new OrbitControls(gpuCurtains.renderer)
  orbitControls.zoomStep = systemSize.z * 0.002
  orbitControls.minZoom = systemSize.z * -1.5
  orbitControls.maxZoom = systemSize.z * 1.5

  const particlesVs = /* wgsl */ `  
    struct VSOutput {
      @builtin(position) position: vec4f,
    };

    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      var transformed: vec3f = attributes.instancePosition.xyz;
      vsOutput.position = getOutputPosition(transformed);
      
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

  // create a geometry from scratch that will use point-list topology
  // but this could also work with any geometry, topology, etc
  // as long as we pass an initial position attributes and the instanced vertex buffer attributes
  const particlesGeometry = new Geometry({
    instancesCount: nbParticles,
    // we will draw points
    topology: 'point-list',
    vertexBuffers: [
      {
        // set the default attributes position to an initial value of [0, 0, 0]
        name: 'attributes',
        attributes: [
          {
            name: 'position',
            type: 'vec3f',
            bufferFormat: 'float32x3',
            size: 3,
            array: new Float32Array([0, 0, 0]),
          },
        ],
      },
      {
        // use instancing
        stepMode: 'instance',
        name: 'instanceAttributes',
        // pass the compute buffer right away
        buffer: computePass.material.getBindingByName('particles')?.buffer,
        // since we passed a buffer, we do not need to specify arrays for the attributes
        attributes: [
          {
            name: 'instancePosition',
            type: 'vec4f',
            bufferFormat: 'float32x4',
            size: 4,
            //array: new Float32Array(nbParticles * 4),
          },
        ],
      },
    ],
  })

  const particles = new Mesh(gpuCurtains, {
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
    frustumCulling: false,
    targets: [
      {
        // additive blending with premultiplied alpha and a transparent background
        blend: {
          color: {
            srcFactor: 'one',
            dstFactor: 'one',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one',
          },
        },
      },
    ],
  })
})
