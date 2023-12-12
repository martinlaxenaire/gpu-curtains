import { GPUCurtains, Plane } from '../../src'

window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: 'canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setRendererContext()

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

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
        var strength: f32 = 0.2 * min(frames.elapsed / 180.0, 1.0);
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
      
        vsOutput.position = getOutputPosition(camera, matrices, transformed);
      
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

  const canvasTexture = textPlane.createTexture({
    label: 'Canvas texture',
    name: 'canvasTexture',
  })

  // create our text texture as soon as our plane has been created
  // first we need a canvas
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  const writeCanvasText = () => {
    const htmlPlane = textPlane.domElement.element

    const htmlPlaneWidth = textPlane.boundingRect.width
    const htmlPlaneHeight = textPlane.boundingRect.height

    const canvasResolution = window.devicePixelRatio

    // set sizes
    canvas.width = htmlPlaneWidth * canvasResolution
    canvas.height = htmlPlaneHeight * canvasResolution

    // context.width = htmlPlaneWidth
    // context.height = htmlPlaneHeight

    context.scale(canvasResolution, canvasResolution)

    const textStyle = window.getComputedStyle(htmlPlane.querySelector('h1'))

    // draw our title with the original style
    context.fillStyle = textStyle.color
    context.font =
      textStyle.fontStyle +
      ' ' +
      textStyle.fontWeight +
      ' ' +
      parseFloat(textStyle.fontSize) +
      'px ' +
      textStyle.fontFamily
    //context.textAlign = htmlPlaneStyle.textAlign

    context.lineHeight = textStyle.lineHeight

    context.textAlign = 'center'

    // vertical alignment is a bit hacky
    context.textBaseline = 'middle'
    context.fillText(htmlPlane.innerText, htmlPlaneWidth * 0.5, htmlPlaneHeight * 0.55)

    console.log(canvasTexture, htmlPlaneWidth)
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

  console.log(textPlane, gpuCurtains.renderer.scene)
})
