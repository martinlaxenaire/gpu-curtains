import { GPUCurtains, Plane } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  gpuCurtains.onError(() => {
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  const planeVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      };
      
      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;
        
        // progressively increase strength
        var strength: f32 = 0.2 * pow(min(frames.elapsed / 180.0, 1.0), 2.0);
        var nbWaves: f32 = 5.0;

        // map vertices coordinates to the 0->1 range on the X axis
        var normalizeXPos: f32 = (attributes.position.x + 0.5) * 0.5;

        // notice how the "uniforms" struct name matches our bindings object name property
        var time: f32 = frames.elapsed * 0.0375;

        var waveSinusoid: f32 = sin(3.141595 * nbWaves * normalizeXPos - time);

        var transformed: vec3f = vec3(
            attributes.position.x,
            attributes.position.y,
            attributes.position.z - waveSinusoid * strength
        );
      
        vsOutput.position = getOutputPosition(transformed);
      
        // used for the flow map texture
        vsOutput.uv = attributes.uv;
      
        return vsOutput;
      }
    `

  const planeFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {  
      var color: vec4f = textureSample(canvasTexture, defaultSampler, fsInput.uv);
      return color;
    }
  `

  const textPlane = new Plane(gpuCurtains, '#text-plane', {
    label: 'Canvas text plane',
    widthSegments: 20,
    transparent: true,
    shaders: {
      vertex: {
        code: planeVs,
        entryPoint: 'main',
      },
      fragment: {
        code: planeFs,
        entryPoint: 'main',
      },
    },
    uniforms: {
      frames: {
        struct: {
          elapsed: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  // create our text texture as soon as our plane has been created
  const canvasTexture = textPlane.createDOMTexture({
    label: 'Canvas texture',
    name: 'canvasTexture',
  })

  const canvasResolution = window.devicePixelRatio

  // then we need a canvas
  const canvas = document.createElement('canvas')
  // works with an offscreen canvas too!
  // const canvas = new OffscreenCanvas(
  //   textPlane.boundingRect.width * canvasResolution,
  //   textPlane.boundingRect.height * canvasResolution
  // )

  const context = canvas.getContext('2d')

  const writeCanvasText = () => {
    const htmlPlane = textPlane.domElement.element

    const htmlPlaneWidth = textPlane.boundingRect.width
    const htmlPlaneHeight = textPlane.boundingRect.height

    // set sizes
    canvas.width = htmlPlaneWidth * canvasResolution
    canvas.height = htmlPlaneHeight * canvasResolution

    context.width = htmlPlaneWidth
    context.height = htmlPlaneHeight

    context.scale(canvasResolution, canvasResolution)

    const textStyle = window.getComputedStyle(htmlPlane.querySelector('h1'))

    // draw our title with the original style
    context.fillStyle = textStyle.color
    context.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${parseFloat(textStyle.fontSize)}px ${
      textStyle.fontFamily
    }`

    context.lineHeight = textStyle.lineHeight

    context.textAlign = 'center'

    // vertical alignment is a bit hacky
    context.textBaseline = 'middle'
    context.fillText(htmlPlane.innerText, htmlPlaneWidth * 0.5, htmlPlaneHeight * 0.5)
  }

  writeCanvasText()

  canvasTexture.loadCanvas(canvas)

  textPlane.domElement.element.classList.add('canvas-texture-ready')

  textPlane
    .onRender(() => {
      textPlane.uniforms.frames.elapsed.value++
    })
    .onAfterResize(() => {
      writeCanvasText()
      canvasTexture.resize()
    })
})
