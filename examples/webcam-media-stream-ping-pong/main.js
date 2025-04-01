import {
  GPURenderer,
  GPUDeviceManager,
  PingPongPlane,
  FullscreenPlane,
  MediaTexture,
  Vec3,
  Texture,
  Sampler,
} from '../../dist/esm/index.mjs'

// demonstrates how to use a media stream as a video texture
window.addEventListener('load', async () => {
  // create a device manager
  const gpuDeviceManager = new GPUDeviceManager({
    label: 'Custom device manager',
  })

  // wait for the device to be created
  await gpuDeviceManager.init()

  const container = document.querySelector('#canvas')

  // create a camera renderer
  const renderer = new GPURenderer({
    deviceManager: gpuDeviceManager,
    container,
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
    renderPass: {
      // no depth, sample count of 1
      useDepth: false,
      sampleCount: 1,
    },
  })

  const mediaStreamTexture = new MediaTexture(renderer, {
    label: 'Webcam texture',
    name: 'webcamTexture',
    useExternalTextures: false, // we could use an external texture but we'd have to render in a render target and use the output
    generateMips: false,
    useTransform: true, // we'll make the webcam feed fit the screen
  })

  const setMediaTextureScale = () => {
    const screenRatio = renderer.boundingRect.width / renderer.boundingRect.height
    const textureRatio = mediaStreamTexture.size.width / mediaStreamTexture.size.height

    if (screenRatio > textureRatio) {
      mediaStreamTexture.scale.set(1, textureRatio / screenRatio)
    } else {
      mediaStreamTexture.scale.set(screenRatio / textureRatio, 1)
    }
  }

  mediaStreamTexture.transformOrigin.set(0.5)

  mediaStreamTexture.onAllSourcesLoaded(() => {
    // resize previous frame texture
    // will be copied after scene render
    previousFrameTexture.setSize(mediaStreamTexture.size)

    setMediaTextureScale()
  })

  const previousFrameTexture = new Texture(renderer, {
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

  // after rendering the scene, copy the webcam texture to previous frame texture
  renderer.onAfterRenderScene.add((commandEncoder) => {
    renderer.copyTextureToTexture(mediaStreamTexture, previousFrameTexture, commandEncoder)
  })

  // start webcam stream
  const video = document.createElement('video')
  navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: { facingMode: 'user' },
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
      var previousColor: vec4f = textureSample(previousTexture, defaultSampler, fsInput.webcamUv);

      // first pass, just copy webcam color
      if(length(previousColor) == 0.0) {
        previousColor = webcamColor;
      }

      // compare previous and current frames colors
      let colorDifference: vec3f = smoothstep(vec3(params.minColorDifference), vec3(params.maxColorDifference), abs(previousColor.rgb - webcamColor.rgb));

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
      growingUv /= params.growSpeed;
      growingUv = growingUv * 0.5 + 0.5; 

      var outputColor: vec4f = textureSample(renderTexture, defaultSampler, growingUv);

      outputColor += color;

      outputColor *= params.dissipation;

      return outputColor;
    }
    `

  const pingPongPlane = new PingPongPlane(renderer, {
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
          growSpeed: {
            type: 'f32',
            value: 1.025,
          },
          dissipation: {
            type: 'f32',
            value: 0.9,
          },
          minColorDifference: {
            type: 'f32',
            value: 0.05,
          },
          maxColorDifference: {
            type: 'f32',
            value: 0.85,
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
      var pingPongTexture: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      var displacement: vec2f = vec2(-pingPongTexture.r, pingPongTexture.g);

      var webcamColor: vec4f = textureSample(webcamTexture, clampSampler, fsInput.webcamUv + displacement * params.displacementStrength);

      // get a B&W version of our image texture
      var grayscale: vec3f = vec3(webcamColor.r * 0.3 + webcamColor.g * 0.59 + webcamColor.b * 0.11);
      var textureBW: vec4f = vec4(grayscale, 1.0);
      textureBW = mix(textureBW, textureBW * vec4(params.blue, 1.0), pow(abs(displacement.x), 0.5));
      textureBW = mix(textureBW, textureBW * vec4(params.pink, 1.0), pow(abs(displacement.y), 0.5));

      // mix the BW image and the colored one based on our flowmap color values
      var mixValue: f32 = smoothstep(0.0, 1.0, saturate(length(displacement) * params.colorMixStrength));
      webcamColor = mix(webcamColor, textureBW, mixValue);

      return select(webcamColor, pingPongTexture, params.outputPingPongTexture > 0);
    }`

  const clampSampler = new Sampler(renderer, {
    label: 'Clamp sampler',
    name: 'clampSampler',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  const blue = new Vec3(0, 1, 1)
  const pink = new Vec3(1, 0, 1)

  const fullscreenPlane = new FullscreenPlane(renderer, {
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
            value: 0.2,
          },
          blue: {
            type: 'vec3f',
            value: blue,
          },
          pink: {
            type: 'vec3f',
            value: pink,
          },
          colorMixStrength: {
            type: 'f32',
            value: 3,
          },
          outputPingPongTexture: {
            type: 'i32',
            value: 0,
          },
        },
      },
    },
  })

  fullscreenPlane.onAfterResize(() => {
    setMediaTextureScale()
  })

  const gui = new lil.GUI({
    title: 'Webcam media stream settings',
  })

  gui.close()

  const pingPongFolder = gui.addFolder('Ping pong plane')

  pingPongFolder.add(pingPongPlane.uniforms.params.growSpeed, 'value', 1, 1.2, 0.005).name('Ripples grow speed')
  pingPongFolder
    .add(pingPongPlane.uniforms.params.dissipation, 'value', 0.75, 0.995, 0.005)
    .name('Ripples dissipation speed')

  pingPongFolder
    .add(pingPongPlane.uniforms.params.minColorDifference, 'value', 0, 1, 0.005)
    .name('Min color difference')
  pingPongFolder
    .add(pingPongPlane.uniforms.params.maxColorDifference, 'value', 0, 1, 0.005)
    .name('Max color difference')

  const renderFolder = gui.addFolder('Render plane')

  renderFolder
    .add(fullscreenPlane.uniforms.params.displacementStrength, 'value', 0, 0.5, 0.01)
    .name('Displacement strength')
  renderFolder.add(fullscreenPlane.uniforms.params.colorMixStrength, 'value', 0, 10, 0.1).name('Color mix strength')

  renderFolder
    .add({ debugTexture: !!fullscreenPlane.uniforms.params.outputPingPongTexture.value }, 'debugTexture')
    .name('Output ping pong texture')
    .onChange((value) => {
      fullscreenPlane.uniforms.params.outputPingPongTexture.value = value ? 1 : 0
    })
})
