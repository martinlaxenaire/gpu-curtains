// Goal of this test is checking if device lost/restoration works
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const {
    OrbitControls,
    AmbientLight,
    DirectionalLight,
    SphereGeometry,
    LitMesh,
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
    // MRT
    Mesh,
    Sampler,
    getLambert,
    Texture,
  } = await import(/* @vite-ignore */ path)

  const stats = new Stats()

  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.classList.add('stats')
  document.body.appendChild(stats.dom)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      featureLevel: 'compatibility',
    },
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  gpuDeviceManager
    .onBeforeRender(() => {
      stats.begin()
    })
    .onAfterRender(() => {
      stats.end()
    })

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
  })

  const systemSize = 10

  gpuCameraRenderer.camera.position.z = systemSize * 4

  // orbit controls
  const orbitControls = new OrbitControls({
    camera: gpuCameraRenderer.camera,
    element: gpuCameraRenderer.domElement.element,
  })

  // lights
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.2,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize, systemSize * 4, 0),
    intensity: 1.5,
  })

  const useMRT = true
  const useMipBlur = true

  const selectiveMRT = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective MRT',
    renderTextureName: 'selectiveRenderTexture',
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

  console.log(selectiveMRT)

  // two render targets that we'll be ping ponging
  const selectiveInputTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom input target',
    renderTextureName: 'selectiveRenderTexture',
    ...(!useMRT && {
      isPostTarget: true, // render objects to it after having renderer our main screen scene
      forceDepthLoadOp: 'load',
      depthTexture: gpuCameraRenderer.renderPass.depthTexture, // use main scene depth
    }),
    ...(useMRT && {
      useDepth: false,
    }),
  })

  const selectiveOutputTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom output target',
    renderTextureName: 'selectiveRenderTexture',
    ...(!useMRT && { depthTexture: gpuCameraRenderer.renderPass.depthTexture }),
    ...(useMRT && { useDepth: false }),
  })

  const mipBlurTexture = new Texture(gpuCameraRenderer, {
    name: 'mipBlurTexture',
    label: 'Mip blur texture',
    // generateMips: true,
    useMips: true,
  })

  const mipBlurTempTexture = new Texture(gpuCameraRenderer, {
    name: 'mipBlurTexture',
    label: 'Mip blur texture',
    // generateMips: true,
    useMips: true,
  })

  // render in linear space without tone mapping
  const outputOptions = {
    toneMapping: false,
    outputColorSpace: 'linear',
  }

  console.log(selectiveInputTarget)

  // const selectiveEntryPass = gpuCameraRenderer.scene.getRenderTargetPassEntry(selectiveInputTarget)
  // selectiveEntryPass.onBeforeRenderPass = () => {
  //   selectiveInputTarget.renderPass.setDepthLoadOp('load')
  // }

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const sphereColor1 = new Vec3(0, 1, 1)
  const sphereColor2 = new Vec3(1, 0, 1)
  const cubeColor = new Vec3(0.75)

  const meshPosition = new Vec3()

  if (!useMRT) {
    for (let i = 0; i < 75; i++) {
      const isCube = Math.random() > 0.5

      const rotationSpeed = Math.random() * 0.025
      meshPosition.set(
        Math.random() * systemSize * 2 - systemSize,
        Math.random() * systemSize * 2 - systemSize,
        Math.random() * systemSize * 2 - systemSize
      )

      if (isCube) {
        const mesh = new LitMesh(gpuCameraRenderer, {
          label: 'Cube ' + i,
          geometry: cubeGeometry,
          material: {
            shading: 'Lambert',
            color: cubeColor,
            ...outputOptions,
          },
        })

        mesh.position.copy(meshPosition)

        mesh.onBeforeRender(() => {
          mesh.rotation.y += rotationSpeed
          mesh.rotation.z += rotationSpeed
        })
      } else {
        const sphereColor = Math.random() > 0.5 ? sphereColor1 : sphereColor2

        const mesh = new LitMesh(gpuCameraRenderer, {
          label: 'Sphere ' + i,
          geometry: sphereGeometry,
          material: {
            shading: 'Lambert',
            color: sphereColor,
            ...outputOptions,
          },
        })

        mesh.position.copy(meshPosition)

        mesh.onBeforeRender(() => {
          mesh.rotation.y += rotationSpeed
          mesh.rotation.z += rotationSpeed
        })

        const bloomMesh = new LitMesh(gpuCameraRenderer, {
          label: 'Bloom sphere ' + i,
          geometry: sphereGeometry,
          outputTarget: selectiveInputTarget,
          material: {
            shading: 'Lambert',
            color: sphereColor,
            ...outputOptions,
          },
          depthCompare: 'less-equal',
          depthWriteEnabled: false,
        })

        bloomMesh.parent = mesh
      }
    }
  } else {
    const meshMRTFs = /* wgsl */ `
      struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };
    
    ${getLambert(outputOptions)}

    struct SelectiveMRTOutput {
      @location(0) mask : vec4<f32>,
      @location(1) scene : vec4<f32>,
    };

    // @fragment fn main(fsInput: VSOutput) -> SelectiveMRTOutput {
    //   var output: SelectiveMRTOutput;
    @fragment fn main(fsInput: VSOutput) -> {
      @location(0) mask : vec4<f32>,
      @location(1) scene : vec4<f32>
    } {
      //var output: SelectiveMRTOutput;

      let worldPosition = fsInput.worldPosition;
      let normal = fsInput.normal;

      let color = getLambert(normal, worldPosition, vec4(params.color, 1.0));

      var output;
      output.scene = color;
      output.mask = select(color, vec4(0.0), params.mask == 0);

      return output;
    }
    `

    for (let i = 0; i < 75; i++) {
      const isCube = Math.random() > 0.5

      const rotationSpeed = Math.random() * 0.025

      meshPosition.set(
        Math.random() * systemSize * 2 - systemSize,
        Math.random() * systemSize * 2 - systemSize,
        Math.random() * systemSize * 2 - systemSize
      )

      // const mesh = new Mesh(gpuCameraRenderer, {
      //   label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      //   geometry: isCube ? cubeGeometry : sphereGeometry,
      //   outputTarget: selectiveMRT,
      //   shaders: {
      //     fragment: {
      //       code: meshMRTFs,
      //     },
      //   },
      //   uniforms: {
      //     params: {
      //       struct: {
      //         color: {
      //           type: 'vec3f',
      //           value: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
      //         },
      //         mask: {
      //           type: 'i32',
      //           value: isCube ? 0 : 1,
      //         },
      //       },
      //     },
      //   },
      // })

      const mesh = new LitMesh(gpuCameraRenderer, {
        label: isCube ? 'Cube ' + i : 'Sphere ' + i,
        geometry: isCube ? cubeGeometry : sphereGeometry,
        outputTarget: selectiveMRT,
        material: {
          shading: 'Lambert',
          color: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
          toneMapping: false,
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
    }
  }

  const brightnessComputeShader = /* wgsl */ `
    @compute @workgroup_size(16, 16) fn main(
        @builtin(global_invocation_id) id: vec3<u32>
    ) {
      let dims = textureDimensions(renderTexture);

      if (id.x >= dims.x || id.y >= dims.y) {
        return;
      }

      let uv: vec2f = vec2(vec2f(id.xy) / vec2f(dims));

      let color = textureLoad(renderTexture, vec2<i32>(id.xy), 0u);

      let brightness: f32 = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      let result: vec4f = mix(vec4(0), color, step(params.threshold, brightness));

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
    uniforms: {
      params: {
        struct: {
          threshold: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
    ...(!useMRT && {
      inputTarget: selectiveInputTarget,
      outputTarget: selectiveOutputTarget,
    }),
    ...(useMRT && {
      inputTarget: selectiveMRT,
      outputTarget: selectiveOutputTarget,
    }),
  })

  console.log(computeBrightnessPass)

  const gaussianParams = {
    sigma: 5,
    radius: 6,
  }

  // let computeHorizontalBlurPass, computeVerticalBlurPass

  // if (useMipBlur) {
  //   const brightnessPassEntry = gpuCameraRenderer.scene.getObjectRenderPassEntry(computeBrightnessPass.shaderPass)

  //   brightnessPassEntry.onAfterRenderPass = (commandEncoder) => {
  //     gpuCameraRenderer.copyTextureToTexture(selectiveOutputTarget.renderTexture, mipBlurTexture, commandEncoder)
  //   }

  //   const mipBlurComputeShader = /* wgsl */ `
  //     @compute @workgroup_size(16, 16)
  //     fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  //         // We assume outputTexture is same size as mip level 0
  //         let dims = textureDimensions(storageRenderTexture);

  //         if (id.x >= dims.x || id.y >= dims.y) {
  //             return;
  //         }

  //         var color: vec4f = vec4f(0.0);

  //         let mipCount = textureNumLevels(mipBlurTexture);

  //         for (var mip: u32 = 0u; mip < mipCount; mip++) {
  //             // Compute scaled coordinates for current mip
  //             let mipDims = vec2f(textureDimensions(mipBlurTexture, mip));
  //             let uv = vec2f(id.xy) / vec2f(dims);
  //             let samplePos = vec2<i32>(uv * mipDims);

  //             color += textureLoad(mipBlurTexture, samplePos, mip);
  //         }

  //         textureStore(storageRenderTexture, vec2<i32>(id.xy), color * params.intensity);
  //     }
  //   `

  //   const computeMipBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
  //     label: 'Compute mip blur shader pass',
  //     shaders: {
  //       compute: {
  //         code: mipBlurComputeShader,
  //       },
  //     },
  //     textures: [mipBlurTexture],
  //     textureDispatchSize: [16, 16],
  //     uniforms: {
  //       params: {
  //         struct: {
  //           intensity: {
  //             type: 'f32',
  //             value: 0.2,
  //           },
  //         },
  //       },
  //     },
  //     outputTarget: selectiveInputTarget,
  //   })

  //   const upsampleComputeShader = /* wgsl */ `
  //     @compute @workgroup_size(16, 16)
  //     fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  //         // let dstDims = textureDimensions(storageRenderTexture);
  //         // if (id.x >= dstDims.x || id.y >= dstDims.y) { return; }

  //         // let uv = vec2f(id.xy) / vec2f(dstDims);

  //         // // // Sample from lower-res mip using normalized UV (bilinear AMPLIFIED by hardware)
  //         // // let blurred = textureSampleLevel(mipBlurTexture, defaultSampler, uv, 0.0);

  //         // // // Read current value (in case you're doing multi-pass upsample accumulation)
  //         // // var current = textureLoad(selectiveRenderTexture, vec2<i32>(id.xy), 0);

  //         // // // Add and write back
  //         // // textureStore(storageRenderTexture, vec2<i32>(id.xy), current + blurred * params.scale);

  //         // let mipCount = textureNumLevels(mipBlurTexture);

  //         // // var sum : vec4<f32> = vec4(0.0);

  //         // // for (var level : u32 = 0u; level < mipCount; level++) {
  //         // //   let contribution = f32((level + 1) / mipCount);

  //         // //   // Sample each mip level directly
  //         // //   sum += textureSampleLevel(mipBlurTexture, defaultSampler, uv, f32(level));
  //         // // }

  //         // // textureStore(storageRenderTexture, vec2<i32>(id.xy), sum);

  //         // // Start with lowest mip sample
  //         // // var blended = textureSampleLevel(
  //         // //     mipBlurTexture,
  //         // //     defaultSampler,
  //         // //     uv,
  //         // //     f32(mipCount - 1u)
  //         // // );

  //         // // // Upsample & accumulate
  //         // // for (var level : i32 = i32(mipCount) - 2; level >= 0; level--) {
  //         // //     let scale = pow(0.5, f32(i32(mipCount) - 1 - level));
  //         // //     let uvScaled = uv * scale;
  //         // //     blended += textureSampleLevel(mipBlurTexture, defaultSampler, uvScaled, f32(level));
  //         // // }

  //         // // textureStore(storageRenderTexture, vec2<i32>(id.xy), blended);

  //         // var blended = vec4<f32>(0.0);

  //         // for (var level : u32 = 0u; level < mipCount; level++) {
  //         //     let mipDims = vec2<f32>(textureDimensions(mipBlurTexture, level));
  //         //     let uvMip = (vec2<f32>(id.xy) + 0.5) / mipDims;   // <- This fixes stretching/banding
  //         //     blended += textureSampleLevel(mipBlurTexture, defaultSampler, uvMip, f32(level));
  //         // }

  //         // textureStore(storageRenderTexture, vec2<i32>(id.xy), blended);

  //         let fullDims = textureDimensions(storageRenderTexture);
  //         if (id.x >= fullDims.x || id.y >= fullDims.y) { return; }

  //         let uv = (vec2<f32>(id.xy)) / vec2<f32>(fullDims);
  //         let mipCount = textureNumLevels(mipBlurTexture);

  //         var blended = vec4<f32>(0.0);

  //         // for (var level : i32 = i32(mipCount) - 2; level >= 0; level--) {
  //         //   let contribution = f32((level + 1) / i32(mipCount - 1));

  //         //   blended += textureSampleLevel(mipBlurTexture, clampSampler, uv, f32(level)) * contribution;
  //         // }

  //         for (var level : u32 = 0u; level < mipCount; level++) {
  //           let contribution = 1.0 - f32((level + 1) / mipCount);

  //           // Sample each mip level directly
  //           blended += textureSampleLevel(mipBlurTexture, clampSampler, uv, f32(level)) * contribution;
  //         }

  //         textureStore(storageRenderTexture, vec2<i32>(id.xy), blended);
  //     }
  //   `

  //   const computeUpsamplePass = new ComputeShaderPass(gpuCameraRenderer, {
  //     label: 'Compute upsample shader pass',
  //     shaders: {
  //       compute: {
  //         code: upsampleComputeShader,
  //       },
  //     },
  //     textures: [mipBlurTexture, selectiveInputTarget.renderTexture],
  //     samplers: [
  //       new Sampler(gpuCameraRenderer, {
  //         label: 'Clamp sampler',
  //         name: 'clampSampler',
  //         addressModeU: 'clamp-to-edge',
  //         addressModeV: 'clamp-to-edge',
  //       }),
  //     ],
  //     textureDispatchSize: [16, 16],
  //     uniforms: {
  //       params: {
  //         struct: {
  //           scale: {
  //             type: 'f32',
  //             value: 1,
  //           },
  //         },
  //       },
  //     },
  //     outputTarget: selectiveOutputTarget,
  //   })
  // } else {
  const gaussianBlurComputePasses = /* wgsl */ `
    // example Gaussian weights for radius 2: [0.06136, 0.24477, 0.38774, 0.24477, 0.06136]
    // we'll sample offsets -2..+2
    const weights : array<f32,5> = array<f32,5>(
      0.06136, 0.24477, 0.38774, 0.24477, 0.06136
    );

    fn gaussianWeight(x: f32, sigma: f32) -> f32 {
      return exp(-0.5 * (x * x) / (sigma * sigma));
    }

    const gaussianCoefficients: array<f32, 7> = array<f32, 7>(
      0.0570, 0.0564, 0.0547, 0.0520, 0.0484, 0.0442, 0.0395
    );

    @compute @workgroup_size(16,8)
    fn horizontal(@builtin(global_invocation_id) gid : vec3<u32>) {
      let size = textureDimensions(storageRenderTexture);
      if (gid.x >= size.x || gid.y >= size.y) { return; }

      let uv = vec2f(gid.xy) + 0.5; // pixel center

      // var sum: vec4f = vec4f(0.0);
      // var weightSum: f32 = 0.0;

      // for (var i = -params.radius; i <= params.radius; i = i + 1) {
      //     let offset: vec2f = vec2f(f32(i), 0.0);

      //     let sampleUV = uv + offset;
      //     let w = gaussianWeight(f32(i), params.sigma);

      //     sum += textureLoad(renderTexture, vec2i(sampleUV), 0) * w;
      //     weightSum += w;
      // }

      // let result = sum / weightSum;

      var weightSum = gaussianCoefficients[0];
      var diffuseSum: vec3f = textureLoad(renderTexture, vec2i(uv), 0).rgb * weightSum;
      for( var i = 1; i < 7; i ++ ) {
          let x = f32(i);
          let w = gaussianCoefficients[i];
          let direction: vec2f = vec2f(f32(i), 0.0);
          let invSize: vec2f = vec2(0.0021, 0.0042); // TODO?
          let uvOffset: vec2f = direction * x * f32(params.radius) * 0.1;
          let sample1: vec3f = textureLoad(renderTexture, vec2i(uv + uvOffset), 0).rgb;
          let sample2: vec3f = textureLoad(renderTexture, vec2i(uv - uvOffset), 0).rgb;
          diffuseSum += (sample1 + sample2) * w;
          weightSum += 2.0 * w;
      }

      let result = vec4(diffuseSum / weightSum, 1.0);

      textureStore(storageRenderTexture, vec2i(gid.xy), result);
    }

    @compute @workgroup_size(8,16)
    fn vertical(@builtin(global_invocation_id) gid : vec3<u32>) {
      let size = textureDimensions(storageRenderTexture);
      if (gid.x >= size.x || gid.y >= size.y) { return; }

      let uv = vec2f(gid.xy) + 0.5; // pixel center

      // var sum: vec4f = vec4f(0.0);
      // var weightSum: f32 = 0.0;

      // for (var i = -params.radius; i <= params.radius; i = i + 1) {
      //     let offset: vec2f = vec2f(0.0, f32(i));

      //     let sampleUV = uv + offset;
      //     let w = gaussianWeight(f32(i), params.sigma);

      //     sum += textureLoad(renderTexture, vec2i(sampleUV), 0) * w;
      //     weightSum += w;
      // }

      // let result = sum / weightSum;

      var weightSum = gaussianCoefficients[0];
      var diffuseSum: vec3f = textureLoad(renderTexture, vec2i(uv), 0).rgb * weightSum;
      for( var i = 1; i < 7; i ++ ) {
          let x = f32(i);
          let w = gaussianCoefficients[i];
          let direction: vec2f = vec2f(0.0, f32(i));
          let invSize: vec2f = vec2(0.0021, 0.0042); // TODO?
          let uvOffset: vec2f = direction * x * f32(params.radius) * 0.1;
          let sample1: vec3f = textureLoad(renderTexture, vec2i(uv + uvOffset), 0).rgb;
          let sample2: vec3f = textureLoad(renderTexture, vec2i(uv - uvOffset), 0).rgb;
          diffuseSum += (sample1 + sample2) * w;
          weightSum += 2.0 * w;
      }

      let result = vec4(diffuseSum / weightSum, 1.0);

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
    uniforms: {
      params: {
        struct: {
          sigma: {
            type: 'f32',
            value: gaussianParams.sigma,
          },
          radius: {
            type: 'i32',
            value: gaussianParams.radius,
          },
        },
      },
    },
    inputTarget: selectiveOutputTarget,
    outputTarget: selectiveInputTarget,
  })

  console.log(computeHorizontalBlurPass)

  const computeVerticalBlurPass = new ComputeShaderPass(gpuCameraRenderer, {
    label: 'Compute vertical blur shader pass',
    shaders: {
      compute: {
        code: gaussianBlurComputePasses,
        entryPoint: 'vertical',
      },
    },
    textureDispatchSize: [8, 16],
    uniforms: {
      params: {
        struct: {
          sigma: {
            type: 'f32',
            value: gaussianParams.sigma,
          },
          radius: {
            type: 'i32',
            value: gaussianParams.radius,
          },
        },
      },
    },
    inputTarget: selectiveInputTarget,
    outputTarget: selectiveOutputTarget,
  })
  // }

  if (useMipBlur) {
    const gaussianPassEntry = gpuCameraRenderer.scene.getObjectRenderPassEntry(computeVerticalBlurPass.shaderPass)
    console.log(gaussianPassEntry)
    gaussianPassEntry.onAfterRenderPass = (commandEncoder) => {
      gpuCameraRenderer.copyTextureToTexture(selectiveOutputTarget.renderTexture, mipBlurTexture, commandEncoder)

      // TODO
      // gpuCameraRenderer.generateMips(mipBlurTexture, commandEncoder)

      const mipModule = gpuCameraRenderer.device.createShaderModule({
        label: 'textured quad shaders for mip level generation',
        code: /* wgsl */ `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            const gaussianCoefficients: array<f32, 7> = array<f32, 7>(
              0.0570, 0.0564, 0.0547, 0.0520, 0.0484, 0.0442, 0.0395
            );

            @fragment fn horizontal(fsInput: VSOutput) -> @location(0) vec4f {
              //return textureSample(ourTexture, ourSampler, fsInput.texcoord);
              let uv: vec2f = fsInput.texcoord;
              let textureSize = vec2f(textureDimensions(ourTexture));
              let texelSize: vec2f = 1.0 / textureSize;

              // var weightSum = gaussianCoefficients[0];
              // var diffuseSum: vec3f = textureSample(ourTexture, ourSampler, uv).rgb * weightSum;
              // for( var i = 1; i < 7; i ++ ) {
              //     let x = f32(i);
              //     let w = gaussianCoefficients[i];
              //     let direction: vec2f = vec2f(f32(i), 0.0);
              //     let uvOffset: vec2f = direction * x;
              //     let sample1: vec3f = textureSample(ourTexture, ourSampler, (uv + uvOffset) * texelSize).rgb;
              //     let sample2: vec3f = textureSample(ourTexture, ourSampler, (uv - uvOffset) * texelSize).rgb;
              //     diffuseSum += (sample1 + sample2) * w;
              //     weightSum += 2.0 * w;
              // }

              // return vec4(diffuseSum / weightSum, 1.0);

              let direction: vec2f = vec2f(1.0, 0.0);

              // Gaussian weights (5-tap example)
              let weights = array<f32, 5>(0.204164f, 0.304005f, 0.193783f, 0.072080f, 0.016538f);

              // UV-based offsets (relative blur spread)
              // These are multiplied by blurScale to define how strong the blur is.
              let offsets = array<f32, 5>(0.0, 1.0, 2.0, 3.0, 4.0);
              // let offsets = array<f32, 5>(0.0, 0.001, 0.003, 0.006, 0.01);

              // blur radius in UV space!
              let blurScale = direction * texelSize;

              var result : vec4f = vec4f(0.0);

              var weightSum = weights[0];

              // Sample center pixel
              result += textureSample(ourTexture, ourSampler, uv) * weightSum;

              // Sample mirrored offsets
              for (var i = 1u; i < 5u; i = i + 1u) {
                  // blur radius in UV space!
                  let offsetUV = vec2f(offsets[i]) * blurScale;

                  // result += textureSample(ourTexture, ourSampler, uv + offsetUV) * weights[i];
                  // result += textureSample(ourTexture, ourSampler, uv - offsetUV) * weights[i];

                  let w = weights[i];
                  let sample1 = textureSample(ourTexture, ourSampler, uv + offsetUV);
                  let sample2 = textureSample(ourTexture, ourSampler, uv - offsetUV);
                  result += (sample1 + sample2) * w;
                  weightSum += 2.0 * w;
              }

              return vec4(result / weightSum);
            }

            @fragment fn vertical(fsInput: VSOutput) -> @location(0) vec4f {
              //return textureSample(ourTexture, ourSampler, fsInput.texcoord);
              let uv: vec2f = fsInput.texcoord;
              let textureSize = vec2f(textureDimensions(ourTexture));
              let texelSize: vec2f = 1.0 / textureSize;

              // var weightSum = gaussianCoefficients[0];
              // var diffuseSum: vec3f = textureSample(ourTexture, ourSampler, uv).rgb * weightSum;
              // for( var i = 1; i < 7; i ++ ) {
              //     let x = f32(i);
              //     let w = gaussianCoefficients[i];
              //     let direction: vec2f = vec2f(0.0, f32(i));
              //     let uvOffset: vec2f = direction * x;
              //     let sample1: vec3f = textureSample(ourTexture, ourSampler, (uv + uvOffset) * texelSize).rgb;
              //     let sample2: vec3f = textureSample(ourTexture, ourSampler, (uv - uvOffset) * texelSize).rgb;
              //     diffuseSum += (sample1 + sample2) * w;
              //     weightSum += 2.0 * w;
              // }

              // return vec4(diffuseSum / weightSum, 1.0);

              let direction: vec2f = vec2f(0.0, 1.0);

              // Gaussian weights (5-tap example)
              let weights = array<f32, 5>(0.204164f, 0.304005f, 0.193783f, 0.072080f, 0.016538f);

              // UV-based offsets (relative blur spread)
              // These are multiplied by blurScale to define how strong the blur is.
              let offsets = array<f32, 5>(0.0, 1.0, 2.0, 3.0, 4.0);
              //let offsets = array<f32, 5>(0.0, 0.001, 0.003, 0.006, 0.01);

              // blur radius in UV space!
              let blurScale = direction * texelSize;

              var result : vec4f = vec4f(0.0);

              var weightSum = weights[0];

              // Sample center pixel
              result += textureSample(ourTexture, ourSampler, uv) * weightSum;

              // Sample mirrored offsets
              for (var i = 1u; i < 5u; i = i + 1u) {
                  let offsetUV = vec2f(offsets[i]) * blurScale;

                  // result += textureSample(ourTexture, ourSampler, uv + offsetUV) * weights[i];
                  // result += textureSample(ourTexture, ourSampler, uv - offsetUV) * weights[i];
                  let w = weights[i];
                  let sample1 = textureSample(ourTexture, ourSampler, uv + offsetUV);
                  let sample2 = textureSample(ourTexture, ourSampler, uv - offsetUV);
                  result += (sample1 + sample2) * w;
                  weightSum += 2.0 * w;
              }

              return vec4(result / weightSum);
            }
          `,
      })

      const mipSampler = gpuCameraRenderer.device.createSampler({
        minFilter: 'linear',
        magFilter: 'linear',
      })

      const horizontalPipeline = gpuCameraRenderer.device.createRenderPipeline({
        label: 'Mip level horizontal blur pipeline',
        layout: 'auto',
        vertex: {
          module: mipModule,
        },
        fragment: {
          module: mipModule,
          entryPoint: 'horizontal',
          targets: [{ format: mipBlurTexture.texture.format }],
        },
      })

      const verticalPipeline = gpuCameraRenderer.device.createRenderPipeline({
        label: 'Mip level horizontal blur pipeline',
        layout: 'auto',
        vertex: {
          module: mipModule,
        },
        fragment: {
          module: mipModule,
          entryPoint: 'vertical',
          targets: [{ format: mipBlurTexture.texture.format }],
        },
      })

      // now render
      let width = mipBlurTexture.texture.width
      let height = mipBlurTexture.texture.height
      let baseMipLevel = 0
      while (width > 1 || height > 1) {
        width = Math.max(1, (width / 2) | 0)
        height = Math.max(1, (height / 2) | 0)

        for (let layer = 0; layer < mipBlurTexture.texture.depthOrArrayLayers; ++layer) {
          const horizontalBindGroup = gpuCameraRenderer.device.createBindGroup({
            layout: horizontalPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: mipSampler },
              {
                binding: 1,
                resource: mipBlurTexture.texture.createView({
                  dimension: '2d',
                  baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
              },
            ],
          })

          const verticalBindGroup = gpuCameraRenderer.device.createBindGroup({
            layout: verticalPipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: mipSampler },
              {
                binding: 1,
                resource: mipBlurTempTexture.texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel + 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
              },
            ],
          })

          // const renderPassDescriptor = {
          //   label: 'Mip generation render pass',
          //   colorAttachments: [
          //     {
          //       view: mipBlurTexture.texture.createView({
          //         dimension: '2d',
          //         baseMipLevel: baseMipLevel + 1,
          //         mipLevelCount: 1,
          //         baseArrayLayer: layer,
          //         arrayLayerCount: 1,
          //       }),
          //       loadOp: 'clear',
          //       storeOp: 'store',
          //     },
          //   ],
          // }

          const horizontalPass = commandEncoder.beginRenderPass({
            label: 'Mip generation horizontal blur pass',
            colorAttachments: [
              {
                view: mipBlurTempTexture.texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel + 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          })
          horizontalPass.setPipeline(horizontalPipeline)
          horizontalPass.setBindGroup(0, horizontalBindGroup)
          horizontalPass.draw(6) // call our vertex shader 6 times
          horizontalPass.end()

          const verticalPass = commandEncoder.beginRenderPass({
            label: 'Mip generation vertical blur pass',
            colorAttachments: [
              {
                view: mipBlurTexture.texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel + 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'load',
                storeOp: 'store',
              },
            ],
          })
          verticalPass.setPipeline(verticalPipeline)
          verticalPass.setBindGroup(0, verticalBindGroup)
          verticalPass.draw(6) // call our vertex shader 6 times

          verticalPass.end()
        }
        ++baseMipLevel
      }
    }
  }

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
      
      @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
        let originalScene: vec4f = textureSample(sceneTexture, defaultSampler, fsInput.uv);   
        //let bloomScene: vec4f = textureSample(selectiveRenderTexture, defaultSampler, fsInput.uv);

        var bloomScene: vec4f;

        let mipCount = textureNumLevels(mipBlurTexture);
        for (var level : u32 = 0u; level < mipCount; level++) {
          let contribution = 1.0 - f32((level + 1) / mipCount);

          // Sample each mip level directly
          bloomScene += textureSampleLevel(mipBlurTexture, defaultSampler, fsInput.uv, f32(level)) * contribution;
        }

        var result: vec4f = originalScene + bloomScene * params.strength;

        if(params.outputResult == 1) {
          result = originalScene;
        } else if(params.outputResult == 2) {
          result = bloomScene;
        }

        // tone mapping
        result = vec4(KhronosToneMapping(result.rgb), result.a);
        result = linearTosRGB_4(result);
        
        return result;
      }
    `

  let sceneTexture

  if (useMRT) {
    sceneTexture = new Texture(gpuCameraRenderer, {
      label: 'MRT scene texture',
      name: 'sceneTexture',
      fromTexture: selectiveMRT.outputTextures[1],
    })
  }

  const compositePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Composite pass',
    shaders: {
      fragment: {
        code: compositePassFs,
      },
    },
    ...(!useMRT && {
      renderTextureName: 'sceneTexture',
      textures: [selectiveOutputTarget.renderTexture, mipBlurTexture],
    }),
    ...(useMRT && {
      textures: [sceneTexture, selectiveOutputTarget.renderTexture, mipBlurTexture],
    }),
    uniforms: {
      params: {
        struct: {
          strength: {
            type: 'f32',
            value: 1,
          },
          outputResult: {
            type: 'i32',
            value: 0,
          },
        },
      },
    },
  })

  const gui = new lil.GUI({
    title: 'Compute selective bloom',
  })

  const brightnessFolder = gui.addFolder('Brightness extraction pass')
  brightnessFolder.add(computeBrightnessPass.uniforms.params.threshold, 'value', 0, 1, 0.01).name('Threshold')

  const gaussianFolder = gui.addFolder('Gaussian blur passes')
  gaussianFolder
    .add(gaussianParams, 'sigma', 1, 15, 1)
    .onChange((value) => {
      computeHorizontalBlurPass.uniforms.params.sigma.value = value
      computeVerticalBlurPass.uniforms.params.sigma.value = value
    })
    .name('Sigma')

  gaussianFolder
    .add(gaussianParams, 'radius', 1, 50, 1)
    .onChange((value) => {
      computeHorizontalBlurPass.uniforms.params.radius.value = value
      computeVerticalBlurPass.uniforms.params.radius.value = value
    })
    .name('Radius')

  const compositeFolder = gui.addFolder('Composite pass')
  compositeFolder.add(compositePass.uniforms.params.strength, 'value', 0, 1.5, 0.1).name('Bloom strength')

  compositeFolder
    .add({ output: 0 }, 'output', { 'Composited result': 0, 'Original scene': 1, 'Bloom scene': 2 })
    .onChange((value) => {
      compositePass.uniforms.params.outputResult.value = value
    })
    .name('Output')
})
