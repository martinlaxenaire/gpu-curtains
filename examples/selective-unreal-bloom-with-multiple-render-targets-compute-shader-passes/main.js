import {
  OrbitControls,
  AmbientLight,
  DirectionalLight,
  SphereGeometry,
  LitMesh,
  Vec2,
  Vec3,
  RenderTarget,
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  ComputeShaderPass,
  ShaderPass,
  constants,
  common,
  toneMappingUtils,
  Texture,
  Sampler,
  Raycaster,
} from '../../dist/esm/index.mjs'

// Selective Unreal Bloom
//
// The idea here is to render our main scene in a Multiple Render Targets,
// where we'll output our regular scene in a texture and the selective bloom objects in another one
// This allows to preserve depth and get a proper 'masked' scene.
// The selection is done with a simple mesh uniform value, allowing for a really dynamic selection of bloomed objects.
//
// Once we have our selective masked scene texture,
// we'll use it to apply a number of chained passes, using `ComputeShaderPass` and `rgba16float` textures:
// 1. Extract the brightness from the masked scene.
// 2. Apply a 2 passes gaussian blur.
// 3. Apply a round of 2 passes gaussian blurs using `RenderTarget`, each one of them twice smaller as the previous one (mimicking mips behaviour). This allows for a large glow effect.
// 4. Composite our original regular scene with all the outputs from each gaussian blurs, using a regular `ShaderPass`.
window.addEventListener('load', async () => {
  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
  })

  const systemSize = 10

  gpuCameraRenderer.camera.position.z = systemSize * 3.5

  // orbit controls
  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.domElement.element,
  })

  // lights
  // we want a really bright scene to emphasize the effect
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 1,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize * 5, systemSize * 40, systemSize * 30),
    intensity: 3,
  })

  const selectiveMRT = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective MRT',
    depthTexture: gpuCameraRenderer.renderPass.depthTexture,
    colorAttachments: [
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: gpuCameraRenderer.options.context.format, // selective mask
      },
      {
        loadOp: 'clear',
        clearValue: [0, 0, 0, 0],
        targetFormat: gpuCameraRenderer.options.context.format, // original scene
      },
    ],
  })

  // create two render targets that we'll be ping ponging
  const renderTargetsOptions = {
    useDepth: false, // no need for depth
    sampleCount: 1, // no need for MSAA
    colorAttachments: [
      {
        targetFormat: 'rgba16float',
      },
    ],
  }

  const targets = [
    {
      blend: {
        color: {
          operation: 'add',
          srcFactor: 'one',
          dstFactor: 'one-minus-src-alpha',
        },
        alpha: {
          operation: 'add',
          srcFactor: 'one',
          dstFactor: 'one-minus-src-alpha',
        },
      },
    },
  ]

  const selectiveTargetA = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom target A',
    ...renderTargetsOptions,
  })

  const selectiveTargetB = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom target B',
    ...renderTargetsOptions,
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const sphereColor1 = new Vec3(0, 1, 1)
  const sphereColor2 = new Vec3(1, 0, 1)
  const cubeColor = new Vec3(0.4)

  const meshPosition = new Vec3()

  // keep track of the cube meshes
  // we'll raycast them to add them to the bloom pass on mouse over
  const cubeMeshes = []

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5

    const rotationSpeed = 0.005 + Math.random() * 0.02

    meshPosition.set(
      Math.random() * systemSize * 2 - systemSize,
      Math.random() * systemSize * 2 - systemSize,
      Math.random() * systemSize * 2 - systemSize
    )

    const mesh = new LitMesh(gpuCameraRenderer, {
      label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      outputTarget: selectiveMRT,
      material: {
        shading: 'Lambert',
        color: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
        // render in linear space without tone mapping
        toneMapping: false,
        colorSpace: 'linear',
        outputColorSpace: 'linear',
        fragmentOutput: {
          // matches the MRT attachments
          struct: [
            {
              type: 'vec4f',
              name: 'mask',
            },
            {
              type: 'vec4f',
              name: 'scene',
            },
          ],
          output: /* wgsl */ `
          var output: FSOutput;
          output.scene = outputColor;
          output.mask = select(vec4(0.0), outputColor, params.isMasked == 0);

          return output;`,
        },
      },
      uniforms: {
        params: {
          struct: {
            isMasked: {
              type: 'i32',
              value: isCube ? 1 : 0,
            },
          },
        },
      },
    })

    mesh.position.copy(meshPosition)

    // initial rotation
    mesh.rotation.y = rotationSpeed * 10
    mesh.rotation.z = rotationSpeed * 10

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })

    if (isCube) {
      cubeMeshes.push(mesh)
    }
  }

  const brightnessComputeShader = /* wgsl */ `
    fn luminance(color: vec3f) -> f32 {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    @compute @workgroup_size(16, 16) fn main(
        @builtin(global_invocation_id) id: vec3<u32>
    ) {
      let dims = textureDimensions(renderTexture);

      if (id.x >= dims.x || id.y >= dims.y) {
        return;
      }

      let uv: vec2f = vec2(vec2f(id.xy) / vec2f(dims));

      let color = textureLoad(renderTexture, vec2<i32>(id.xy), 0u);

      let v: f32 = luminance(color.rgb);
      let alpha: f32 = smoothstep(params.threshold, params.threshold + params.smoothWidth, v);

      //let result: vec4f = mix(vec4(0), color, step(params.threshold, v));
      let result: vec4f = mix(vec4(0), color, alpha);

      // bloom object with brightness extracted
      textureStore(storageRenderTexture, vec2<i32>(id.xy), result);
    }`

  const computeBrightnessPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute brightness shader pass',
    shaders: {
      compute: {
        code: brightnessComputeShader,
      },
    },
    texturesOptions: {
      format: 'rgba16float',
    },
    uniforms: {
      params: {
        struct: {
          threshold: {
            type: 'f32',
            value: 0,
          },
          smoothWidth: {
            type: 'f32',
            value: 0.01,
          },
        },
      },
    },
    targets,
    inputTarget: selectiveMRT, // use our mask render target texture as input
    outputTarget: selectiveTargetA,
  })

  const blurComputeShaderPass = []

  const gaussianParams = {
    radius: 3,
    weights: [0.057, 0.0564, 0.0547, 0.052, 0.0484, 0.0442, 0.0395],
  }

  const gaussianBlurComputePasses = /* wgsl */ `
    fn getBlur(id: vec3u, textureSize: vec2f) -> vec4f {
      let texelSize: vec2f = 1.0 / textureSize; // TODO

      let blurScale: vec2f = params.radius * params.direction;

      let uv = vec2f(id.xy) + 0.5; // pixel center

      let numKernels = arrayLength(&params.weights);

      var sum: vec3f = vec3f(0.0);
      var weightSum: f32 = params.weights[0];

      sum += textureLoad(renderTexture, vec2i(uv * params.scale), 0).rgb * weightSum;

      for(var i = 1u; i < numKernels; i++) {
        let uvOffset: vec2f = f32(i) * blurScale;

        let w = params.weights[i];
        let sample1 = textureLoad(renderTexture, vec2i((uv + uvOffset) * params.scale), 0).rgb;
        let sample2 = textureLoad(renderTexture, vec2i((uv - uvOffset) * params.scale), 0).rgb;
        sum += (sample1 + sample2) * w;
        weightSum += 2.0 * w;
      }

      return vec4(sum / weightSum, 1.0);
    }

    @compute @workgroup_size(16, 8)
    fn horizontal(@builtin(global_invocation_id) gid : vec3<u32>) {
      let textureSize = textureDimensions(storageRenderTexture);
      if (gid.x >= textureSize.x || gid.y >= textureSize.y) { return; }

      let result = getBlur(gid, vec2f(textureSize));

      textureStore(storageRenderTexture, vec2i(gid.xy), result);
    }

    @compute @workgroup_size(8, 16)
    fn vertical(@builtin(global_invocation_id) gid : vec3<u32>) {
      let textureSize = textureDimensions(storageRenderTexture);
      if (gid.x >= textureSize.x || gid.y >= textureSize.y) { return; }

      let result = getBlur(gid, vec2f(textureSize));

      textureStore(storageRenderTexture, vec2i(gid.xy), result);
    }`

  const computeHorizontalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute horizontal blur shader pass',
    shaders: {
      compute: {
        code: gaussianBlurComputePasses,
        entryPoint: 'horizontal',
      },
    },
    textureDispatchSize: [16, 8],
    texturesOptions: {
      format: 'rgba16float',
    },
    storages: {
      params: {
        struct: {
          radius: {
            type: 'f32',
            value: gaussianParams.radius,
          },
          scale: {
            type: 'f32',
            value: 1,
          },
          direction: {
            type: 'vec2f',
            value: new Vec2(1, 0),
          },
          weights: {
            type: 'array<f32>',
            value: gaussianParams.weights,
          },
        },
      },
    },
    targets,
    inputTarget: selectiveTargetA,
    outputTarget: selectiveTargetB,
  })

  blurComputeShaderPass.push(computeHorizontalBlurPass)

  const computeVerticalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute vertical blur shader pass',
    shaders: {
      compute: {
        code: gaussianBlurComputePasses,
        entryPoint: 'vertical',
      },
    },
    textureDispatchSize: [8, 16],
    texturesOptions: {
      format: 'rgba16float',
    },
    storages: {
      params: {
        struct: {
          radius: {
            type: 'f32',
            value: gaussianParams.radius,
          },
          scale: {
            type: 'f32',
            value: 1,
          },
          direction: {
            type: 'vec2f',
            value: new Vec2(0, 1),
          },
          weights: {
            type: 'array<f32>',
            value: gaussianParams.weights,
          },
        },
      },
    },
    targets,
    inputTarget: selectiveTargetB,
    outputTarget: selectiveTargetA,
  })

  blurComputeShaderPass.push(computeVerticalBlurPass)

  const nbMips = 5

  const firstMipTexture = new Texture(gpuCameraRenderer, {
    label: 'Mip bloom texture level 0',
    name: 'bloomTexture0',
    fromTexture: selectiveTargetA.renderTexture,
  })

  const mipOutputTextures = [firstMipTexture]
  const mipInputTargets = [selectiveTargetA]

  for (let i = 1; i <= nbMips; i++) {
    const prevQualityRatio = Math.pow(0.5, i - 1)
    const qualityRatio = Math.pow(0.5, i)

    const mipTargetA = new RenderTarget(gpuCameraRenderer, {
      label: `Mip bloom render target A ${i}`,
      renderTextureName: `bloomTexture${i}`, // used in our final composite pass
      ...renderTargetsOptions,
      qualityRatio,
    })

    const mipTargetB = new RenderTarget(gpuCameraRenderer, {
      label: `Mip bloom render target B ${i}`,
      renderTextureName: `bloomTexture${i}`, // used in our final composite pass
      ...renderTargetsOptions,
      qualityRatio,
    })

    mipInputTargets.push(mipTargetA)

    const mipHorizontalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
      label: `Compute horizontal blur mip shader pass ${i}`,
      shaders: {
        compute: {
          code: gaussianBlurComputePasses,
          entryPoint: 'horizontal',
        },
      },
      textureDispatchSize: [16, 8],
      texturesOptions: {
        format: 'rgba16float',
      },
      storages: {
        params: {
          struct: {
            radius: {
              type: 'f32',
              value: gaussianParams.radius / qualityRatio,
            },
            scale: {
              type: 'f32',
              value: prevQualityRatio,
            },
            direction: {
              type: 'vec2f',
              value: new Vec2(1, 0),
            },
            weights: {
              type: 'array<f32>',
              value: gaussianParams.weights,
            },
          },
        },
      },
      targets,
      inputTarget: mipInputTargets[i - 1],
      outputTarget: mipTargetB,
    })

    blurComputeShaderPass.push(mipHorizontalBlurPass)

    const mipVerticalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
      label: `Compute vertical blur mip shader pass ${i}`,
      shaders: {
        compute: {
          code: gaussianBlurComputePasses,
          entryPoint: 'vertical',
        },
      },
      textureDispatchSize: [8, 16],
      texturesOptions: {
        format: 'rgba16float',
      },
      storages: {
        params: {
          struct: {
            radius: {
              type: 'f32',
              value: gaussianParams.radius / qualityRatio,
            },
            scale: {
              type: 'f32',
              value: qualityRatio,
            },
            direction: {
              type: 'vec2f',
              value: new Vec2(0, 1),
            },
            weights: {
              type: 'array<f32>',
              value: gaussianParams.weights,
            },
          },
        },
      },
      targets,
      inputTarget: mipTargetB,
      outputTarget: mipTargetA,
    })

    blurComputeShaderPass.push(mipVerticalBlurPass)

    mipOutputTextures.push(mipTargetA.renderTexture)
  }

  const bloomFactors = [...Array(nbMips).keys()].map((i) => 1 - (i * 1) / nbMips)

  const getMipsContributionChunk = [...Array(nbMips).keys()]
    .map((i) => {
      return `bloomScene += textureSample(bloomTexture${i}, defaultSampler, fsInput.uv).rgb * lerpBloomFactor(params.bloomFactors[${i}]);`
    })
    .join('\n')

  // composite pass: blend the original scene pass with the bloom result
  const compositePassFs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };

      // chunks needed for tone mapping
      ${constants}
      ${common}
      ${toneMappingUtils}

      fn lerpBloomFactor(factor: f32) -> f32 {
        let mirrorFactor: f32 = 1.2 - factor;
        return mix(factor, mirrorFactor, params.bloomRadius);
    }
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        let originalScene: vec4f = textureSample(sceneTexture, defaultSampler, fsInput.uv);

        var bloomScene: vec3f;

        ${getMipsContributionChunk}

        let bloomA = saturate(max(max(bloomScene.r, bloomScene.g), bloomScene.b));
        let invSceneA = 1.0 - originalScene.a;
        let outA = originalScene.a + bloomA * invSceneA;

        var result: vec4f = vec4((originalScene.rgb * originalScene.a + bloomScene * params.bloomStrength * bloomA), outA);

        if(params.outputResult == 1) {
          result = originalScene;
        } else if(params.outputResult == 2) {
          result = vec4(bloomScene, outA);
        }

        // tone mapping
        result = vec4(KhronosToneMapping(result.rgb), result.a);
        // linear to sRGB
        result = linearTosRGB_4(result);
        
        return result;
      }
    `

  // get our MRT scene texture and pass it to the composite pass
  const sceneTexture = new Texture(gpuCameraRenderer, {
    label: 'MRT scene texture',
    name: 'sceneTexture',
    fromTexture: selectiveMRT.outputTextures[1],
  })

  const compositePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Composite pass',
    shaders: {
      fragment: {
        code: compositePassFs,
      },
    },
    samplers: [
      new Sampler(gpuCameraRenderer, {
        label: 'Clamp sampler',
        name: 'clampSampler',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      }),
    ],
    textures: [
      // the MRT texture containing our original scene
      sceneTexture,
      // last selective ping pong target onto which we rendered
      selectiveTargetA.renderTexture,
      ...mipOutputTextures,
    ],
    storages: {
      params: {
        struct: {
          bloomStrength: {
            type: 'f32',
            value: 1,
          },
          bloomRadius: {
            type: 'f32',
            value: 0.5,
          },
          // debug
          outputResult: {
            type: 'i32',
            value: 0,
          },
          bloomFactors: {
            type: 'array<f32>',
            value: bloomFactors,
          },
        },
      },
    },
    targets,
  })

  // raycasting
  // add/remove cube meshes to selective bloom on click
  const raycaster = new Raycaster(gpuCameraRenderer)

  const onPointerDown = (e) => {
    raycaster.setFromMouse(e)

    // notice we're raycasting the meshes parent recursively
    const intersections = raycaster.intersectObjects(cubeMeshes)

    if (intersections.length) {
      // highlight only the closest hit mesh
      intersections[0].object.uniforms.params.isMasked.value = !intersections[0].object.uniforms.params.isMasked.value

      // if the cube is affected by bloom, set its color to pure white
      if (!intersections[0].object.uniforms.params.isMasked.value) {
        intersections[0].object.uniforms.material.color.value.set(1)
      } else {
        intersections[0].object.uniforms.material.color.value.set(0.4)
      }
    } else {
      // reset every mesh isMasked value
      cubeMeshes.forEach((mesh) => {
        mesh.uniforms.params.isMasked.value = 1
        mesh.uniforms.material.color.value.set(0.4)
      })
    }
  }

  window.addEventListener('pointerdown', onPointerDown)

  // debug
  const gui = new lil.GUI({
    title: 'Compute selective bloom',
  })

  const brightnessFolder = gui.addFolder('Brightness extraction pass')
  brightnessFolder.add(computeBrightnessPass.uniforms.params.threshold, 'value', 0, 1, 0.01).name('Threshold')

  const gaussianFolder = gui.addFolder('Gaussian blur passes')

  gaussianFolder
    .add(gaussianParams, 'radius', 0, 15, 0.25)
    .onChange((value) => {
      blurComputeShaderPass.forEach((computePass) => {
        computePass.storages.params.radius.value = value
      })
    })
    .name('Radius')

  const compositeFolder = gui.addFolder('Composite pass')
  compositeFolder.add(compositePass.storages.params.bloomStrength, 'value', 0, 3, 0.1).name('Bloom strength')
  compositeFolder.add(compositePass.storages.params.bloomRadius, 'value', 0, 1.5, 0.05).name('Bloom radius')

  compositeFolder
    .add({ output: 0 }, 'output', { 'Composited result': 0, 'Original scene': 1, 'Bloom scene': 2 })
    .onChange((value) => {
      compositePass.storages.params.outputResult.value = value
    })
    .name('Output')
})
