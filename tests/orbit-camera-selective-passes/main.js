// Goal of this test is to try to mix selective passes
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUCameraRenderer,
    GPUDeviceManager,
    OrbitControls,
    BoxGeometry,
    Mesh,
    RenderTarget,
    Texture,
    ShaderPass,
    SphereGeometry,
    Vec2,
    Vec3,
  } = await import(/* @vite-ignore */ path)

  const systemSize = 10

  // here is an example of how we can use a simple GPUCameraRenderer instead of GPUCurtains
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not related to DOM

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
      far: systemSize * 10,
    },
    renderPass: {
      sampleCount: 4,
    },
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  // set the camera initial position
  camera.position.z = systemSize * 3

  // orbit controls
  const orbitControls = new OrbitControls(gpuCameraRenderer)
  orbitControls.zoomSpeed = 2
  orbitControls.maxZoom = systemSize * 6

  console.log(camera)

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  // two render targets with specific depth textures
  const blankRenderTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Blank render target',
    //renderToSwapChain: false,
    sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
    depthTexture: new Texture(gpuCameraRenderer, {
      label: 'Cube depth texture',
      name: 'cubeDepthTexture',
      type: 'depth',
      format: 'depth24plus',
      sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
    }),
  })

  const selectiveBloomTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom render target',
    sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
    depthTexture: new Texture(gpuCameraRenderer, {
      label: 'Sphere depth texture',
      name: 'sphereDepthTexture',
      type: 'depth',
      format: 'depth24plus',
      sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
    }),
  })

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5
    const mesh = new Mesh(gpuCameraRenderer, {
      geometry: isCube ? cubeGeometry : sphereGeometry,
      outputTarget: isCube ? blankRenderTarget : selectiveBloomTarget,
      transparent: true,
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = Math.random() * 0.025

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }

  // first scene pass
  const initBloomPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Init pass',
    inputTarget: selectiveBloomTarget,
  })

  console.log(initBloomPass, selectiveBloomTarget)

  const brigthnessPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    fn brightnessMatrix( brightness: f32 ) -> mat4x4f {
      return mat4x4f( 1, 0, 0, 0,
                 0, 1, 0, 0,
                 0, 0, 1, 0,
                 brightness, brightness, brightness, 1 );
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      
      // gamma?
      color = pow(color, vec4(1.0 / 2.5));
      
      var brightness: f32 = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      var result: vec4f = mix(vec4(0), color, step(params.threshold, brightness));
      
      //return brightnessMatrix( 0.325 ) * color;
      return result;
    }
  `

  // brightness pass
  const brigthnessPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Brightness pass',
    //inputTarget: selectiveBloomTarget,
    shaders: {
      fragment: {
        code: brigthnessPassFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          threshold: {
            type: 'f32',
            value: 0.1,
          },
        },
      },
    },
    // targets: [
    //   {
    //     blend: {
    //       color: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //       alpha: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //     },
    //   },
    // ],
  })

  const blurSettings = {
    spread: 5 * gpuCameraRenderer.pixelRatio,
    weight: new Float32Array([0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216]),
  }

  const hBlurPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var texelOffset: vec2f = vec2f(1) / vec2f(textureDimensions(renderTexture, 0)) * params.spread;

      var result: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv) * params.weight[0];

      for(var i: u32 = 1; i < arrayLength(&params.weight); i++) {
        result += textureSample(renderTexture, defaultSampler, fsInput.uv + vec2(texelOffset.x * f32(i), 0.0)) * params.weight[i];
        result += textureSample(renderTexture, defaultSampler, fsInput.uv - vec2(texelOffset.x * f32(i), 0.0)) * params.weight[i];
      }

      return result;
    }
  `

  // horizontal blur pass
  const hBlurPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Horizontal blur pass',
    //inputTarget: selectiveBloomTarget,
    shaders: {
      fragment: {
        code: hBlurPassFs,
      },
    },
    storages: {
      params: {
        struct: {
          weight: {
            type: 'array<f32>',
            value: blurSettings.weight,
          },
          spread: {
            type: 'f32',
            value: blurSettings.spread,
          },
        },
      },
    },
    // targets: [
    //   {
    //     blend: {
    //       color: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //       alpha: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //     },
    //   },
    // ],
  })

  const vBlurPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var texelOffset: vec2f = vec2f(1) / vec2f(textureDimensions(renderTexture, 0)) * params.spread;

      var result: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv) * params.weight[0];

      for(var i: u32 = 1; i < arrayLength(&params.weight); i++) {
        result += textureSample(renderTexture, defaultSampler, fsInput.uv + vec2(0.0, texelOffset.x * f32(i))) * params.weight[i];
        result += textureSample(renderTexture, defaultSampler, fsInput.uv - vec2(0.0, texelOffset.x * f32(i))) * params.weight[i];
      }

      return result;
    }
  `

  // vertical blur pass
  const vBlurPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Vertical blur pass',
    //inputTarget: selectiveBloomTarget,
    shaders: {
      fragment: {
        code: vBlurPassFs,
      },
    },
    storages: {
      params: {
        struct: {
          weight: {
            type: 'array<f32>',
            value: blurSettings.weight,
          },
          spread: {
            type: 'f32',
            value: (blurSettings.spread * gpuCameraRenderer.boundingRect.width) / gpuCameraRenderer.boundingRect.height,
          },
        },
      },
    },
    // targets: [
    //   {
    //     blend: {
    //       color: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //       alpha: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //     },
    //   },
    // ],
  })

  vBlurPass.onAfterResize(() => {
    vBlurPass.storages.params.spread.value =
      (blurSettings.spread * gpuCameraRenderer.boundingRect.width) / gpuCameraRenderer.boundingRect.height
  })

  // blend pass: blend the original scene pass with the bloom result
  const blendBloomPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {            
      var scene: vec4f = textureSample(sceneTexture, defaultSampler, fsInput.uv);
      var bloom: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      var color: vec4f = scene + bloom * params.mult;
    
      // tone mapping
      var result: vec4f = vec4(1.0) - exp(-color * params.exposure);
    
      // also gamma correct while we're at it       
      result = pow(result, vec4(1.0 / params.gamma));
      
      return result;
    }
  `

  const blendBloomPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Blend bloom pass',
    shaders: {
      fragment: {
        code: blendBloomPassFs,
      },
    },
    copyOutputToRenderTexture: true,
    uniforms: {
      params: {
        struct: {
          mult: {
            type: 'f32',
            value: 1,
          },
          exposure: {
            type: 'f32',
            value: 1,
          },
          gamma: {
            type: 'f32',
            value: 2.2,
          },
        },
      },
    },
    // targets: [
    //   {
    //     blend: {
    //       color: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //       alpha: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //     },
    //   },
    // ],
  })

  // pass the original scene pass result to our blend pass
  blendBloomPass.createTexture({
    label: 'Scene texture',
    name: 'sceneTexture',
    fromTexture: initBloomPass.renderTexture,
  })

  // dithering pass
  // from https://www.shadertoy.com/view/ltSSzW
  const ditherFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    
    fn modulo(x: vec2f, y: vec2f) -> vec2f {
      return x - y * floor(x / y);
    }
    
    fn getValue(brightness: f32, pos: vec2f) -> bool {
      
      // do the simple math first
      if (brightness > 16.0/17.0) {
        return false;
      }
      
      if (brightness < 01.0/17.0) {
        return true;
      }
      
      var pixel: vec2f = vec2( floor( modulo( (pos + 0.5) / params.pixelSize, vec2(4.0)) ) );
      
      var x: i32 = i32(pixel.x);
      var y: i32 = i32(pixel.y);
      var result: bool = false;
      
      // compute the 16 values by hand, store when it's a match
      if (x == 0 && y == 0) {
        result = brightness < 16.0/17.0;
      } else if (x == 2 && y == 2) {
        result = brightness < 15.0/17.0;
      } else if (x == 2 && y == 0) {
        result = brightness < 14.0/17.0;
      } else if (x == 0 && y == 2) {
        result = brightness < 13.0/17.0;
      } else if (x == 1 && y == 1) {
        result = brightness < 12.0/17.0;
      } else if (x == 3 && y == 3) {
        result = brightness < 11.0/17.0;
      } else if (x == 3 && y == 1) {
        result = brightness < 10.0/17.0;
      } else if (x == 1 && y == 3) {
        result = brightness < 09.0/17.0;
      } else if (x == 1 && y == 0) {
        result = brightness < 08.0/17.0;
      } else if (x == 3 && y == 2) {
        result = brightness < 07.0/17.0;
      } else if (x == 3 && y == 0) {
        result = brightness < 06.0/17.0;
      } else if (x == 0 && y == 1) {
        result =	brightness < 05.0/17.0;
      } else if (x == 1 && y == 2) {
        result = brightness < 04.0/17.0;
      } else if (x == 2 && y == 3) {
        result = brightness < 03.0/17.0;
      } else if (x == 2 && y == 1) {
        result = brightness < 02.0/17.0;
      } else if (x == 0 && y == 3) {
        result = brightness < 01.0/17.0;
      }
          
      return result;
    }

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      
      var color: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      
      var grayscale: f32 = color.r * 0.3 + color.g * 0.59 + color.b * 0.11;
      
      // here fsInput.position.xy ranges from [0, 0] to [canvasWidth, canvasHeight]
      var dither: f32 = select(0.0, color.a, getValue( grayscale, fsInput.position.xy ));
      
      return vec4(vec3(dither) * color.rgb, dither);
    }
  `

  const ditherPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Dither pass',
    //inputTarget: selectiveBloomTarget,
    shaders: {
      fragment: {
        code: ditherFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          pixelSize: {
            type: 'f32',
            value: 1.5 * gpuCameraRenderer.pixelRatio,
          },
        },
      },
    },
  })

  const blendShader = /* wgsl */ `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        var cubeColor: vec4f = textureSample(cubeRenderTexture, defaultSampler, fsInput.uv);        
        var sphereColor: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
        
        var bloomSphereColor: vec4f = textureSample(bloomSphereRenderTexture, defaultSampler, fsInput.uv);
        
        let rawCubeDepth = textureLoad(
          cubeDepthTexture,
          vec2<i32>(floor(fsInput.position.xy)),
          0
        );
        
        let rawSphereDepth = textureLoad(
          sphereDepthTexture,
          vec2<i32>(floor(fsInput.position.xy)),
          0
        );
                
        var color: vec4f = cubeColor * (1.0 - sphereColor.a) + sphereColor;
        color = select(color, cubeColor, rawSphereDepth > rawCubeDepth);
        
        //return bloomSphereColor;
        
        //return color;
        return mix(color, bloomSphereColor, step(fsInput.uv.y, 0.5));
      }
  `

  const blendPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Blend pass',
    shaders: {
      fragment: {
        code: blendShader,
      },
    },
    // targets: [
    //   {
    //     blend: {
    //       color: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //       alpha: {
    //         operation: 'add',
    //         srcFactor: 'one',
    //         dstFactor: 'one-minus-src-alpha',
    //       },
    //     },
    //   },
    // ],
  })

  const cubeRenderTexture = blendPass.createTexture({
    name: 'cubeRenderTexture',
    fromTexture: blankRenderTarget.renderTexture,
  })

  const cubeDepthTexture = blendPass.createTexture({
    name: 'cubeDepthTexture',
    type: 'depth',
    format: 'depth24plus',
    fromTexture: blankRenderTarget.options.depthTexture,
    sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
  })

  const bloomSphereTexture = blendPass.createTexture({
    name: 'bloomSphereRenderTexture',
    fromTexture: blendBloomPass.renderTexture,
  })

  console.log(blendBloomPass)

  const sphereDepthTexture = blendPass.createTexture({
    name: 'sphereDepthTexture',
    type: 'depth',
    format: 'depth24plus',
    fromTexture: selectiveBloomTarget.options.depthTexture,
    sampleCount: gpuCameraRenderer.renderPass.options.sampleCount,
  })

  console.log(gpuCameraRenderer.scene)
})
