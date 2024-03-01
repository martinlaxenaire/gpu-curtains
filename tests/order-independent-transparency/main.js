// Weighted, blended order-independent transparency implementation
// from https://learnopengl.com/Guest-Articles/2020/OIT/Weighted-Blended
// and https://casual-effects.blogspot.com/2015/03/implemented-weighted-blended-order.html
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    GPUCameraRenderer,
    GPUDeviceManager,
    Object3D,
    PlaneGeometry,
    Mesh,
    RenderTarget,
    ShaderPass,
    Vec3,
    RenderTexture,
  } = await import(/* @vite-ignore */ path)

  // here is an example of how we can use a simple GPUCameraRenderer instead of GPUCurtains
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not related to DOM

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  const sampleCount = 1

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    renderPass: {
      sampleCount,
    },
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  const cameraPivot = new Object3D()
  camera.position.z = 5
  camera.parent = cameraPivot

  camera.lookAt(new Vec3())

  // render our scene manually
  const animate = () => {
    cameraPivot.rotation.y += 0.005
    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  const planeGeometry = new PlaneGeometry()

  const planesFs = /* wgsl */ `
   struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      return vec4(shading.color, 1.0);
    }
  `

  const OITOpaqueTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Opaque MRT',
    sampleCount,
  })

  const opaquePlane = new Mesh(gpuCameraRenderer, {
    label: 'Opaque plane',
    geometry: planeGeometry,
    outputTarget: OITOpaqueTarget,
    cullMode: 'none',
    shaders: {
      fragment: {
        code: planesFs,
      },
    },
    uniforms: {
      shading: {
        struct: {
          color: {
            type: 'vec3f',
            value: new Vec3(1, 0, 0),
          },
        },
      },
    },
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
    depthLoadOp: 'load', // read from opaque depth!
  })

  const OITtargetFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    struct OITTargetOutput {
      // Textures: diffuse color, specular color, smoothness, emissive etc. could go here
      @location(0) accum : vec4<f32>,
      @location(1) reveal : f32,
    };
    
    @fragment fn main(fsInput: VSOutput) -> OITTargetOutput {
      var output : OITTargetOutput;
      
      var color: vec4f = vec4(shading.color, shading.alpha);
      
      // insert your favorite weighting function here. the color-based factor
      // avoids color pollution from the edges of wispy clouds. the z-based
      // factor gives precedence to nearer surfaces
      let weight: f32 =
          clamp(pow(min(1.0, color.a * 10.0) + 0.01, 3.0) * 1e8 * 
                         pow(1.0 - fsInput.position.z * 0.9, 3.0), 1e-2, 3e3);
      
      // blend func: GL_ONE, GL_ONE
      // switch to pre-multiplied alpha and weight
      output.accum = vec4(color.rgb * color.a, color.a) * weight;
      
      // blend func: GL_ZERO, GL_ONE_MINUS_SRC_ALPHA
      output.reveal = color.a;
    
      return output;
    }
  `

  for (let i = 0; i < 2; i++) {
    const transparentPlane = new Mesh(gpuCameraRenderer, {
      label: 'Transparent plane ' + i,
      geometry: planeGeometry,
      depthWriteEnabled: false, // read from opaque depth but not write to depth
      outputTarget: OITTransparentTarget,
      cullMode: 'none',
      shaders: {
        fragment: {
          code: OITtargetFs,
        },
      },
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
      uniforms: {
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              //value: new Vec3(Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5),
              value: i === 0 ? new Vec3(0, 1, 0) : new Vec3(0, 0, 1),
            },
            alpha: {
              type: 'f32',
              value: 0.5,
            },
          },
        },
      },
    })

    transparentPlane.position.z = i + 1

    transparentPlane.userData.time = 0

    transparentPlane.onRender(() => {
      transparentPlane.position.z = Math.cos(transparentPlane.userData.time * 0.01) * (i + 1)
      transparentPlane.userData.time++
    })

    console.log(transparentPlane)
  }

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
      return abs(value) > 999999999999.99;
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
  })
})
