export class TestPingPong {
  constructor({ gpuCurtains }) {
    this.gpuCurtains = gpuCurtains

    this.init()
  }

  onMouseMove(e) {
    // velocity is our mouse position minus our mouse last position
    this.lastMouse.copy(this.mouse)

    // touch event
    if (e.targetTouches) {
      this.mouse.set(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
    }
    // mouse event
    else {
      this.mouse.set(e.clientX, e.clientY)
    }

    // divided by a frame duration (roughly)
    this.velocity.set((this.mouse.x - this.lastMouse.x) / 16, (this.mouse.y - this.lastMouse.y) / 16)

    // we should update the velocity
    this.updateVelocity = true
  }

  async init() {
    const path = location.hostname === 'localhost' ? '../../src/index' : '../../dist/gpu-curtains.mjs'
    const { PingPongPlane, Plane, RenderTexture, Sampler, Vec2 } = await import(path)

    this.mouse = new Vec2()
    this.velocity = new Vec2()
    // used for vector lerping
    this.nullVector = new Vec2()
    this.lastMouse = this.mouse.clone()
    // if we should update the velocity or not
    this.updateVelocity = false

    const flowMapFS = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
      var uv: vec2f = fsInput.uv;
      
      // convert our mouse position from vertex coords to uv coords
      // thanks to the built-in 'getVertex2DToUVCoords' function
      var mousePosition: vec2f = getVertex2DToUVCoords(flowmap.mousePosition);

      /*** comment this whole block for a regular mouse flow effect ***/

      // make the cursor grow with time
      uv -= mousePosition;
      uv /= flowmap.cursorGrow;
      uv += mousePosition;

      /*** end of whole block commenting for a regular mouse flow effect ***/

      var color: vec4f = textureSample(renderTexture, defaultSampler, uv) * flowmap.dissipation;

      var cursor: vec2f = fsInput.uv - mousePosition;
      cursor.x = cursor.x * flowmap.aspect;

      var stamp = vec3(flowmap.velocity * vec2(1.0, -1.0), 1.0 - pow(1.0 - min(1.0, length(flowmap.velocity)), 3.0));
      var cursorSize: f32 = smoothstep(flowmap.cursorSize, 0.0, length(cursor)) * flowmap.alpha;

      color = vec4(vec3(mix(color.rgb, stamp, cursorSize)), color.a);
  
      return color;
    }
  `

    this.flowMap = new PingPongPlane(this.gpuCurtains, {
      label: 'Flowmap Ping Pong Plane',
      shaders: {
        fragment: {
          code: flowMapFS,
          entryPoint: 'fs', // custom entry point
        },
      },
      targetFormat: 'rgba16float', // important, we'll be using floating point textures
      uniforms: {
        flowmap: {
          label: 'Flowmap',
          struct: {
            mousePosition: {
              type: 'vec2f',
              value: this.mouse,
            },
            // how much the cursor must dissipate over time (ie trail length)
            // closer to 1 = no dissipation
            dissipation: {
              type: 'f32',
              value: 0.975,
            },
            cursorSize: {
              type: 'f32',
              value: 0.075, // size of the mouse cursor
            },
            // how much the cursor should grow with time
            cursorGrow: {
              type: 'f32',
              value: 1.15,
            },
            // alpha of the cursor
            alpha: {
              type: 'f32',
              value: 1,
            },
            // canvas aspect ratio, used to draw a circle shaped cursor
            aspect: {
              type: 'f32',
              value: this.gpuCurtains.renderer.boundingRect.width / this.gpuCurtains.renderer.boundingRect.height,
            },
            // our velocity
            velocity: {
              type: 'vec2f',
              value: this.velocity,
            },
          },
        },
      },
    })

    this.flowMap
      .onReady(() => {
        window.addEventListener('mousemove', this.onMouseMove.bind(this))
      })
      .onRender(() => {
        // update mouse position
        this.flowMap.uniforms.flowmap.mousePosition.value = this.flowMap.mouseToPlaneCoords(this.mouse)

        // update velocity
        if (!this.updateVelocity) {
          this.velocity.lerp(this.nullVector.set(0), 0.5)
        }
        this.updateVelocity = false

        this.flowMap.uniforms.flowmap.velocity.value = this.velocity.lerp(this.nullVector.set(0), 0.1)
      })
      .onAfterResize(() => {
        this.flowMap.uniforms.flowmap.aspect.value =
          this.gpuCurtains.renderer.boundingRect.width / this.gpuCurtains.renderer.boundingRect.height
      })

    const displacedFlowMapVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) displacedUv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
      
        vsOutput.position = getOutputPosition(attributes.position);
      
        // used for the flow map texture
        vsOutput.uv = attributes.uv;
        vsOutput.displacedUv = getUVCover(attributes.uv, displacedTextureMatrix);
      
        return vsOutput;
      }
    `

    const displacedFlowMapFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) displacedUv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {  
      var flowMap: vec4f = textureSample(flowMapTexture, defaultSampler, fsInput.uv);
      
      var displacement: vec2f = vec2(-flowMap.r, flowMap.g);
      
      // use our mirror sampler defined below
      var color: vec4f = textureSample(displacedTexture, mirrorSampler, fsInput.displacedUv + displacement * 0.1);
      
      // get a B&W version of our image texture
      var grayscale: vec3f = vec3(color.r * 0.3 + color.g * 0.59 + color.b * 0.11);
      var textureBW: vec4f = vec4(grayscale, 1.0);

      // mix the BW image and the colored one based on our flowmap color values
      var mixValue: f32 = clamp((abs(flowMap.r) + abs(flowMap.g) + abs(flowMap.b)) * 1.5, 0.0, 1.0);
      color = mix(color, textureBW, mixValue);
      
      // output debug flowmap
      //return vec4(vec3(flowMap.rgb), 1.0);
      
      return color;
    }
  `

    this.displacedPlane = new Plane(this.gpuCurtains, '#ping-pong-plane', {
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
      samplers: [
        // we don't want to see our media texture edges
        // so we're going to use a custom sampler with mirror repeat
        new Sampler(this.gpuCurtains, {
          label: 'Mirror sampler',
          name: 'mirrorSampler',
          addressModeU: 'mirror-repeat',
          addressModeV: 'mirror-repeat',
        }),
      ],
      texturesOptions: {
        // display a custom color while texture is loading
        //placeholderColor: [238, 101, 87, 255],
        placeholderColor: [0, 255, 255, 255],
      },
      renderTextures: [
        // ping pong planes use a RenderTexture internally
        // so we need to create one to use it in our plane
        new RenderTexture(this.gpuCurtains, {
          label: 'Flow map render texture',
          name: 'flowMapTexture',
          fromTexture: this.flowMap.renderTexture,
        }),
      ],
    })
    console.log('TEST PING PONG init', this.gpuCurtains.deviceManager)
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMouseMove.bind(this))

    this.flowMap.remove()
    this.displacedPlane.remove()

    console.log('TEST PING PONG destroy', this.gpuCurtains.deviceManager)
  }
}
