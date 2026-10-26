import {
  Object3D,
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  AmbientLight,
  DirectionalLight,
  LitMesh,
  ShaderPass,
  SphereGeometry,
  Vec3,
} from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // here is an example of how we can use a GPUDeviceManager and a simple GPUCameraRenderer instead of the whole GPUCurtains package
  // this shows us how to use gpu-curtains as a basic genuine 3D engine, not specifically related to DOM objects
  const systemSize = 10

  // first, we need a WebGPU device, that's what GPUDeviceManager is for
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
    adapterOptions: {
      minFeatureLevel: 'compatibility',
    },
    onError: () => {
      // handle device creation error here
      console.log('there has been an error!')
    },
  })

  // we need to wait for the device to be created
  await gpuDeviceManager.init()

  // then we can create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager, // the renderer is going to use our WebGPU device to create its context
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    camera: {
      near: systemSize,
      far: systemSize * 6,
    },
  })

  // get the camera
  const { camera, scene } = gpuCameraRenderer

  // set the camera initial position and transform origin, so we can rotate around our scene center
  camera.position.z = systemSize * 4
  camera.transformOrigin.z = -camera.position.z

  const pivot = new Object3D()
  pivot.parent = scene

  // rotate pivot each frame
  gpuDeviceManager.onBeforeRender(() => {
    pivot.rotation.y -= 0.01
  })

  // lights
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.45,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize, systemSize * 4, 0),
    intensity: 2,
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const sphereColor1 = new Vec3(0, 1, 1)
  const sphereColor2 = new Vec3(1, 0, 1)
  const cubeColor = new Vec3(0.75)

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5
    const mesh = new LitMesh(gpuCameraRenderer, {
      label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      material: {
        shading: 'Lambert',
        color: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
      },
    })

    mesh.parent = pivot

    mesh.position.x = Math.random() * systemSize * 2 - systemSize
    mesh.position.y = Math.random() * systemSize * 2 - systemSize
    mesh.position.z = Math.random() * systemSize * 2 - systemSize

    const rotationSpeed = Math.random() * 0.025

    mesh.onBeforeRender(() => {
      mesh.rotation.y += rotationSpeed
      mesh.rotation.z += rotationSpeed
    })
  }

  // bloom ported from https://gist.github.com/greggman/56ac45885fa7245707c5e649b0fa8879
  // and https://learnopengl.com/Advanced-Lighting/Bloom

  // we are going to need 5 separate passes for the bloom effect
  // (in fact we could have combined steps 1. and 2. with a MRT...)
  // 1. render the scene in a first pass
  // 2. extract the brightness of the scene
  // 3. perform an horizontal blur on previous pass result (brigthness threshold)
  // 4. perform a vertical blur on previous pass result
  // 5. blend the original scene pass with the previous pass result (bloom)

  // first scene pass
  const scenePass = new ShaderPass(gpuCameraRenderer, {
    label: 'Scene pass',
  })

  // then the brigthness pass
  const brigthnessPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      let color: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);

      let brightness = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
      let contribution = max(brightness - params.threshold, 0.0) / max(brightness, 1e-5);
      let result = vec4f(color.rgb * contribution, color.a * contribution);

      return result;
    }
  `

  const brightnessPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Brightness pass',
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
            value: 0.05,
          },
        },
      },
    },
    targets: [
      {
        blend: {
          color: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
          alpha: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
        },
      },
    ],
  })

  // horizontal blur pass
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

  const blurSettings = {
    spread: 2 * gpuCameraRenderer.pixelRatio,
    weight: new Float32Array([0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216]),
  }

  const hBlurPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Horizontal blur pass',
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
    targets: [
      {
        blend: {
          color: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
          alpha: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
        },
      },
    ],
  })

  // vertical blur pass
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

  const vBlurPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Vertical blur pass',
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
    targets: [
      {
        blend: {
          color: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
          alpha: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
        },
      },
    ],
  })

  vBlurPass.onAfterResize(() => {
    vBlurPass.storages.params.spread.value =
      (blurSettings.spread * gpuCameraRenderer.boundingRect.width) / gpuCameraRenderer.boundingRect.height
  })

  // blend pass: blend the original scene pass with the bloom result
  const blendPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var scene: vec4f = textureSample(sceneTexture, defaultSampler, fsInput.uv);
      var bloom: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      var result: vec4f = vec4(scene.rgb + bloom.rgb * params.mult, scene.a);

      if(params.outputResult == 1) {
        result = scene;
      } else if(params.outputResult == 2) {
        result = bloom;
      }

      return result;
    }
  `

  const blendPass = new ShaderPass(gpuCameraRenderer, {
    label: 'Blend pass',
    shaders: {
      fragment: {
        code: blendPassFs,
      },
    },
    uniforms: {
      params: {
        struct: {
          mult: {
            type: 'f32',
            value: 1,
          },
          // debug
          outputResult: {
            type: 'i32',
            value: 0,
          },
        },
      },
    },
    targets: [
      {
        blend: {
          color: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
          alpha: {
            operation: 'add',
            srcFactor: 'one',
            dstFactor: 'one',
          },
        },
      },
    ],
  })

  // pass the original scene pass result to our blend pass
  blendPass.createTexture({
    label: 'Scene texture',
    name: 'sceneTexture',
    visibility: ['fragment'],
    fromTexture: scenePass.renderTexture,
  })

  // debug
  const gui = new lil.GUI({
    title: 'Compute selective bloom',
  })

  const brightnessFolder = gui.addFolder('Brightness extraction pass')
  brightnessFolder.add(brightnessPass.uniforms.params.threshold, 'value', 0, 1, 0.01).name('Threshold')

  const blendFolder = gui.addFolder('Blend pass')

  blendFolder
    .add({ output: 0 }, 'output', { 'Composited result': 0, 'Original scene': 1, 'Bloom scene': 2 })
    .onChange((value) => {
      blendPass.uniforms.params.outputResult.value = value
    })
    .name('Output')
})
