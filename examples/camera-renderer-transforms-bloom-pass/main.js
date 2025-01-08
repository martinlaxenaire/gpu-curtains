import {
  BoxGeometry,
  GPUCameraRenderer,
  GPUDeviceManager,
  AmbientLight,
  DirectionalLight,
  getLambert,
  Mesh,
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
  const { camera } = gpuCameraRenderer

  // set the camera initial position and transform origin, so we can rotate around our scene center
  camera.position.z = systemSize * 4
  camera.transformOrigin.z = -camera.position.z

  // rotate camera each frame
  gpuDeviceManager.onBeforeRender(() => {
    camera.rotation.y += 0.01
  })

  // lights
  const ambientLight = new AmbientLight(gpuCameraRenderer, {
    intensity: 0.1,
  })

  const directionalLight = new DirectionalLight(gpuCameraRenderer, {
    position: new Vec3(systemSize, systemSize * 4, 0),
    intensity: 0.75,
  })

  // now add objects to our scene
  const cubeGeometry = new BoxGeometry()
  const sphereGeometry = new SphereGeometry()

  const meshFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @builtin(front_facing) frontFacing: bool,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
      @location(2) worldPosition: vec3f,
      @location(3) viewDirection: vec3f,
    };
    
    ${getLambert()}
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {      
      var color: vec3f = shading.color;
      
      // negate the normals if we're using front face culling
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let normal = normalize(faceDirection * fsInput.normal);
      
      let worldPosition = fsInput.worldPosition;
      let viewDirection = normalize(fsInput.viewDirection);
      
      // lambert
      color = getLambert(normal, worldPosition, color);
    
      return vec4(color, 1.0);
    }
  `

  const sphereColor1 = new Vec3(0, 1, 1)
  const sphereColor2 = new Vec3(1, 0, 1)
  const cubeColor = new Vec3(0.05)

  for (let i = 0; i < 50; i++) {
    const isCube = Math.random() > 0.5
    const mesh = new Mesh(gpuCameraRenderer, {
      label: isCube ? 'Cube ' + i : 'Sphere ' + i,
      geometry: isCube ? cubeGeometry : sphereGeometry,
      shaders: {
        fragment: {
          code: meshFs,
        },
      },
      uniforms: {
        shading: {
          struct: {
            color: {
              type: 'vec3f',
              value: isCube ? cubeColor : Math.random() > 0.5 ? sphereColor1 : sphereColor2,
            },
          },
        },
      },
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
  const scenePass = new ShaderPass(gpuCameraRenderer)

  // then the brigthness pass
  const brigthnessPassFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      
      var brightness: f32 = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      var result: vec4f = mix(vec4(0), color, step(params.threshold, brightness));
      
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
            value: 0.1375,
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
      var color: vec4f = scene + bloom * params.mult;
    
      // tone mapping
      var result: vec4f = vec4(1.0) - exp(-color * params.exposure);
    
      // also gamma correct while we're at it       
      result = pow(result, vec4(1.0 / params.gamma));
      
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
})
