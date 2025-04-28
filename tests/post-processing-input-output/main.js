// Post processing input/output target tests
// The goal is to render some objects into a separate input target (could be at a lower resolution)
// we apply a post processing pass (here we just invert colors) to that input target content and render to another output target
// we then use two gaussian blur passes (vertical/horizontal) using the output target as input, and another blur target as output
// we compose our final scene with a last post processing pass, where we blend the regular main buffer content with our blur output target
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { BoxGeometry, GPUCameraRenderer, GPUDeviceManager, RenderTarget, ShaderPass, Mesh, Vec2 } = await import(
    /* @vite-ignore */ path
  )

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
  const renderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container: document.querySelector('#canvas'),
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
  })

  // could be change later
  const inputQuality = 0.5

  const invertInputTarget = new RenderTarget(renderer, {
    label: 'Invert colors input target',
    qualityRatio: inputQuality,
  })

  const invertOutputTarget = new RenderTarget(renderer, {
    label: 'Invert colors output target',
    renderTextureName: 'invertedTexture',
    useDepth: false,
    sampleCount: 1,
  })

  const blurTarget = new RenderTarget(renderer, {
    label: 'Blur target',
    renderTextureName: 'blurTexture',
    useDepth: false,
    sampleCount: 1,
  })

  const cube1 = new Mesh(renderer, {
    label: 'Cube 1',
    geometry: new BoxGeometry(),
    outputTarget: invertInputTarget,
  })

  cube1.position.x = -3

  cube1.onBeforeRender(() => {
    cube1.rotation.y += 0.02
  })

  const cube2 = new Mesh(renderer, {
    label: 'Cube 2',
    geometry: new BoxGeometry(),
  })

  cube2.position.x = 3

  cube2.onBeforeRender(() => {
    cube2.rotation.y += 0.02
  })

  // post pro chain

  // first we will invert colors of cube1
  const invertPass = new ShaderPass(renderer, {
    label: 'Invert colors pass',
    inputTarget: invertInputTarget, // use our invert input target as input
    outputTarget: invertOutputTarget, // use our invert output target as output
    renderTextureName: 'sceneInputTexture',
    targets: [
      {
        blend: {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
          },
        },
      },
    ],
    shaders: {
      fragment: {
        code: /* wgsl */ `
          struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
          };

          @fragment fn main(fsInput: VSOutput) -> @location(0) vec4<f32> {
            let sceneSample = textureSample(sceneInputTexture, defaultSampler, fsInput.uv);
            return vec4(1.0 - vec3(sceneSample.rgb), sceneSample.a);
          }
        `,
      },
    },
  })

  // then a gaussian blur in 2 passes,
  // taking the inverted colors output target as input

  const gaussianBlurPassFs = /* wgsl */ `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
    };

    @fragment
    fn main(fsInput: VSOutput) -> @location(0) vec4f {
        let offsets = array<i32, 13>(-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6);
        let weights = array<f32, 13>(
            0.00916, 0.01979, 0.03877, 0.07030, 0.11588,
            0.16311, 0.18367,
            0.16311, 0.11588, 0.07030, 0.03877, 0.01979, 0.00916
          );

        let textureSize = vec2f(textureDimensions(invertedTexture));
        let texelSize: vec2f = 1.0 / textureSize;

        let sigma: f32 = params.sigma;
        let kernelRadius = i32(ceil(sigma * 3.0));
        var color = vec4f(0.0);
        var totalWeight = 0.0;

        for (var i = -kernelRadius; i <= kernelRadius; i++) {
            let offset = f32(i);
            let weight = exp(-0.5 * (offset / sigma) * (offset / sigma));
            let sampleUv = fsInput.uv + params.direction * texelSize * offset;

            color += textureSample(invertedTexture, defaultSampler, sampleUv) * weight;
            totalWeight += weight;
        }

        return color / totalWeight;
    }`

  // first pass
  const horizontalBlurPass = new ShaderPass(renderer, {
    label: 'Horizontal blur pass',
    inputTarget: invertOutputTarget, // input is our invert output target
    outputTarget: blurTarget, // output in a separate blur target
    renderTextureName: 'invertedTexture', // we'll be using it in next pass, so name must match invert target renderTexture
    copyOutputToRenderTexture: true, // copy the content of the pass to the invert target texture
    uniforms: {
      params: {
        struct: {
          direction: {
            type: 'vec2f',
            value: new Vec2(1, 0),
          },
          sigma: {
            type: 'f32',
            value: 6,
          },
        },
      },
    },
    shaders: {
      fragment: {
        code: gaussianBlurPassFs,
      },
    },
  })

  const verticalBlurPass = new ShaderPass(renderer, {
    label: 'Vertical blur pass',
    inputTarget: invertOutputTarget, // input is once again our invert output target
    outputTarget: blurTarget, // output in a separate blur target
    renderTextureName: 'invertedTexture', // we'll be using it in next pass, so name must match invertOutputTarget.renderTexture
    uniforms: {
      params: {
        struct: {
          direction: {
            type: 'vec2f',
            value: new Vec2(0, 1),
          },
          sigma: {
            type: 'f32',
            value: 6,
          },
        },
      },
    },
    shaders: {
      fragment: {
        code: gaussianBlurPassFs,
      },
    },
  })

  // final pass to blend original unmodified cube (main scene) with our inverted blurred one
  const finalPass = new ShaderPass(renderer, {
    label: 'Final pass',
    // use our blur target texture
    // it cannot be used as input target since we need the main scene as input
    textures: [blurTarget.renderTexture],
    shaders: {
      fragment: {
        code: /* wgsl */ `
          struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) uv: vec2f,
          };

          @fragment fn main(fsInput: VSOutput) -> @location(0) vec4<f32> {
            let sceneSample = textureSample(renderTexture, defaultSampler, fsInput.uv);
            let outputSample = textureSample(blurTexture, defaultSampler, fsInput.uv);
            return sceneSample + outputSample;
          }
        `,
      },
    },
  })

  console.log(invertOutputTarget, invertPass, finalPass)

  const gui = new lil.GUI({
    title: 'Chaining input/output passes',
  })

  gui
    .add({ quality: inputQuality }, 'quality', 0.1, 1, 0.05)
    .name('Input target quality')
    .onChange((value) => {
      invertInputTarget.setQualityRatio(value)
      invertPass.renderTexture.copy(invertInputTarget.renderTexture)
    })

  gui
    .add({ pixelRatio: renderer.pixelRatio }, 'pixelRatio', 0.5, 2, 0.1)
    .name('Renderer pixel ratio')
    .onChange((value) => {
      renderer.setPixelRatio(value)
    })
})
