import { GPUCurtains, Plane, ShaderPass } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    autoRender: false, // do not create a request animation frame loop
  }).onError(() => {
    document.body.classList.add('no-curtains')
  })

  // use gsap ticker
  gsap.ticker.add(() => gpuCurtains.render())

  await gpuCurtains.setDevice()

  // if you want to slow down the whole animation
  const slowdown = 1
  const delay = 0.125 * slowdown

  const tl = gsap.timeline({
    repeat: -1,
    paused: true,
  })

  // port of https://gl-transitions.com/editor/WaterDrop
  const postProFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var dir: vec2f = fsInput.uv - vec2(0.5);

      var dist: f32 = length(dir);
      var offset = dir * sin(dist * 10.0 - wobble.strength * 2.0);
      
      
      //var uv: vec2f = fsInput.uv + offset * wobble.strength * 0.1;
    
      var r: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv);
      var g: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv - offset * wobble.strength * 0.05);
      var b: vec4f = textureSample(renderTexture, defaultSampler, fsInput.uv + offset * wobble.strength * 0.05);

      return vec4(r.r, g.g, b.b, r.a + g.a + b.a);
    }
  `

  const postProPass = new ShaderPass(gpuCurtains, {
    shaders: {
      fragment: {
        code: postProFs,
      },
    },
    uniforms: {
      wobble: {
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  })

  postProPass.userData.wobbleTween = gsap
    .timeline({
      paused: true,
    })
    .to(postProPass.uniforms.wobble.strength, {
      value: 1,
      duration: delay * 6,
      ease: 'power2.in',
    })
    .to(postProPass.uniforms.wobble.strength, {
      value: 0,
      duration: delay * 2,
      ease: 'linear',
    })

  // kinetic planes
  const planeVs = /* wgsl */ `
      struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) opacity: f32,
      };

      @vertex fn main(
        attributes: Attributes,
      ) -> VSOutput {
        var vsOutput: VSOutput;

        var transformed: vec3f = attributes.position;

        var instanceIndex: f32 = f32(attributes.instanceIndex);

        var colIndex = floor(instanceIndex / kinetic.nbCols);
        var rowIndex = instanceIndex % kinetic.nbCols;

        var instanceOffset: vec3f = vec3(
          select(0.0, floor((rowIndex + 1.0) / 2.0), rowIndex > 0.0),
          select(0.0, floor((colIndex + 1.0) / 2.0), colIndex > 0.0),
          0.0
        );

        var instanceSide: vec3f = vec3(
          select(-1.0, 1.0, rowIndex % 2 == 0),
          select(-1.0, 1.0, colIndex % 2 == 0),
          0.0
        );

        transformed += instanceOffset * instanceSide * 2.0;

        vsOutput.position = getOutputPosition(transformed);
        vsOutput.uv = attributes.uv;

        var maxDist = sqrt(pow(instanceOffset.x, 2.0) + pow(instanceOffset.y, 2.0));

        vsOutput.opacity = 1.0;

        if(maxDist <= kinetic.minDistance) {
          vsOutput.opacity = 0.0;
        }
        if(kinetic.maxDistance < maxDist) {
          vsOutput.opacity = 0.0;
        }

        return vsOutput;
      }
    `

  const planeFs = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) opacity: f32,
    };

    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      var color: vec4f = textureSample(canvasTexture, defaultSampler, fsInput.uv);
      color.a = color.a * fsInput.opacity;

      return color;
    }
  `

  const createTextPlane = (element, animDelay = 0) => {
    const textPlane = new Plane(gpuCurtains, element, {
      label: 'Canvas text plane ' + element.innerText,
      transparent: true,
      instancesCount: 150,
      visible: false,
      depthWriteEnabled: false, // do not write to depth so kinetic planes can be stacked
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
        kinetic: {
          struct: {
            nbCols: {
              type: 'f32',
              value: 9,
            },
            minDistance: {
              type: 'f32',
              value: -1,
            },
            maxDistance: {
              type: 'f32',
              value: -1,
            },
          },
        },
      },
    })

    const planeTl = gsap.timeline().call(() => {
      textPlane.visible = true
      // reset distances
      textPlane.uniforms.kinetic.minDistance.value = -1
      textPlane.uniforms.kinetic.maxDistance.value = -1
    })

    for (let i = 0; i <= 9; i++) {
      planeTl.call(
        () => {
          textPlane.uniforms.kinetic.maxDistance.value++
        },
        null,
        delay * (i + 1)
      )
    }

    for (let i = 0; i <= 9; i++) {
      planeTl.call(
        () => {
          textPlane.uniforms.kinetic.minDistance.value++
        },
        null,
        delay * (i + 7)
      )
    }

    planeTl.call(() => (textPlane.visible = false))

    // add wobble at the beginning of the timeline
    planeTl.call(() => postProPass.userData.wobbleTween.restart(), null, 0)

    tl.add(planeTl, animDelay)

    // create our text texture as soon as our plane has been created
    const canvasTexture = textPlane.createTexture({
      label: 'Canvas texture',
      name: 'canvasTexture',
    })

    const canvasResolution = window.devicePixelRatio

    // then we need a canvas
    const canvas = document.createElement('canvas')
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

      const textStyle = window.getComputedStyle(htmlPlane)

      // draw our title with the original style
      context.fillStyle = textStyle.color
      context.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${parseFloat(textStyle.fontSize)}px ${
        textStyle.fontFamily
      }`

      context.clearRect(0, 0, htmlPlaneWidth, htmlPlaneHeight)

      context.lineHeight = textStyle.lineHeight

      context.textAlign = 'center'

      // vertical alignment is a bit hacky
      context.textBaseline = 'middle'
      context.fillText(htmlPlane.innerText.toUpperCase(), htmlPlaneWidth * 0.5, htmlPlaneHeight * 0.55)
    }

    writeCanvasText()

    canvasTexture.loadCanvas(canvas)

    textPlane.onAfterResize(() => {
      const isPortrait = gpuCurtains.boundingRect.width <= gpuCurtains.boundingRect.height
      if (isPortrait) {
        textPlane.uniforms.kinetic.nbCols.value = 5
      } else {
        textPlane.uniforms.kinetic.nbCols.value = 9
      }

      writeCanvasText()
      canvasTexture.resize()
    })
  }

  const kineticPlaneEls = document.querySelectorAll('.kinetic-plane')

  kineticPlaneEls.forEach((kineticPlaneEl, index) => {
    createTextPlane(kineticPlaneEl, index * delay * 8)
  })

  tl.play()
})
