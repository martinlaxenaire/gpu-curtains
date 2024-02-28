import {
  GPUCameraRenderer,
  GPUDeviceManager,
  Object3D,
  SphereGeometry,
  PlaneGeometry,
  Mesh,
  RenderTarget,
  ShaderPass,
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
window.addEventListener('load', async () => {
  // number of particles instances
  const nbSmallStars = 20_000

  const outerRadius = 40
  const innerRadius = 20

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: 1,
      far: outerRadius * 5,
    },
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  const cameraPivot = new Object3D()
  camera.position.y = outerRadius
  camera.position.z = outerRadius * 2.25
  camera.parent = cameraPivot

  camera.lookAt(new Vec3())

  // render our scene manually
  const animate = () => {
    cameraPivot.rotation.y += 0.00325
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
        
        let distantStarRatio: f32 = pow(rand11(params.seed * asin(fIndex * PI / nbParticles)), 4.0);
        
        let arcPosition = vec3(
          params.outerRadius * cos(angle) * (1.0 + distantStarRatio),
          0.0,
          params.outerRadius * sin(angle) * (1.0 + distantStarRatio)
        );  
        
        position = normalizedPos * vec3(params.innerRadius) + arcPosition;
        
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
          outerRadius: {
            type: 'f32',
            value: outerRadius,
          },
          innerRadius: {
            type: 'f32',
            value: innerRadius,
          },
          seed: {
            type: 'f32',
            value: Math.random(),
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

  // this one will be used for bigger stars and planets
  const randomPosition = new Vec3()

  // ------------------------------------
  // DECLARE GEOMETRIES
  // ------------------------------------

  const sphereGeometry = new SphereGeometry()

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

  const sampleCount = 4

  // depth texture if needed
  const OITDepthTexture =
    sampleCount === 1
      ? new RenderTexture(gpuCameraRenderer, {
          label: 'OIT depth texture',
          name: 'oITDepthTexture',
          usage: 'depth',
          format: 'depth24plus',
          sampleCount,
        })
      : null

  const OITOpaqueTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Opaque MRT',
    sampleCount,
    //shouldUpdateView: false, // we don't want to render to the swap chain
    ...(OITDepthTexture && { depthTexture: OITDepthTexture }),
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
        targetFormat: 'r8unorm', // revealage
      },
    ],
    ...(OITDepthTexture && { depthTexture: OITDepthTexture }),
    depthLoadOp: 'load', // read from opaque depth!
  })

  // ------------------------------------
  // TRANSPARENT STARS
  // ------------------------------------

  // small stars first using instances + billboarding

  const transparentMeshParams = {
    depthWriteEnabled: false, // read from opaque depth but not write to depth
    outputTarget: OITTransparentTarget,
    frustumCulled: false,
    targets: [
      {
        //format: 'rgba16float', // this would be patched anyway if not set here
        blend: {
          // accum
          color: {
            srcFactor: 'one',
            dstFactor: 'one',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one',
          },
          // color: {
          //   srcFactor: 'one',
          //   dstFactor: 'src-alpha',
          // },
          // alpha: {
          //   srcFactor: 'one',
          //   dstFactor: 'one-minus-src-alpha',
          // },
        },
      },
      {
        //format: 'r8unorm', // this would be patched anyway if not set here
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
      var transformed: vec4f = vec4(attributes.position, 1.0) * camera.view + vec4(attributes.instancePosition.xyz, 1.0);      
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
      
      let distanceFromCenter: f32 = distance(fsInput.uv, vec2(0.5)) * 2.0;
      var gradient: f32 = clamp(1.0 - distanceFromCenter, 0.0, 1.0);
      gradient = pow(gradient, shading.glowIntensity);
      
      let lerpedColor: vec3f = lerpVec3(shading.color1, shading.color2, fsInput.colorLerp);
      let innerGlowColor: vec3f = mix(lerpedColor, vec3(1.0), pow(gradient, 4.0));
      
      let color: vec4f = vec4(innerGlowColor, gradient);
      
      // insert your favorite weighting function here. the color-based factor
      // avoids color pollution from the edges of wispy clouds. the z-based
      // factor gives precedence to nearer surfaces
      /*let weight: f32 =
        clamp(pow(min(1.0, color.a * 10.0) + 0.01, 3.0) * 1e8 * 
                         pow(1.0 - fsInput.position.z * 0.9, 3.0), 1e-2, 3e3);*/
                         
      let weight: f32 = 
        clamp(pow(min(1.0, color.a * 10.0) + 0.01, 3.0) * 1e8 * pow(1.0 - fsInput.position.z * 0.9, 3.0), 1e-2, 3e3);
      
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
  // const pinkStarColor = new Vec3(1, 0, 1)
  // const blueStarColor = new Vec3(0, 1, 1)

  const instancedSmallStars = new Mesh(gpuCameraRenderer, {
    label: 'Instanced small stars',
    geometry: smallStarsGeometry,
    //cullMode: 'none',
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

  // bigger stars with sphere geometries

  const sunHaloVs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) alpha: f32,
      @location(3) centerGlow: f32,
    };
  
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {    
      var vsOutput : VSOutput;
      
      // billboard
      var transformed: vec4f = vec4(attributes.position, 1.0) * camera.view;      
      vsOutput.position = getOutputPosition(transformed.xyz);
      //vsOutput.position = getOutputPosition(attributes.position);
      
      vsOutput.uv = attributes.uv;
      vsOutput.normal = attributes.normal;
      
      var mvPosition = matrices.modelView * vec4( transformed.xyz, 1.0 );
      var worldNormal = normalize((matrices.world * vec4(attributes.normal, 0.0)).xyz);
  
      var dotProduct: f32 = dot(worldNormal, normalize(mvPosition).xyz);
      vsOutput.alpha = smoothstep(0.25, 1.0, clamp(pow(dotProduct, shading.glowIntensity), 0.0, 1.0));
      vsOutput.centerGlow = smoothstep(0.95, 1.0, dotProduct);

      
      return vsOutput;
    }
  `

  const sunHaloFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) alpha: f32,
      @location(3) centerGlow: f32,
    };
    
    struct OITTargetOutput {
      @location(0) accum : vec4<f32>,
      @location(1) reveal : f32,
    };
    
    @fragment fn main(fsInput: VSOutput) -> OITTargetOutput {
      var output : OITTargetOutput;
      
      var color: vec4f = vec4(mix(shading.color, vec3(1.0), fsInput.centerGlow), fsInput.alpha);
      
      // insert your favorite weighting function here. the color-based factor
      // avoids color pollution from the edges of wispy clouds. the z-based
      // factor gives precedence to nearer surfaces
      /*let weight: f32 =
        clamp(pow(min(1.0, color.a * 10.0) + 0.01, 3.0) * 1e8 * 
                         pow(1.0 - fsInput.position.z * 0.9, 3.0), 1e-2, 3e3);*/
                         
      let weight: f32 = 
        clamp(pow(min(1.0, color.a * 10.0) + 0.01, 3.0) * 1e8 * pow(1.0 - fsInput.position.z * 0.9, 3.0), 1e-2, 3e3);
      
      // blend func: GL_ONE, GL_ONE
      // switch to pre-multiplied alpha and weight
      output.accum = vec4(color.rgb * color.a, color.a) * weight;
      
      // blend func: GL_ZERO, GL_ONE_MINUS_SRC_ALPHA
      output.reveal = color.a;
    
      return output;
    }
  `

  const sunColor = new Vec3(0.8, 0.6, 0.55)

  const sunHalo = new Mesh(gpuCameraRenderer, {
    label: 'Sun halo',
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
            value: sunColor,
          },
          glowIntensity: {
            type: 'f32',
            value: 2,
          },
        },
      },
    },
  })

  sunHalo.scale.set(innerRadius)

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
          },
        },
      },
    })

    randomPosition.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1)

    const angle = Math.random() * 2 * Math.PI

    randomPosition.normalize()
    randomPosition.x = randomPosition.x * innerRadius + Math.cos(angle) * outerRadius * 1.15
    randomPosition.z = randomPosition.z * innerRadius + Math.sin(angle) * outerRadius * 1.15

    bigStar.position.copy(randomPosition)

    bigStar.scale.set(innerRadius * 0.15 + Math.random() * innerRadius * 0.375)
  }

  // ------------------------------------
  // OPAQUE PLANETS
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
            value: new Vec3(1),
          },
        },
      },
    },
  })

  sun.scale.set(innerRadius * 0.2)

  const planetVs = /* wgsl */ `
   struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) fragPosition: vec3f,
   };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      vsOutput.uv = attributes.uv;
      // since the object scale has not changed this should work
      vsOutput.normal = normalize((matrices.world * vec4(attributes.normal, 0.0)).xyz);
      vsOutput.fragPosition = (matrices.world * vec4(attributes.position, 1.0)).xyz;
      
      return vsOutput;
    }
  `

  const planetFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) fragPosition: vec3f,
    };
  
    fn applyLightning(position: vec3f, normal: vec3f) -> vec3f {
      let L = shading.lightPosition - position;
      let distance = length(L);
      
      if (distance > shading.radius) {
        return vec3(0.0);
      }
      
      let lightDir: vec3f = normalize(L);
      let lightStrength: f32 = pow(1.0 - distance / shading.radius, 2.0);
      
      let lambert = max(dot(normal, lightDir), 0.0);
            
      return vec3(lambert * lightStrength * shading.lightColor);
    }
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {      
      var color: vec4f;
        
      let lambert: vec3f = applyLightning(fsInput.fragPosition, fsInput.normal);
      color = vec4((lambert + shading.ambientLightStrength) * shading.color, 1.0);
    
      return color;
    }
  `

  const lightPosition = new Vec3(0)
  const ambientLightStrength = 0.3

  for (let i = 0; i < 8; i++) {
    const planet = new Mesh(gpuCameraRenderer, {
      label: 'Opaque planet',
      geometry: sphereGeometry,
      outputTarget: OITOpaqueTarget,
      frustumCulled: false,
      shaders: {
        vertex: {
          code: planetVs,
        },
        fragment: {
          code: planetFs,
        },
      },
      uniforms: {
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              //value: i % 2 === 0 ? new Vec3(1, 0, 1) : new Vec3(0, 1, 1),
              value: new Vec3(0.9),
            },
            lightPosition: {
              type: 'vec3f',
              value: lightPosition,
            },
            lightColor: {
              type: 'vec3f',
              value: sunColor,
            },
            radius: {
              type: 'f32',
              value: outerRadius * 3,
            },
            ambientLightStrength: {
              type: 'f32',
              value: ambientLightStrength,
            },
          },
        },
      },
    })

    randomPosition.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1)

    const angle = Math.random() * 2 * Math.PI

    randomPosition.normalize()
    randomPosition.x = randomPosition.x * innerRadius + Math.cos(angle) * outerRadius * 1.15
    randomPosition.z = randomPosition.z * innerRadius + Math.sin(angle) * outerRadius * 1.15

    planet.position.copy(randomPosition)

    planet.scale.set(1.5 + Math.random() * 1.5)
  }

  // ------------------------------------
  // COMPOSITING PASS
  // ------------------------------------

  // opaque buffer
  const OITOpaqueTexture = new RenderTexture(gpuCameraRenderer, {
    label: 'OIT opaque texture',
    name: 'oITOpaqueTexture',
    format: OITOpaqueTarget.renderPass.options.colorAttachments[0].targetFormat,
    fromTexture: OITOpaqueTarget.renderPass.viewTextures[0],
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
      
      // fragment revealage
      let revealage = textureLoad(
        oITRevealTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      ).r;
  
      // save the blending and color texture fetch cost if there is not a transparent fragment
      if (isApproximatelyEqual(revealage, 1.0)) {
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
      return mix(vec4(opaqueColor.rgb, opaqueColor.a), vec4(averageColor, 1.0), 1.0 - revealage);
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
    // targets: [
    //   {
    //     // additive blending with premultiplied alpha and a transparent background
    //     blend: {
    //       color: {
    //         srcFactor: 'one',
    //         dstFactor: 'one',
    //       },
    //       alpha: {
    //         srcFactor: 'one',
    //         dstFactor: 'one',
    //       },
    //     },
    //   },
    // ],
  })
})
