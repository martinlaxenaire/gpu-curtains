import {
  GPUDeviceManager,
  GPUCameraRenderer,
  OrbitControls,
  AmbientLight,
  PointLight,
  getLambert,
  Object3D,
  BoxGeometry,
  Sampler,
  Mesh,
  ComputePass,
  ShaderPass,
  RenderTarget,
  Vec2,
  Vec3,
  Mat4,
  Texture,
} from '../../dist/esm/index.mjs'

// Screen Space Ambient Occlusion
//
// Similarly to the deferred rendering examples, it's using a geometry buffers
// Where the meshes are rendered into multiple textures for normals (floating point texture), albedo and depth
// We then have 3 more passes:
// - an occlusion pass, where the actual occlusion is calculated
// - a blur pass where the occlusion result is blurred to attenuate possible artifacts from previous pass
// - a lightning pass where the blurred occlusion is applied to the ambient light + other lightnings applied
//
// see:
// https://learnopengl.com/Advanced-Lighting/SSAO
// https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/SSAOShader.js
window.addEventListener('load', async () => {
  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    onError: () => {
      document.body.classList.add('no-curtains')
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  const systemSize = new Vec3(200, 200, 200)
  const nbLights = 25

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      fov: 65,
      near: systemSize.z * 0.25,
      far: systemSize.z * 8,
    },
    lights: {
      maxPointLights: nbLights,
    },
  })

  // get the camera
  const { scene, camera } = gpuCameraRenderer

  const objectsPivot = new Object3D()
  objectsPivot.parent = scene

  camera.position.z = systemSize.z * 3

  const orbitControls = new OrbitControls({
    camera,
    element: gpuCameraRenderer.domElement.element,
    enablePan: false,
    zoomSpeed: systemSize.z / 10,
    minZoom: systemSize.z * 1.5,
    maxZoom: systemSize.z * 5,
  })

  gpuDeviceManager.onBeforeRender(() => {
    // rotate our camera pivot
    objectsPivot.rotation.y -= 0.005
  })

  // ------------------------------------
  // GEOMETRY BUFFER
  // ------------------------------------

  // get sample count from url search params or default to 1
  // beware that MSAA + deferred rendering can be quite expensive!
  const url = new URL(window.location)
  const searchParams = new URLSearchParams(url.search)
  const urlSampleCount = searchParams.get('sampleCount') && parseInt(searchParams.get('sampleCount'))
  const sampleCount = urlSampleCount && urlSampleCount === 4 ? urlSampleCount : 1

  const gBufferDepthTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer depth texture',
    name: 'gBufferDepthTexture',
    type: 'depth',
    format: 'depth24plus',
    sampleCount,
  })

  const writeGBufferRenderTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Geometry buffer render target',
    sampleCount,
    renderToSwapChain: false, // we don't want to render to the swap chain
    depthTexture: gBufferDepthTexture,
    colorAttachments: [
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'bgra8unorm-srgb', // albedo
      },
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: 'rgba16float', // normals
      },
      // {
      //   loadOp: 'clear',
      //   clearValue: [0, 0, 0, 0],
      //   targetFormat: 'rgba16float', // position
      // },
    ],
  })

  const writeGBufferVs = /*wgsl */ `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      //@location(1) fragPosition: vec4f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VertexOutput {
      var vsOutput: VertexOutput;
    
      vsOutput.position = getOutputPosition(attributes.position);
      //vsOutput.fragPosition = matrices.modelView * vec4(attributes.position, 1.0);
      
      // use view space normal when dealing using a geometry buffer
      vsOutput.normal = getViewNormal(attributes.normal);
      
      return vsOutput;
    }
  `

  const writeGBufferFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) normal: vec3f,
      //@location(1) fragPosition: vec4f,
    };
    
    struct GBufferOutput {
      @location(0) albedo : vec4<f32>,
      @location(1) normal : vec4<f32>,
      //@location(2) position: vec4<f32>,
    };
    
    @fragment fn main(fsInput: VSOutput) -> GBufferOutput {      
      var output : GBufferOutput;
      
      output.normal = vec4(normalize(fsInput.normal), 1.0);
      output.albedo = vec4(shading.color, 1.0);
      //output.position = vec4(fsInput.fragPosition.xyz, 1.0);
    
      return output;
    }
  `

  // now add objects to our scene
  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)
  const grey = new Vec3(0.7)

  const cubeGeometry = new BoxGeometry()
  const nbCubes = 100

  for (let i = 0; i < nbCubes; i++) {
    const randomColor = Math.random()
    const color = randomColor < 0.33 ? blue : randomColor < 0.66 ? pink : grey

    const cubeMesh = new Mesh(gpuCameraRenderer, {
      label: 'Cube ' + i,
      geometry: cubeGeometry,
      outputTarget: writeGBufferRenderTarget,
      // we could manually specify the targets
      // but it will be patched internally anyway!
      // targets: [
      //   {
      //     format: 'bgra8unorm', // albedo
      //   },
      //   {
      //     format: 'rgba16float', // normals
      //   },
      //   // {
      //   //   format: 'rgba16float', // position
      //   // }
      // ],
      shaders: {
        vertex: {
          code: writeGBufferVs,
        },
        fragment: {
          code: writeGBufferFs,
        },
      },
      uniforms: {
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: color,
            },
          },
        },
      },
    })

    cubeMesh.position.x = Math.random() * systemSize.x * 2 - systemSize.x
    cubeMesh.position.y = Math.random() * systemSize.y * 2 - systemSize.y
    cubeMesh.position.z = Math.random() * systemSize.z * 2 - systemSize.z
    cubeMesh.rotation.x = Math.random()
    cubeMesh.rotation.y = Math.random()
    cubeMesh.rotation.z = Math.random()

    cubeMesh.scale.set(Math.random() * 50 + 10)

    cubeMesh.parent = objectsPivot
  }

  // ------------------------------------
  // CREATE A 4x4 3D NOISE TEXTURE WITH A COMPUTE SHADER
  // ------------------------------------

  const compute3DNoiseShader = /* wgsl */ `
    // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39#perlin-noise
    // MIT License. © Stefan Gustavson, Munrocket
    //
    // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
    fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
    
    // MIT License. © Stefan Gustavson, Munrocket
    //
    fn permute4(x: vec4f) -> vec4f { return ((x * 34. + 1.) * x) % vec4f(289.); }
    fn taylorInvSqrt4(r: vec4f) -> vec4f { return 1.79284291400159 - 0.85373472095314 * r; }
    fn fade3(t: vec3f) -> vec3f { return t * t * t * (t * (t * 6. - 15.) + 10.); }
    
    fn perlinNoise3(P: vec3f) -> f32 {
      var Pi0 : vec3f = floor(P); // Integer part for indexing
      var Pi1 : vec3f = Pi0 + vec3f(1.); // Integer part + 1
      Pi0 = Pi0 % vec3f(289.);
      Pi1 = Pi1 % vec3f(289.);
      let Pf0 = fract(P); // Fractional part for interpolation
      let Pf1 = Pf0 - vec3f(1.); // Fractional part - 1.
      let ix = vec4f(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      let iy = vec4f(Pi0.yy, Pi1.yy);
      let iz0 = Pi0.zzzz;
      let iz1 = Pi1.zzzz;
  
      let ixy = permute4(permute4(ix) + iy);
      let ixy0 = permute4(ixy + iz0);
      let ixy1 = permute4(ixy + iz1);
  
      var gx0: vec4f = ixy0 / 7.;
      var gy0: vec4f = fract(floor(gx0) / 7.) - 0.5;
      gx0 = fract(gx0);
      var gz0: vec4f = vec4f(0.5) - abs(gx0) - abs(gy0);
      var sz0: vec4f = step(gz0, vec4f(0.));
      gx0 = gx0 + sz0 * (step(vec4f(0.), gx0) - 0.5);
      gy0 = gy0 + sz0 * (step(vec4f(0.), gy0) - 0.5);
  
      var gx1: vec4f = ixy1 / 7.;
      var gy1: vec4f = fract(floor(gx1) / 7.) - 0.5;
      gx1 = fract(gx1);
      var gz1: vec4f = vec4f(0.5) - abs(gx1) - abs(gy1);
      var sz1: vec4f = step(gz1, vec4f(0.));
      gx1 = gx1 - sz1 * (step(vec4f(0.), gx1) - 0.5);
      gy1 = gy1 - sz1 * (step(vec4f(0.), gy1) - 0.5);
  
      var g000: vec3f = vec3f(gx0.x, gy0.x, gz0.x);
      var g100: vec3f = vec3f(gx0.y, gy0.y, gz0.y);
      var g010: vec3f = vec3f(gx0.z, gy0.z, gz0.z);
      var g110: vec3f = vec3f(gx0.w, gy0.w, gz0.w);
      var g001: vec3f = vec3f(gx1.x, gy1.x, gz1.x);
      var g101: vec3f = vec3f(gx1.y, gy1.y, gz1.y);
      var g011: vec3f = vec3f(gx1.z, gy1.z, gz1.z);
      var g111: vec3f = vec3f(gx1.w, gy1.w, gz1.w);
  
      let norm0 = taylorInvSqrt4(
        vec4f(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 = g000 * norm0.x;
      g010 = g010 * norm0.y;
      g100 = g100 * norm0.z;
      g110 = g110 * norm0.w;
      let norm1 = taylorInvSqrt4(
        vec4f(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 = g001 * norm1.x;
      g011 = g011 * norm1.y;
      g101 = g101 * norm1.z;
      g111 = g111 * norm1.w;
  
      let n000 = dot(g000, Pf0);
      let n100 = dot(g100, vec3f(Pf1.x, Pf0.yz));
      let n010 = dot(g010, vec3f(Pf0.x, Pf1.y, Pf0.z));
      let n110 = dot(g110, vec3f(Pf1.xy, Pf0.z));
      let n001 = dot(g001, vec3f(Pf0.xy, Pf1.z));
      let n101 = dot(g101, vec3f(Pf1.x, Pf0.y, Pf1.z));
      let n011 = dot(g011, vec3f(Pf0.x, Pf1.yz));
      let n111 = dot(g111, Pf1);
  
      var fade_xyz: vec3f = fade3(Pf0);
      let temp = vec4f(f32(fade_xyz.z)); // simplify after chrome bug fix
      let n_z = mix(vec4f(n000, n100, n010, n110), vec4f(n001, n101, n011, n111), temp);
      let n_yz = mix(n_z.xy, n_z.zw, vec2f(f32(fade_xyz.y))); // simplify after chrome bug fix
      let n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
      return 2.2 * n_xyz;
    }
    
    
    @compute @workgroup_size(16) fn main(
      @builtin(global_invocation_id) blockIdx: vec3<u32>,
    ) {
      let index = blockIdx.x;
      
      // noise based on random vec3
      let perlinNoise = perlinNoise3(
        vec3f(
          abs(rand11(cos(f32(index)))) * 2.0 - 1.0,
          abs(rand11(sin(f32(index)))) * 2.0 - 1.0,
          abs(rand11(tan(f32(index)))),
        )
      );
            
      var writeIndex = vec2u(
        u32(
          f32(index) % params.size.x
        ),
        u32(
          floor(f32(index) / params.size.y)
        )
      );
      
      // write to the storage texture
      textureStore(noiseComputeTexture, writeIndex, vec4(vec3(perlinNoise), 1.0));
    }
  `

  const noiseSize = new Vec2(4, 4)

  const noiseComputeTexture = new Texture(gpuCameraRenderer, {
    label: 'Noise compute texture',
    name: 'noiseComputeTexture',
    type: 'storage',
    //format: 'rgba16float',
    format: 'rgba8unorm',
    fixedSize: {
      width: noiseSize.x,
      height: noiseSize.y,
    },
  })

  // we cannot directly use a storage texture in a render pass
  // so copy it
  const noiseTexture = new Texture(gpuCameraRenderer, {
    label: 'Noise texture',
    name: 'noiseTexture',
    fixedSize: {
      width: noiseSize.x,
      height: noiseSize.y,
    },
  })

  noiseTexture.copy(noiseComputeTexture)

  const compute3DNoise = new ComputePass(gpuCameraRenderer, {
    label: 'Compute noise texture pass',
    shaders: {
      compute: {
        code: compute3DNoiseShader,
      },
    },
    autoRender: false, // we're going to render only once on demand
    dispatchSize: 1,
    textures: [noiseComputeTexture],
    uniforms: {
      params: {
        struct: {
          size: {
            type: 'vec2f',
            value: noiseSize,
          },
        },
      },
    },
  })

  // we should wait for pipeline compilation!
  compute3DNoise.material.compileMaterial().then(() => {
    // now run the compute pass just once
    // it will fill our noise texture
    gpuCameraRenderer.renderOnce([compute3DNoise])
  })

  const repeatSampler = new Sampler(gpuCameraRenderer, {
    label: 'Repeat sampler',
    name: 'repeatSampler',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
  })

  // ------------------------------------
  // OCCLUSION PASS
  // ------------------------------------

  const ssaoTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'SSAO render target',
    sampleCount,
    qualityRatio: 0.75, // decrease quality to improve perf!
    useDepth: false, // no need for depth
  })

  // create textures based on our Geometry Buffer MRT output
  const gBufferAlbedoTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer albedo texture',
    name: 'gBufferAlbedoTexture',
    fromTexture: writeGBufferRenderTarget.outputTextures[0],
  })

  const gBufferNormalTexture = new Texture(gpuCameraRenderer, {
    label: 'GBuffer normal texture',
    name: 'gBufferNormalTexture',
    fromTexture: writeGBufferRenderTarget.outputTextures[1],
  })

  // we could have used a position texture in the geometry buffer
  // but we're going to rebuild the positions from the depth buffer instead
  // directly in the occlusion pass
  // const gBufferPositionTexture = new Texture(gpuCameraRenderer, {
  //   label: 'GBuffer position texture',
  //   name: 'gBufferPositionTexture',
  //   fromTexture: writeGBufferRenderTarget.outputTextures[2],
  // })

  const lerp = (a, b, alpha) => {
    return a + alpha * (b - a)
  }

  // 32 vec4f
  const kernelSize = 64
  const sampleKernels = new Float32Array(kernelSize * 3)
  const sample = new Vec3()
  for (let i = 0, j = 0; i < kernelSize; i++, j += 3) {
    sample.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random())

    sample.normalize()
    sample.multiplyScalar(Math.random())

    let scale = i / kernelSize
    scale = lerp(0.1, 1.0, scale * scale)
    sample.multiplyScalar(scale)

    sampleKernels[j] = sample.x
    sampleKernels[j + 1] = sample.y
    sampleKernels[j + 2] = sample.z
  }

  const occlusionFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    
    // from https://stackoverflow.com/a/46118945/13354068
    // or we could use worldPosFromScreenCoords() and multiply it by the camera view matrix
    fn viewPosFromScreenCoords(coords: vec2<f32>, depth: f32) -> vec3f {
      let clipPos: vec4f = vec4(coords.x * 2.0 - 1.0, (1.0 - coords.y) * 2.0 - 1.0, depth, 1.0);
      var viewPosH: vec4f = camera.inverseProjectionMatrix * clipPos;
      var viewPos: vec3f = viewPosH.xyz / viewPosH.w;
      
      return viewPos;
    }
 
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    
      // since the input and output resolutions are different
      // because we've set a lower quality ratio
      // we'll need to scale everything
      var outputResolution: vec2f = vec2f(textureDimensions(renderTexture));  
      var inputResolution: vec2f = vec2f(textureDimensions(gBufferDepthTexture));
      var scaledResolution = inputResolution / outputResolution;
      
      var screenPosition: vec2f = fsInput.position.xy * scaledResolution;
      
      let depth: f32 = textureLoad(
        gBufferDepthTexture,
        vec2<i32>(floor(screenPosition)),
        0
      );
      
      var noiseResolution: vec2f = vec2f(textureDimensions(noiseTexture));

      var noiseScale = outputResolution / noiseResolution;
      var random = vec3( textureSample( noiseTexture, repeatSampler, fsInput.uv * noiseScale ).r );

			if ( depth == 1.0 ) {

				return vec4( 1.0 ); // don't influence background
				
			} else {
			  
			  // this is how we'd do it if we had created a position texture
			  // in the geometry buffer
			  // var viewPosition = textureLoad(
        //   gBufferPositionTexture,
        //   vec2<i32>(floor(screenPosition)),
        //   0
        // ).xyz;
        
        var viewPosition = viewPosFromScreenCoords( screenPosition / inputResolution, depth );
        			          
			  var normal: vec3f = textureLoad(
          gBufferNormalTexture,
          vec2<i32>(floor(screenPosition)),
          0
        ).xyz;
			
			  var tangent: vec3f = normalize( random - normal * dot( random, normal ) );
				var bitangent: vec3f = cross( normal, tangent );
				var kernelMatrix: mat3x3f = mat3x3f( tangent, bitangent, normal );
				
				var occlusion = 0.0;

				for (var i = 0u; i < params.nbKernelSamples; i++) {

					var sampleVector: vec3f = kernelMatrix * kernel.samples[i].xyz; // reorient sample vector in view space
					var samplePoint: vec3f = viewPosition + ( sampleVector * params.radius ); // calculate sample point
					
					var offset = vec4( samplePoint, 1.0 );
					offset = camera.projectionMatrix * offset;
					
					// perspective divide
					offset /= offset.w;   
					            
          // transform to range 0.0 - 1.0
          // + invert Y coords
          var offsetUV = vec2(
            offset.x * 0.5 + 0.5,
            -1.0 * offset.y * 0.5 + 0.5
          );
          
          // this is how we'd do it if we had created a position texture
			    // in the geometry buffer
          // var sampleDepth = textureLoad(
          //   gBufferPositionTexture,
          //   vec2<i32>(floor(offsetUV * inputResolution)), // from 0.0 - 1.0 to resolution
          //   0
          // ).z;
          
          
          var offsetDepth = textureLoad(
            gBufferDepthTexture,
            vec2<i32>(floor(offsetUV * inputResolution)),
            0
          );
          
          var sampleDepth = viewPosFromScreenCoords( offsetUV.xy, offsetDepth ).z;
         
          var rangeCheck = smoothstep(0.0, 1.0, params.radius / abs(viewPosition.z - sampleDepth));
          
          if(sampleDepth >= samplePoint.z + params.bias) {
            occlusion += rangeCheck;
          }
				}

				occlusion = clamp( occlusion / f32( params.nbKernelSamples ), 0.0, 1.0 );

				return vec4( vec3( 1.0 - occlusion ), 1.0 );
			}
    }
  `

  const occlusionPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Occlusion pass',
    outputTarget: ssaoTarget, // output to our SSAO target with a lower resolution
    shaders: {
      fragment: {
        code: occlusionFs,
      },
    },
    textures: [gBufferDepthTexture, gBufferNormalTexture, noiseTexture],
    //textures: [gBufferDepthTexture, gBufferNormalTexture, gBufferPositionTexture, noiseTexture],
    samplers: [repeatSampler],
    uniforms: {
      params: {
        struct: {
          radius: {
            type: 'f32',
            value: systemSize.z / 2.5,
          },
          bias: {
            type: 'f32',
            value: systemSize.z / 200,
          },
          nbKernelSamples: {
            type: 'u32',
            value: Math.min(16, kernelSize),
          },
        },
      },
      camera: {
        struct: {
          viewMatrix: {
            type: 'mat4x4f',
            value: camera.viewMatrix,
          },
          projectionMatrix: {
            type: 'mat4x4f',
            value: camera.projectionMatrix,
          },
          inverseProjectionMatrix: {
            type: 'mat4x4f',
            value: camera.projectionMatrix.getInverse(),
          },
        },
      },
    },
    storages: {
      kernel: {
        struct: {
          samples: {
            type: 'array<vec3f>',
            value: sampleKernels,
          },
        },
      },
    },
  })

  occlusionPass.onRender(() => {
    occlusionPass.uniforms.camera.viewMatrix.value.copy(camera.viewMatrix)
    occlusionPass.uniforms.camera.projectionMatrix.value.copy(camera.projectionMatrix)
    occlusionPass.uniforms.camera.inverseProjectionMatrix.value.copy(camera.projectionMatrix).invert()

    // explicitly tell all the camera uniforms to update
    occlusionPass.material.shouldUpdateInputsBindings('camera')
  })

  // ------------------------------------
  // BLUR PASS
  // ------------------------------------

  const blurOcclusionPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {  
      var resolution: vec2f = vec2f(textureDimensions(renderTexture).xy);
      var texelSize: vec2f = ( 1.0 / resolution );
			var result: f32 = 0.0;

			for (var i: i32 = - 2; i < 2; i ++ ) {

				for ( var j: i32 = - 2; j < 2; j ++ ) {

					var offset: vec2f = ( vec2( f32( i ), f32( j ) ) ) * texelSize;
					result += textureSample( renderTexture, defaultSampler, fsInput.uv + offset ).r;

				}

			}

			return vec4( vec3( result / ( 4.0 * 4.0 ) ), 1.0 );
    }
  `

  const blurOcclusionPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Blur pass',
    inputTarget: ssaoTarget, // use the result of our occlusion pass as input
    shaders: {
      fragment: {
        code: blurOcclusionPassFs,
      },
    },
  })

  // ------------------------------------
  // SHADING / LIGHTNING PASS
  // ------------------------------------
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.3,
  })

  const lights = []

  const systemLengthSq = systemSize.lengthSq()
  const systemLength = systemSize.length()

  for (let i = 0, j = 0, k = 0; i < nbLights; i++, j += 4, k += 3) {
    const color = Math.random() * 0.25 + 0.75

    lights.push(
      new PointLight(gpuCameraRenderer, {
        position: new Vec3(
          (systemSize.x * 1.25 + Math.random() * systemSize.x * 1.5) * Math.sign(Math.random() - 0.5),
          (systemSize.y * 1.25 + Math.random() * systemSize.y * 1.5) * Math.sign(Math.random() - 0.5),
          (systemSize.z * 1.25 + Math.random() * systemSize.z * 1.5) * Math.sign(Math.random() - 0.5)
        ),
        color: new Vec3(color),
        range: systemLength + Math.random() * systemLength * 2,
        intensity: systemLengthSq,
      })
    )
  }

  const ssaoPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    ${getLambert({
      useOcclusion: true,
    })}
    
    fn worldPosFromScreenCoords(coord : vec2<f32>, depth_sample: f32) -> vec3<f32> {
      // reconstruct world-space position from the screen coordinate.
      let posClip = vec4(coord.x * 2.0 - 1.0, (1.0 - coord.y) * 2.0 - 1.0, depth_sample, 1.0);
      let posWorldW = camera.inverseViewProjectionMatrix * posClip;
      let posWorld = posWorldW.xyz / posWorldW.www;
      return posWorld;
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {    
      var blurredOcclusion = textureSample(renderTexture, defaultSampler, fsInput.uv);
     
      var result : vec3<f32>;

      let depth = textureLoad(
        gBufferDepthTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      );
    
      // Don't light the sky.
      if (depth >= 1.0) {
        discard;
      }
    
      let bufferSize = textureDimensions(gBufferDepthTexture);
      let coordUV = fsInput.position.xy / vec2<f32>(bufferSize); // 0.0 - 1.0 range
      let position = worldPosFromScreenCoords(coordUV, depth);
    
      let normal = textureLoad(
        gBufferNormalTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      ).xyz;
    
      let albedo = textureLoad(
        gBufferAlbedoTexture,
        vec2<i32>(floor(fsInput.position.xy)),
        0
      );
      
      let color = getLambert(normal, position, albedo, blurredOcclusion.r);
      
      return select(
        color,
        vec4(blurredOcclusion.rgb, 1.0),
        bool(params.displaySSAOResult)
      );
    }
  `

  const ssaoPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Lightning pass',
    shaders: {
      fragment: {
        code: ssaoPassFs,
      },
    },
    textures: [gBufferDepthTexture, gBufferAlbedoTexture, gBufferNormalTexture],
    // we need all the renderer lights bindings
    bindings: [
      gpuCameraRenderer.bindings.ambientLights,
      gpuCameraRenderer.bindings.directionalLights,
      gpuCameraRenderer.bindings.pointLights,
      gpuCameraRenderer.bindings.spotLights,
    ],
    uniforms: {
      camera: {
        struct: {
          inverseViewProjectionMatrix: {
            type: 'mat4x4f',
            value: new Mat4().multiplyMatrices(camera.projectionMatrix, camera.viewMatrix).invert(),
          },
        },
      },
      params: {
        struct: {
          displaySSAOResult: {
            type: 'u32',
            value: 0,
          },
        },
      },
    },
  })

  ssaoPass.onRender(() => {
    ssaoPass.uniforms.camera.inverseViewProjectionMatrix.value
      .multiplyMatrices(camera.projectionMatrix, camera.viewMatrix)
      .invert()

    // explicitly tell the uniform to update
    ssaoPass.uniforms.camera.inverseViewProjectionMatrix.shouldUpdate = true
  })

  // GUI
  const gui = new lil.GUI({
    title: 'Debug',
  })

  gui
    .add({ nbLights: nbLights }, 'nbLights', 0, nbLights, 1)
    .onChange((value) => {
      lights.forEach((light, i) => {
        if (i < value) {
          light.intensity = systemLengthSq
        } else {
          light.intensity = 0
        }
      })
    })
    .name('Number of active point lights')

  const ssaoFolder = gui.addFolder('SSAO')

  ssaoFolder
    .add({ qualityRatio: ssaoTarget.renderPass.options.qualityRatio }, 'qualityRatio', 0.1, 1, 0.05)
    .onChange((value) => {
      ssaoTarget.setQualityRatio(value)
      occlusionPass.renderTexture.setQualityRatio(value)
      blurOcclusionPass.renderTexture.copy(ssaoTarget.renderTexture)
    })
    .name('Texture quality')

  ssaoFolder.add(occlusionPass.uniforms.params.radius, 'value', systemSize.z / 100, systemSize.z, 1).name('Radius')
  ssaoFolder
    .add(occlusionPass.uniforms.params.nbKernelSamples, 'value', 1, kernelSize, 1)
    .name('Number of kernel samples')

  ssaoFolder
    .add({ displaySSAO: false }, 'displaySSAO')
    .onChange((value) => {
      ssaoPass.uniforms.params.displaySSAOResult.value = value ? 1 : 0
    })
    .name('Display SSAO texture')
})
