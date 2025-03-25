// Basic rotating cube for most simple tests
window.addEventListener('load', async () => {
  const path = location.hostname === 'localhost' ? '../../src/index.ts' : '../../dist/esm/index.mjs'
  const { GPUCameraRenderer, GPUDeviceManager, PingPongPlane, FullscreenPlane, MediaTexture, Texture, Sampler } =
    await import(/* @vite-ignore */ path)

  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  const container = document.querySelector('#canvas')

  // create a camera renderer
  const gpuCameraRenderer = new GPUCameraRenderer({
    deviceManager: gpuDeviceManager,
    container,
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
    renderPass: {
      // no depth, sample count of 1
      useDepth: false,
      sampleCount: 1,
    },
  })

  const mediaStreamTexture = new MediaTexture(gpuCameraRenderer, {
    label: 'Webcam texture',
    name: 'webcamTexture',
    useExternalTextures: false, // we could use an external texture but we'd have to render in a render target and use the output
    generateMips: false,
    useTransform: true, // responsive
  })

  const previousFrameTexture = new Texture(gpuCameraRenderer, {
    label: 'Previous frame texture',
    name: 'previousTexture',
    generateMips: false,
    format: mediaStreamTexture.options.format, // should be 'rgba8unorm'
    fixedSize: {
      // will be resized when media stream is loaded
      width: 1,
      height: 1,
    },
  })

  mediaStreamTexture.onAllSourcesLoaded(() => {
    // resize previous frame texture
    // will be copied after scene render
    previousFrameTexture.setSize(mediaStreamTexture.size)
  })

  // after rendering the scene, copy the webcam texture to previous frame texture
  gpuCameraRenderer.onAfterRenderScene.add((commandEncoder) => {
    gpuCameraRenderer.copyTextureToTexture(mediaStreamTexture, previousFrameTexture, commandEncoder)
  })

  const video = document.createElement('video')
  const stream = navigator.mediaDevices
    .getUserMedia({
      video: true,
    })
    .then((returnedStream) => {
      video.srcObject = returnedStream
      video.play()

      mediaStreamTexture.useVideo(video)
    })

  const vs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) webcamUv: vec2f,
  };

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {
    var vsOutput: VSOutput;

    vsOutput.position = vec4f(attributes.position, 1.0);
    vsOutput.uv = attributes.uv;
    vsOutput.webcamUv = getUVCover(attributes.uv, texturesMatrices.webcamTexture.matrix);
    
    return vsOutput;
  }`

  // use a ping pong plane for the effect
  const pingPongShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) webcamUv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var webcamColor: vec4f = textureSample(webcamTexture, defaultSampler, fsInput.webcamUv);
      var previousColor: vec4f = textureSample(previousTexture, defaultSampler, fsInput.uv);

      // first pass, just copy webcam color
      if(length(previousColor) == 0.0) {
        previousColor = webcamColor;
      }

      // compare previous and current frames colors
      let colorDifference: vec3f = smoothstep(vec3(0.0), vec3(1.0), abs(previousColor.rgb - webcamColor.rgb));

      let color: vec4f = vec4(
        vec3(
          mix(
            vec3(0.0),
            vec3(fsInput.uv.x, fsInput.uv.y, 0.0),
            colorDifference
          )
        ),
        webcamColor.a
      );

      var growingUv = fsInput.uv * 2.0 - 1.0;
      growingUv /= params.growStrength;
      growingUv = growingUv * 0.5 + 0.5; 

      var outputColor: vec4f = textureSample(renderTexture, defaultSampler, growingUv);

      outputColor += color;

      outputColor *= params.dissipation;

      return outputColor;
    }
    `

  const pingPongPlane = new PingPongPlane(gpuCameraRenderer, {
    label: 'Ping pong webcam media stream plane',
    shaders: {
      vertex: {
        code: vs,
      },
      fragment: {
        code: pingPongShader,
      },
    },
    targets: [
      {
        format: 'rgba16float', // important, we'll be using floating point textures
      },
    ],
    textures: [mediaStreamTexture, previousFrameTexture],
    uniforms: {
      params: {
        visibility: ['fragment'],
        struct: {
          growStrength: {
            type: 'f32',
            value: 1.025,
          },
          dissipation: {
            type: 'f32',
            value: 0.95,
          },
        },
      },
    },
  })

  // render everything on a fullscreen plane
  const renderShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) webcamUv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      let pingPongTexture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      var displacement: vec2f = vec2(-pingPongTexture.r, pingPongTexture.g);

      var webcamColor: vec4f = textureSample(webcamTexture, clampSampler, fsInput.webcamUv + displacement * params.displacementStrength);

      // debug ping pong output
      // return pingPongTexture;
      return webcamColor;
    }`

  const clampSampler = new Sampler(gpuCameraRenderer, {
    label: 'Clamp sampler',
    name: 'clampSampler',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  const fullscreenPlane = new FullscreenPlane(gpuCameraRenderer, {
    label: 'Fullscreen render plane',
    shaders: {
      vertex: {
        code: vs,
      },
      fragment: {
        code: renderShader,
      },
    },
    textures: [mediaStreamTexture, pingPongPlane.renderTexture],
    samplers: [clampSampler],
    uniforms: {
      params: {
        visibility: ['fragment'],
        struct: {
          displacementStrength: {
            type: 'f32',
            value: 0.1,
          },
        },
      },
    },
  })
})
