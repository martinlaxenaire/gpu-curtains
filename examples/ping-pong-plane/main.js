window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains.GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    preferredFormat: 'rgba16float', // important, we'll be using floating point textures
  })

  await gpuCurtains.setRendererContext()

  const mouse = new GPUCurtains.Vec2()
  const velocity = new GPUCurtains.Vec2()
  // used for vector lerping
  const nullVector = new GPUCurtains.Vec2()
  const lastMouse = mouse.clone()
  // if we should update the velocity or not
  let updateVelocity = false

  const flowMapFS = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(2) uv: vec2f,
    };
  
    @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(renderTexture, renderTextureSampler, fsInput.uv) * flowmap.dissipation;
      
      //var cursorPos: vec2f = vec2f(cos(flowmap.time * 0.015) * 0.5 + 0.5, 0.5);
      var mousePosition = vec2(
      flowmap.mousePosition.x * 0.5 + 0.5,
      0.5 - flowmap.mousePosition.y * 0.5
      );
      
      var cursor: vec2f = fsInput.uv - mousePosition;
      cursor.x = cursor.x * flowmap.aspect;
  
      //var stamp: vec3f = vec3f(1.0, 0.0, 0.0);
      var stamp = vec3(flowmap.velocity * vec2(1.0, -1.0), 1.0 - pow(1.0 - min(1.0, length(flowmap.velocity)), 3.0));
      var falloff: f32 = smoothstep(flowmap.falloff, 0.0, length(cursor)) * flowmap.alpha;
  
      color = vec4(vec3(mix(color.rgb, stamp, falloff)), color.a);
  
      return color;
    }
  `

  const flowMap = new GPUCurtains.PingPongPlane(gpuCurtains, {
    label: 'Flowmap Ping Pong Plane',
    shaders: {
      fragment: {
        code: flowMapFS,
        entryPoint: 'fs', // custom entry point
      },
    },
    bindings: [
      {
        name: 'flowmap',
        label: 'Flowmap',
        uniforms: {
          mousePosition: {
            type: 'vec2f',
            value: mouse,
          },
          dissipation: {
            type: 'f32',
            value: 0.925,
          },
          falloff: {
            type: 'f32',
            value: 0.2,
          },
          alpha: {
            type: 'f32',
            value: 1,
          },
          aspect: {
            type: 'f32',
            value: gpuCurtains.renderer.boundingRect.width / gpuCurtains.renderer.boundingRect.height,
          },
          velocity: {
            type: 'vec2f',
            value: velocity,
          },
        },
      },
    ],
  })

  flowMap
    .onReady(() => {
      window.addEventListener('mousemove', (e) => {
        // velocity is our mouse position minus our mouse last position
        lastMouse.copy(mouse)

        // touch event
        if (e.targetTouches) {
          mouse.set(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        }
        // mouse event
        else {
          mouse.set(e.clientX, e.clientY)
        }

        // divided by a frame duration (roughly)
        velocity.set((mouse.x - lastMouse.x) / 16, (mouse.y - lastMouse.y) / 16)

        // we should update the velocity
        updateVelocity = true
      })
    })
    .onRender(() => {
      // update mouse position
      flowMap.uniforms.mousePosition.value = flowMap.mouseToPlaneCoords(mouse)

      // update velocity
      if (!updateVelocity) {
        velocity.lerp(nullVector.set(0, 0), 0.5)
      }
      updateVelocity = false

      flowMap.uniforms.velocity.value = velocity.lerp(nullVector.set(0, 0), 0.1)
    })
    .onAfterResize(() => {
      flowMap.uniforms.aspect.value = gpuCurtains.renderer.boundingRect.width / gpuCurtains.renderer.boundingRect.height
    })

  console.log(flowMap)

  const displacedFlowMapVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(1) uv: vec2f,
        @location(2) displacedUv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
      
        vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
      
        // used for the flow map texture
        vsOutput.uv = attributes.uv;
        vsOutput.displacedUv = getUVCover(attributes.uv, displacedTextureMatrix);
      
        return vsOutput;
      }
    `

  const displacedFlowMapFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(1) uv: vec2f,
      @location(2) displacedUv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {  
      var flowMap: vec4f = textureSample(flowMapTexture, flowMapTextureSampler, fsInput.uv);
      var color: vec4f = textureSample(displacedTexture, displacedTextureSampler, fsInput.displacedUv + vec2(-flowMap.r, flowMap.g) * 0.1);
      
      
      //return flowMap;
      
      //return mix(color, flowMap, smoothstep(0.25, 0.75, fsInput.uv.x));
      //return flowMap;
      return color;
    }
  `

  // const renderFlowMapPass = new GPUCurtains.ShaderPass(gpuCurtains, {
  //   label: 'Flowmap render shader pass',
  //   shaders: {
  //     fragment: {
  //       code: renderFlowMapFS,
  //       entryPoint: 'fs',
  //     },
  //   },
  // })
  //
  // const flowMapTexture = renderFlowMapPass.createRenderTexture({
  //   label: 'flow map render texture',
  //   name: 'flowMapTexture',
  //   fromTexture: flowMap.renderTexture,
  // })
  //
  // console.log(renderFlowMapPass)

  const displacedPlane = new GPUCurtains.Plane(gpuCurtains, '#ping-pong-plane', {
    label: 'Flowmap displaced plane',
    shaders: {
      vertex: {
        code: displacedFlowMapVs,
        entryPoint: 'main',
      },
      fragment: {
        code: displacedFlowMapFs,
        entryPoint: 'main',
      },
    },
  })

  const flowMapTexture = displacedPlane.createRenderTexture({
    label: 'Flow map render texture',
    name: 'flowMapTexture',
    fromTexture: flowMap.renderTexture,
  })

  console.log(displacedPlane)
})
