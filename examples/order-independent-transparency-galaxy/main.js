import {
  GPUCameraRenderer,
  GPUDeviceManager,
  Object3D,
  SphereGeometry,
  PlaneGeometry,
  Mesh,
  RenderTarget,
  ShaderPass,
  Vec2,
  Vec3,
  RenderTexture,
  ComputePass,
} from '../../dist/esm/index.mjs'

// Weighted, blended order-independent transparency implementation
// from https://learnopengl.com/Guest-Articles/2020/OIT/Weighted-Blended
// and https://casual-effects.blogspot.com/2015/03/implemented-weighted-blended-order.html
//
// The concept is to render opaque and transparent objects into 2 different render targets
// and blend them in a final compositing pass.
// The transparent targets render to 2 textures (MRT), and 'accumulation' floating point texture and a 'reveal' R8 texture.
// We then use those 2 textures along with the opaque render target texture in order to compose the final output.
//
// There are a few other tricks used in this example, including:
// - instanced (initial position comes from a compute shader) billboard quads for the small stars
// - "glowing" billboard spheres (see: https://stemkoski.github.io/Three.js/Shader-Glow.html)
//
// ref images:
// https://i.natgeofe.com/n/e484088d-3334-4ab6-9b75-623f7b8505c9/1086_4x3.jpg
// https://cdn.futura-sciences.com/cdn-cgi/image/width=1920,quality=60,format=auto/sources/images/glossaire/galaxie-andromede_03.jpg
window.addEventListener('load', async () => {
  // generate a random seed
  const seed = Math.random()

  // number of particles instances
  const nbSmallStars = 40_000

  // circle radius
  const baseRadius = 40
  // how much distance between a point on the circle and a possible star position
  const halfGalaxySize = 20 + seed * 5
  // size of the hole in the middle where we'll put our "sun" or main star
  const centerHoleSize = baseRadius - halfGalaxySize

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // set the sample count here
  const sampleCount = 1

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 1,
      far: baseRadius * 5,
    },
    renderPass: {
      sampleCount,
    },
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  const scenePivot = new Object3D()

  scenePivot.quaternion.setAxisOrder('ZXY')
  scenePivot.rotation.z = (seed * Math.PI) / 12 + Math.PI / 24

  const cameraPosition = new Vec3(0, baseRadius * 1.25, baseRadius * 2.5)
  camera.position.copy(cameraPosition)

  const lookAt = new Vec3(0)
  camera.lookAt(lookAt)

  // lerp camera Y position based on mouse/touch move
  const lerpCameraPosition = camera.position.clone()

  const onPointerMove = (e) => {
    const { clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e
    const { height } = gpuCameraRenderer.boundingRect

    lerpCameraPosition.set(
      cameraPosition.x,
      cameraPosition.y - baseRadius * 0.875 * (0.5 + (clientY - height * 0.5) / height),
      cameraPosition.z
    )
  }

  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove)

  // render our scene manually
  const animate = () => {
    scenePivot.rotation.y -= 0.0025

    camera.position.lerp(lerpCameraPosition, 0.05)
    camera.lookAt(lookAt)

    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  // ------------------------------------
  // COMPUTE STARS POSITIONS
  // ------------------------------------

  const computeStarsInstances = /* wgsl */ `
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
  
    // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
    fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
    
    // set initial positions and data
    @compute @workgroup_size(64) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
    ) {
      let index = GlobalInvocationID.x;
      
      if(index < arrayLength(&particles.position)) {
        let fIndex: f32 = f32(index);
        let nbParticles: f32 = f32(arrayLength(&particles.position));
        let PI: f32 = 3.14159265359;
        
        // now the positions
        // calculate an initial random position along a sphere the size of our system
        var position: vec3f;
        position.x = rand11(params.seed * cos(fIndex * PI / nbParticles)) * 2.0 - 1.0;
        position.y = rand11(params.seed * sin(fIndex * PI / nbParticles)) * 0.125 - 0.0625;
        position.z = rand11(params.seed * atan(fIndex * PI / nbParticles)) * 2.0 - 1.0;
        
        let normalizedPos = normalize(position);
        
        let angle: f32 = (rand11(params.seed * acos(fIndex * PI / nbParticles)) * 2.0) * PI;
        //let angle: f32 = 0.0;
        
        let distantStarRatio: f32 = pow(rand11(params.seed * asin(fIndex * PI / nbParticles)), 4.0);
        
        let arcPosition = vec3(
          params.baseRadius * cos(angle) * (1.0 + distantStarRatio),
          0.0,
          params.baseRadius * sin(angle) * (1.0 + distantStarRatio)
        );
        
        position = normalizedPos * vec3(params.halfGalaxySize) + arcPosition;
        
        // write positions
        particles.position[index].x = position.x;
        particles.position[index].y = position.y;
        particles.position[index].z = position.z;
        
        // color alpha lerp
        particles.position[index].w = rand11(params.seed * tan(fIndex * PI / nbParticles));
      }
    }
  `

  // now the compute pass that is going to place the points on a sphere
  const computeInitDataPass = new ComputePass(gpuCameraRenderer, {
    label: 'Compute initial stars position',
    autoRender: false, // we don't want to run this pass each frame
    shaders: {
      compute: {
        code: computeStarsInstances,
      },
    },
    dispatchSize: Math.ceil(nbSmallStars / 64), //we divide the vertex count by the workgroup_size
    uniforms: {
      params: {
        struct: {
          baseRadius: {
            type: 'f32',
            value: baseRadius,
          },
          halfGalaxySize: {
            type: 'f32',
            value: halfGalaxySize,
          },
          seed: {
            type: 'f32',
            value: seed,
          },
        },
      },
    },
    storages: {
      particles: {
        access: 'read_write',
        struct: {
          position: {
            type: 'array<vec4f>',
            value: new Float32Array(nbSmallStars * 4),
          },
        },
      },
    },
  })

  // we should wait for pipeline compilation!
  await computeInitDataPass.material.compileMaterial()

  // now run the compute pass just once
  gpuCameraRenderer.renderOnce([computeInitDataPass])

  const particleBuffer = computeInitDataPass.material.getBindingByName('particles')

  // this one will be used for bigger stars clusters and planets
  const randomPosition = new Vec3()

  // ------------------------------------
  // DECLARE GEOMETRIES
  // ------------------------------------

  const sphereGeometry = new SphereGeometry()
  const planeGeometry = new PlaneGeometry()

  // pass the instanced vertex buffer attributes
  const smallStarsGeometry = new PlaneGeometry({
    instancesCount: nbSmallStars, // instancing
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
            array: new Float32Array(nbSmallStars * 4),
          },
        ],
      },
    ],
  })

  // ------------------------------------
  // OPAQUE & TRANSPARENT TARGETS
  // ------------------------------------

  const OITOpaqueTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Opaque MRT',
    sampleCount,
  })

  const OITTransparentTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Transparent MRT',
    sampleCount,
    shouldUpdateView: false, // we don't want to render to the swap chain
    colorAttachments: [
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'rgba16float', // accum
      },
      {
        loadOp: 'clear',
        clearValue: [1, 0, 0, 1],
        targetFormat: 'r8unorm', // reveal
      },
    ],
    depthLoadOp: 'load', // we need to read from opaque depth!
  })

  // select your favorite weighting function here.
  // the color-based factor avoids color pollution from the edges of wispy clouds.
  // the z-based factor gives precedence to nearer surfaces
  const accumWeight = `let weight: f32 = clamp(pow(min(1.0, color.a * 10.0) + 0.01, 3.0) * 1e8 * pow(1.0 - fsInput.position.z * 0.9, 3.0), 1e-2, 3e3);`
  //const accumWeight = `let weight: f32 = max(min(1.0, max(max(color.r, color.g), color.b) * color.a), color.a) * clamp(0.03 / (1e-5 + pow(fsInput.position.z / 200, 4.0)), 1e-2, 3e3);`

  // ------------------------------------
  // TRANSPARENT STARS
  // ------------------------------------

  // small stars first using instances + billboarding

  const transparentMeshParams = {
    depthWriteEnabled: false, // we'll read from opaque depth but we won't write to it!
    outputTarget: OITTransparentTarget,
    frustumCulled: false,
    // targets format are not specified
    // because they're internally patched using the outputTarget colorAttachments
    targets: [
      {
        // accum
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
      {
        // reveal
        blend: {
          color: {
            srcFactor: 'zero',
            dstFactor: 'one-minus-src',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one',
          },
        },
      },
    ],
  }

  const instancedSmallStarsVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) colorLerp: f32,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      // billboard
      var transformed: vec4f = 
        vec4(attributes.position, 1.0) * matrices.modelView
        + vec4(attributes.instancePosition.xyz, 1.0);
      
      vsOutput.position = getOutputPosition(transformed.xyz);
      
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      
      vsOutput.colorLerp = attributes.instancePosition.w;
      
      return vsOutput;
    }
  `

  const instancedSmallStarsFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) colorLerp: f32,
    };
    
    struct OITTargetOutput {
      @location(0) accum : vec4<f32>,
      @location(1) reveal : f32,
    };
    
    fn lerpVec3(v1: vec3f, v2: vec3f, alpha: f32) -> vec3f {
      return vec3(
        v1.x + (v2.x - v1.x) * alpha,
        v1.y + (v2.y - v1.y) * alpha,
        v1.z + (v2.z - v1.z) * alpha
      );
    }
    
    @fragment fn main(fsInput: VSOutput) -> OITTargetOutput {
      var output : OITTargetOutput;
      
      // radial gradient from center
      let distanceFromCenter: f32 = distance(fsInput.uv, vec2(0.5)) * 2.0;
      var radialGradient: f32 = clamp(1.0 - distanceFromCenter, 0.0, 1.0);
      radialGradient = pow(radialGradient, shading.glowIntensity);
      
      
      let remappedUv: vec2f = fsInput.uv * 2.0 - 1.0;
      
      // horizontal line
      var horizontalGradient: f32 = smoothstep(0.9, 1.0, 1.0 - distance(remappedUv, vec2(remappedUv.x, 0.0)));
      horizontalGradient *= 1.0 - distance(vec2(0.0), remappedUv);
  
      var verticalGradient: f32 = smoothstep(0.9, 1.0, 1.0 - distance(remappedUv, vec2(0.0, remappedUv.y)));
      verticalGradient *= 1.0 - distance(vec2(0.0), remappedUv);
      
      let isShiningStar: bool = fsInput.colorLerp >= 0.4875 && fsInput.colorLerp <= 0.5125;
      
      var gradient: f32 = select(
        radialGradient,
        radialGradient + horizontalGradient + verticalGradient,
        isShiningStar
      );
      
      gradient = clamp(gradient, 0.0, 1.0);
      
      if(gradient < 0.05) {
        discard;
      }
      
      let lerpedColor: vec3f = select(
        lerpVec3(shading.color1, shading.color2, fsInput.colorLerp),
        vec3(1.0),
        isShiningStar
      );
      
      let innerGlowColor: vec3f = mix(lerpedColor, vec3(1.0), pow(radialGradient, 4.0));      
      
      let color: vec4f = vec4(innerGlowColor, gradient);
      
      // use our weight function
      ${accumWeight}
      
      // blend func: GL_ONE, GL_ONE
      // switch to pre-multiplied alpha and weight
      output.accum = vec4(color.rgb * color.a, color.a) * weight;
      
      // blend func: GL_ZERO, GL_ONE_MINUS_SRC_ALPHA
      output.reveal = color.a;
    
      return output;
    }
  `

  const pinkStarColor = new Vec3(0.85, 0.4, 0.75)
  const blueStarColor = new Vec3(0.4, 0.6, 0.95)

  const instancedSmallStars = new Mesh(gpuCameraRenderer, {
    label: 'Instanced small stars',
    geometry: smallStarsGeometry,
    ...transparentMeshParams,
    shaders: {
      vertex: {
        code: instancedSmallStarsVs,
      },
      fragment: {
        code: instancedSmallStarsFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color1: {
            type: 'vec3f',
            value: pinkStarColor,
          },
          color2: {
            type: 'vec3f',
            value: blueStarColor,
          },
          glowIntensity: {
            type: 'f32',
            value: 2,
          },
        },
      },
    },
  })

  instancedSmallStars.onReady(() => {
    const instanceVertexBuffer = instancedSmallStars.geometry.getVertexBufferByName('instanceAttributes')
    instanceVertexBuffer.buffer = particleBuffer?.buffer
  })

  instancedSmallStars.parent = scenePivot

  // bigger stars with sphere geometries

  const sunHaloVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) alpha: f32,
      @location(2) centerGlow: f32,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      vsOutput.position = getOutputPosition(attributes.position);
      
      //var mvPosition = camera.view * vec4( transformed.xyz, 1.0 );
      //var mvPosition = camera.view * matrices.model * vec4( attributes.position, 1.0 );
      var mvPosition = matrices.modelView * vec4( attributes.position, 1.0 );
      var mvNormal = (matrices.modelView * vec4(attributes.normal, 0.0)).xyz;
      
      vsOutput.uv = attributes.uv;
  
      var dotProduct: f32 = dot(normalize(mvNormal), normalize(mvPosition).xyz);
      
      let alpha = clamp(pow(dotProduct, shading.glowIntensity), 0.0, 1.0);
      vsOutput.alpha = smoothstep(0.125, 1.0, alpha);
      vsOutput.centerGlow = smoothstep(0.925, 1.0, alpha);
      
      return vsOutput;
    }
  `

  const sunHaloFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) alpha: f32,
      @location(2) centerGlow: f32,
    };
    
    struct OITTargetOutput {
      @location(0) accum : vec4<f32>,
      @location(1) reveal : f32,
    };
    
    @fragment fn main(fsInput: VSOutput) -> OITTargetOutput {
      var output : OITTargetOutput;
      
      var color: vec4f = vec4(mix(shading.color, vec3(1.0), fsInput.centerGlow), fsInput.alpha * shading.alpha);
      
      if(color.a < 0.05) {
        discard;
      }
      
      // use our weight function
      ${accumWeight}
      
      // blend func: GL_ONE, GL_ONE
      // switch to pre-multiplied alpha and weight
      output.accum = vec4(color.rgb * color.a, color.a) * weight;
      
      // blend func: GL_ZERO, GL_ONE_MINUS_SRC_ALPHA
      output.reveal = color.a;
    
      return output;
    }
  `

  const yellowSunColor = new Vec3(0.75, 0.65, 0.55)
  const redSunColor = new Vec3(0.9, 0.5, 0.45)
  const sunColor = yellowSunColor.lerp(redSunColor, seed)
  const saturatedSunColor = sunColor.clone().multiplyScalar(1.5)

  const sunHalo = new Mesh(gpuCameraRenderer, {
    label: 'Sun halo',
    geometry: sphereGeometry,
    ...transparentMeshParams,
    cullMode: 'none',
    shaders: {
      vertex: {
        code: sunHaloVs,
      },
      fragment: {
        code: sunHaloFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: sunColor,
          },
          glowIntensity: {
            type: 'f32',
            value: 2,
          },
          alpha: {
            type: 'f32',
            value: 1,
          },
        },
      },
    },
  })

  sunHalo.scale.set(centerHoleSize * 1.25)
  sunHalo.parent = scenePivot

  // now a few big transparent stars
  for (let i = 0; i < 25; i++) {
    const bigStar = new Mesh(gpuCameraRenderer, {
      label: 'Big stars ' + i,
      geometry: sphereGeometry,
      ...transparentMeshParams,
      cullMode: 'front',
      shaders: {
        vertex: {
          code: sunHaloVs,
        },
        fragment: {
          code: sunHaloFs,
        },
      },
      uniforms: {
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: pinkStarColor.clone().lerp(blueStarColor, Math.random()),
            },
            glowIntensity: {
              type: 'f32',
              value: 3.5 + Math.random() * 5,
            },
            alpha: {
              type: 'f32',
              value: Math.random() * 0.2 + 0.8,
            },
          },
        },
      },
    })

    randomPosition.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1)

    const angle = Math.random() * 2 * Math.PI

    randomPosition.normalize()
    randomPosition.x = randomPosition.x * centerHoleSize + Math.cos(angle) * baseRadius * 1.15
    randomPosition.z = randomPosition.z * centerHoleSize + Math.sin(angle) * baseRadius * 1.15

    bigStar.position.copy(randomPosition)

    bigStar.scale.set(centerHoleSize * 0.25 + Math.random() * centerHoleSize * 0.375)

    bigStar.parent = scenePivot
  }

  // now we'll add two colored dust swirls

  const swirlCloudsFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    struct OITTargetOutput {
      @location(0) accum : vec4<f32>,
      @location(1) reveal : f32,
    };
    
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39#perlin-noise
    // MIT License. © Stefan Gustavson, Munrocket
    //
    // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
    fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
    
    fn permute4(x: vec4f) -> vec4f { return ((x * 34. + 1.) * x) % vec4f(289.); }
    fn fade2(t: vec2f) -> vec2f { return t * t * t * (t * (t * 6. - 15.) + 10.); }
    
    fn perlinNoise2(P: vec2f) -> f32 {
      var Pi: vec4f = floor(P.xyxy) + vec4f(0., 0., 1., 1.);
      let Pf = fract(P.xyxy) - vec4f(0., 0., 1., 1.);
      Pi = Pi % vec4f(289.); // To avoid truncation effects in permutation
      let ix = Pi.xzxz;
      let iy = Pi.yyww;
      let fx = Pf.xzxz;
      let fy = Pf.yyww;
      let i = permute4(permute4(ix) + iy);
      var gx: vec4f = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
      let gy = abs(gx) - 0.5;
      let tx = floor(gx + 0.5);
      gx = gx - tx;
      var g00: vec2f = vec2f(gx.x, gy.x);
      var g10: vec2f = vec2f(gx.y, gy.y);
      var g01: vec2f = vec2f(gx.z, gy.z);
      var g11: vec2f = vec2f(gx.w, gy.w);
      let norm = 1.79284291400159 - 0.85373472095314 *
          vec4f(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
      g00 = g00 * norm.x;
      g01 = g01 * norm.y;
      g10 = g10 * norm.z;
      g11 = g11 * norm.w;
      let n00 = dot(g00, vec2f(fx.x, fy.x));
      let n10 = dot(g10, vec2f(fx.y, fy.y));
      let n01 = dot(g01, vec2f(fx.z, fy.z));
      let n11 = dot(g11, vec2f(fx.w, fy.w));
      let fade_xy = fade2(Pf.xy);
      let n_x = mix(vec2f(n00, n01), vec2f(n10, n11), vec2f(fade_xy.x));
      let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
      return 2.3 * n_xy;
    }
    
    fn rotate(coords: vec2f, angle: f32) -> vec2f {
      return vec2(
        coords.x * cos(angle) + coords.y * sin(angle),
        coords.x * sin(angle) - coords.y * cos(angle),
      );
    }
    
    @fragment fn main(fsInput: VSOutput) -> OITTargetOutput {
      var output : OITTargetOutput;
      
      let distanceFromCenter: f32 = clamp(distance(fsInput.uv, vec2(0.5)) * 2.0, 0.0, 1.0);
    
      let centerHole: f32 = smoothstep( shading.centerHoleSize * 0.625, shading.centerHoleSize * 1.25, distanceFromCenter );
      let edgeFade: f32 = smoothstep( 0.0, shading.centerHoleSize * 0.5, 1.0 - distanceFromCenter );
      
      var alpha: f32 = centerHole * edgeFade;
      
      let pNoise: f32 = perlinNoise2( 
        rotate(
          (fsInput.uv + noise.offset) * noise.scale,
          distanceFromCenter * 3.141592 * 0.75
        )
      );
      
      alpha *= smoothstep( 0.0, 0.875, pNoise * (1.0 - noise.minIntensity) + noise.minIntensity );
      alpha = pow( alpha, 0.75 );
      
      if(alpha < 0.05) {
        discard;
      }
      
      var color: vec4f = vec4(shading.color, alpha);
      
      // use our weight function
      ${accumWeight}
      
      // blend func: GL_ONE, GL_ONE
      // switch to pre-multiplied alpha and weight
      output.accum = vec4(color.rgb * color.a, color.a) * weight;
      
      // blend func: GL_ZERO, GL_ONE_MINUS_SRC_ALPHA
      output.reveal = color.a;
    
      return output;
    }
  `

  // a small one with the sun color
  const smallScale = halfGalaxySize * 0.5 + baseRadius

  // finally a spiraling galactic dust plane
  const smallSwirlPlane = new Mesh(gpuCameraRenderer, {
    label: 'Small swirl plane',
    geometry: planeGeometry,
    ...transparentMeshParams,
    shaders: {
      fragment: {
        code: swirlCloudsFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: saturatedSunColor,
          },
          centerHoleSize: {
            type: 'f32',
            value: centerHoleSize / smallScale,
          },
        },
      },
      noise: {
        struct: {
          offset: {
            type: 'vec2f',
            value: new Vec2(seed * 0.25 + 0.25),
          },
          scale: {
            type: 'vec2f',
            value: new Vec2(2),
          },
          minIntensity: {
            type: 'f32',
            value: Math.random() * 0.15 + 0.15,
          },
        },
      },
    },
  })

  smallSwirlPlane.scale.set(smallScale, smallScale, 1)
  smallSwirlPlane.rotation.x = -Math.PI / 2

  smallSwirlPlane.parent = scenePivot

  // a bigger blue one
  const bigScale = halfGalaxySize + baseRadius * 1.75

  const bigSwirlPlane = new Mesh(gpuCameraRenderer, {
    label: 'Big swirl plane',
    geometry: planeGeometry,
    ...transparentMeshParams,
    shaders: {
      fragment: {
        code: swirlCloudsFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: blueStarColor,
          },
          centerHoleSize: {
            type: 'f32',
            value: smallScale / bigScale,
          },
        },
      },
      noise: {
        struct: {
          offset: {
            type: 'vec2f',
            value: new Vec2(seed * 0.5),
          },
          scale: {
            type: 'vec2f',
            value: new Vec2(3),
          },
          minIntensity: {
            type: 'f32',
            value: Math.random() * 0.25 + 0.25,
          },
        },
      },
    },
  })

  bigSwirlPlane.scale.set(bigScale, bigScale, 1)
  bigSwirlPlane.rotation.x = -Math.PI / 2

  bigSwirlPlane.parent = scenePivot

  // ------------------------------------
  // OPAQUE SUN & OPTIONAL PLANETS
  // ------------------------------------

  const sunFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {    
      return vec4(shading.color, 1.0);
    }
  `

  const sun = new Mesh(gpuCameraRenderer, {
    label: 'Sun',
    geometry: sphereGeometry,
    outputTarget: OITOpaqueTarget,
    frustumCulled: false,
    shaders: {
      fragment: {
        code: sunFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(0.95),
          },
        },
      },
    },
  })

  sun.scale.set(centerHoleSize * 0.175)

  sun.parent = scenePivot

  // we could add a bunch of planets but I like it better without :)

  // const planetVs = /* wgsl */ `
  //  struct VertexOutput {
  //     @builtin(position) position: vec4f,
  //     @location(0) uv: vec2f,
  //     @location(1) normal: vec3f,
  //     @location(2) fragPosition: vec3f,
  //  };
  //
  //   @vertex fn main(
  //     attributes: Attributes,
  //   ) -> VertexOutput {
  //     var vsOutput: VertexOutput;
  //
  //     vsOutput.position = getOutputPosition(attributes.position);
  //     vsOutput.uv = attributes.uv;
  //     // since the object scale has not changed this should work
  //     vsOutput.normal = normalize((matrices.world * vec4(attributes.normal, 0.0)).xyz);
  //     vsOutput.fragPosition = (matrices.world * vec4(attributes.position, 1.0)).xyz;
  //
  //     return vsOutput;
  //   }
  // `
  //
  // const planetFs = /* wgsl */ `
  //   struct VSOutput {
  //     @builtin(position) position: vec4f,
  //     @location(0) uv: vec2f,
  //     @location(1) normal: vec3f,
  //     @location(2) fragPosition: vec3f,
  //   };
  //
  //   fn applyLightning(position: vec3f, normal: vec3f) -> vec3f {
  //     let L = shading.lightPosition - position;
  //     let distance = length(L);
  //
  //     if (distance > shading.radius) {
  //       return vec3(0.0);
  //     }
  //
  //     let lightDir: vec3f = normalize(L);
  //     let lightStrength: f32 = pow(1.0 - distance / shading.radius, 2.0);
  //
  //     let lambert = max(dot(normal, lightDir), 0.0);
  //
  //     return vec3(lambert * lightStrength * shading.lightColor);
  //   }
  //
  //   @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  //     var color: vec4f;
  //
  //     let lambert: vec3f = applyLightning(fsInput.fragPosition, fsInput.normal);
  //     color = vec4((lambert + shading.ambientLightStrength) * shading.color, 1.0);
  //
  //     return color;
  //   }
  // `
  //
  // const lightPosition = new Vec3(0)
  // const ambientLightStrength = 0.5
  //
  // for (let i = 0; i < 8; i++) {
  //   const planet = new Mesh(gpuCameraRenderer, {
  //     label: 'Opaque planet',
  //     geometry: sphereGeometry,
  //     outputTarget: OITOpaqueTarget,
  //     frustumCulled: false,
  //     shaders: {
  //       vertex: {
  //         code: planetVs,
  //       },
  //       fragment: {
  //         code: planetFs,
  //       },
  //     },
  //     uniforms: {
  //       shading: {
  //         struct: {
  //           color: {
  //             type: 'vec3f',
  //             //value: i % 2 === 0 ? new Vec3(1, 0, 1) : new Vec3(0, 1, 1),
  //             value: new Vec3(0.9),
  //           },
  //           lightPosition: {
  //             type: 'vec3f',
  //             value: lightPosition,
  //           },
  //           lightColor: {
  //             type: 'vec3f',
  //             value: sunColor,
  //           },
  //           radius: {
  //             type: 'f32',
  //             value: baseRadius * 3,
  //           },
  //           ambientLightStrength: {
  //             type: 'f32',
  //             value: ambientLightStrength,
  //           },
  //         },
  //       },
  //     },
  //   })
  //
  //   randomPosition.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1)
  //
  //   const angle = Math.random() * 2 * Math.PI
  //
  //   randomPosition.normalize()
  //   randomPosition.x = randomPosition.x * halfGalaxySize + Math.cos(angle) * baseRadius * 1.15
  //   randomPosition.z = randomPosition.z * halfGalaxySize + Math.sin(angle) * baseRadius * 1.15
  //
  //   planet.position.copy(randomPosition)
  //
  //   planet.scale.set(1.5 + Math.random() * 1.5)
  //
  //   planet.parent = scenePivot
  // }

  // ------------------------------------
  // COMPOSITING PASS
  // ------------------------------------

  // opaque buffer
  const OITOpaqueTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'OIT opaque texture',
    name: 'oITOpaqueTexture',
    format: OITOpaqueTarget.renderPass.options.colorAttachments[0].targetFormat,
    fromTexture: sampleCount === 1 ? OITOpaqueTarget.renderTexture : OITOpaqueTarget.renderPass.viewTextures[0],
    sampleCount,
  })

  // create 2 textures based on our OIT MRT output
  const OITAccumTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'OIT accum texture',
    name: 'oITAccumTexture',
    format: OITTransparentTarget.renderPass.options.colorAttachments[0].targetFormat,
    fromTexture: OITTransparentTarget.renderPass.viewTextures[0],
    sampleCount,
  })

  const OITRevealTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'OIT reveal texture',
    name: 'oITRevealTexture',
    format: OITTransparentTarget.renderPass.options.colorAttachments[1].targetFormat,
    fromTexture: OITTransparentTarget.renderPass.viewTextures[1],
    sampleCount,
  })

  const compositingPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    // epsilon number
    const EPSILON: f32 = 0.00001;
    
    // calculate floating point numbers equality accurately
    fn isApproximatelyEqual(a: f32, b: f32) -> bool {
      return abs(a - b) <= select(abs(a), abs(b), abs(a) < abs(b)) * EPSILON;
    }
    
    // get the max value between three values
    fn max3(v: vec3f) -> f32 {
      return max(max(v.x, v.y), v.z);
    }
    
    fn isInf(value: f32) -> bool {
      return abs(value) >= 65504.0;
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {  
      let opaqueColor = textureLoad(
        oITOpaqueTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      );   
      
      // fragment reveal
      let reveal = textureLoad(
        oITRevealTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      ).r;
  
      // save the blending and color texture fetch cost if there is not a transparent fragment
      if (isApproximatelyEqual(reveal, 1.0)) {
        return opaqueColor;
      }
          
      // fragment color
      var accumulation = textureLoad(
        oITAccumTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      );
  
      // suppress overflow
      if (isInf(max3(abs(accumulation.rgb)))) {
        accumulation = vec4(accumulation.a);
      }
  
      // prevent floating point precision bug
      var averageColor = accumulation.rgb / max(accumulation.a, EPSILON);
  
      // alpha blending between opaque and transparent
      return mix(opaqueColor, vec4(averageColor, 1.0), 1.0 - reveal);
    }
  `

  const compositingPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Compositing pass',
    renderTextures: [OITOpaqueTexture, OITAccumTexture, OITRevealTexture],
    shaders: {
      fragment: {
        code: compositingPassFs,
      },
    },
  })
})
