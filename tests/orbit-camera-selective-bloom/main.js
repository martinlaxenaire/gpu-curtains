import {
  GPUCameraRenderer,
  Vec2,
  Vec3,
  BoxGeometry,
  SphereGeometry,
  Mesh,
  GPUDeviceManager,
  ShaderPass,
  RenderTarget,
} from '../../src/index.js'

window.addEventListener('load', async () => {
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
  })

  // get the camera
  const { camera } = gpuCameraRenderer

  console.log(camera)

  // each time we'll change the camera position, we'll update its transform origin as well
  // that way it will act as an orbit camera
  const cameraPosition = new Vec3().onChange(() => {
    camera.position.copy(cameraPosition)
    camera.transformOrigin.set(-1 * cameraPosition.x, -1 * cameraPosition.y, -1 * cameraPosition.z)
  })

  // set the camera initial position
  cameraPosition.z = systemSize * 4

  // render our scene manually
  const animate = () => {
    //camera.rotation.y += 0.01
    gpuDeviceManager.render()

    requestAnimationFrame(animate)
  }

  animate()

  // now the orbit controls
  const mouse = {
    current: new Vec2(Infinity),
    last: new Vec2(Infinity),
    delta: new Vec2(),
    isDown: false,
  }

  window.addEventListener('touchstart', () => {
    mouse.isDown = true
  })
  window.addEventListener('mousedown', () => {
    mouse.isDown = true
  })

  window.addEventListener('touchend', () => {
    mouse.isDown = false
    mouse.last.set(Infinity)
  })
  window.addEventListener('mouseup', () => {
    mouse.isDown = false
    mouse.last.set(Infinity)
  })

  window.addEventListener('pointermove', (e) => {
    if (!mouse.isDown) return

    mouse.current.set(e.clientX, e.clientY)

    if (mouse.last.x === Infinity) {
      mouse.last.copy(mouse.current)
    }

    mouse.delta.set(mouse.current.x - mouse.last.x, mouse.current.y - mouse.last.y)

    camera.rotation.y -= mouse.delta.x * 0.01
    camera.rotation.x -= mouse.delta.y * 0.01 * Math.sign(Math.cos(camera.rotation.y))

    mouse.last.copy(mouse.current)
  })

  window.addEventListener('wheel', (e) => {
    const newPosition = cameraPosition.clone().multiplyScalar(1 + Math.sign(e.deltaY) * 0.1)

    // max zoom
    if (newPosition.length() <= systemSize * 6) {
      cameraPosition.copy(newPosition)
    }
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const selectiveBloomTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Selective bloom render target',
  })

  const blankRenderTarget = new RenderTarget(gpuCameraRenderer, {
    label: 'Blank render target',
    depthLoadOp: 'load',
  })

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5
    const mesh = new Mesh(gpuCameraRenderer, {
      geometry: isCube ? cubeGeometry : sphereGeometry,
      renderTarget: isCube ? blankRenderTarget : selectiveBloomTarget,
    })

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = Math.random() * 0.025

    mesh.onRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }

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
    renderTarget: selectiveBloomTarget,
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
  })

  const blurSettings = {
    spread: 10,
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
    renderTarget: selectiveBloomTarget,
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
    renderTarget: selectiveBloomTarget,
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
    // blend: {
    //   color: {
    //     srcFactor: 'one',
    //     dstFactor: 'one',
    //   },
    //   alpha: {
    //     srcFactor: 'one',
    //     dstFactor: 'one',
    //   },
    // },
  })

  vBlurPass.onAfterResize(() => {
    vBlurPass.storages.params.spread.value =
      (blurSettings.spread * gpuCameraRenderer.boundingRect.width) / gpuCameraRenderer.boundingRect.height
  })

  const blankPass = new ShaderPass(gpuCameraRenderer, {
    renderTarget: blankRenderTarget,
    //transparent: true,
    blend: {
      color: {
        operation: 'add',
        srcFactor: 'src-alpha',
        dstFactor: 'one-minus-src-alpha',
      },
      alpha: {
        operation: 'add',
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha',
      },
    },
  })

  // not needed anymore!
  // const blankPassSceneEntry = gpuCameraRenderer.scene.getObjectRenderPassEntry(blankPass)
  // blankPassSceneEntry.onBeforeRenderPass = (commandEncoder) => {
  //   // copy the selective bloom depth texture content (i.e. the spheres) into our blank render target depth texture
  //   commandEncoder.copyTextureToTexture(
  //     {
  //       texture: selectiveBloomTarget.renderPass.depthTexture,
  //     },
  //     {
  //       texture: blankRenderTarget.renderPass.depthTexture,
  //     },
  //     [blankRenderTarget.renderPass.depthTexture.width, blankRenderTarget.renderPass.depthTexture.height]
  //   )
  //   // tell our blank render target render pass not to clear its depth texture before drawing the cubes
  //   blankRenderTarget.renderPass.setDepthLoadOp('load')
  // }

  // const postProShader = /* wgsl */ `
  //   struct VSOutput {
  //       @builtin(position) position: vec4f,
  //       @location(0) uv: vec2f,
  //     };
  //
  //     @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  //       var texture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
  //
  //       return mix( vec4(texture.rgb, texture.a), vec4(1.0 - texture.rgb, texture.a), step(fsInput.uv.x, 0.5) );
  //     }
  // `
  //
  // const postProPass = new ShaderPass(gpuCameraRenderer, {
  //   shaders: {
  //     fragment: {
  //       code: postProShader,
  //     },
  //   },
  // })

  console.log(gpuCameraRenderer)
})
