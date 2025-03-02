import { GPUCurtains, Plane } from '../../dist/esm/index.mjs'

window.addEventListener('load', async () => {
  // first dynamically build the planes elements
  const buildPlaneHTMLElement = (index) => {
    const isFront = Math.random() > 0.5
    return `<div class="plane ${isFront ? 'front-plane' : 'back-plane'}">
          <img
            src="https://picsum.photos/720/720?random=${index}"
            crossorigin=""
            loading="lazy"
            data-texture-name="planeTexture"
          />
        </div>`
  }

  const nbPlanes = 40
  let planesHTMLString = ''

  for (let i = 0; i < nbPlanes; i++) {
    planesHTMLString += buildPlaneHTMLElement(i)
  }

  // append the response
  document.querySelector('#planes').insertAdjacentHTML('beforeend', planesHTMLString)

  document.body.classList.add('dom-ready')

  // lerp
  const lerp = (start = 0, end = 1, amount = 0.1) => {
    return (1 - amount) * start + amount * end
  }

  // we will keep track of all our planes in an array
  let scrollEffect = 0

  // set our main GPUCurtains instance it will handle everything we need
  // a WebGPU device and a renderer with its scene, requestAnimationFrame, resize and scroll events...
  const gpuCurtains = new GPUCurtains({
    container: '#canvas-front',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
  })

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
  })

  await gpuCurtains.setDevice()

  gpuCurtains
    .onBeforeRender(() => {
      // update our planes deformation
      // increase/decrease the effect
      scrollEffect = lerp(scrollEffect, 0, 0.1)
    })
    .onScroll(() => {
      // get scroll deltas to apply the effect on scroll
      const delta = gpuCurtains.scrollDelta

      // invert value for the effect
      delta.y = -delta.y

      // threshold
      if (delta.y > 60) {
        delta.y = 60
      } else if (delta.y < -60) {
        delta.y = -60
      }

      if (Math.abs(delta.y) > Math.abs(scrollEffect)) {
        scrollEffect = lerp(scrollEffect, delta.y, 0.2)
      }
    })

  // create the back renderer
  const backCurtainsRenderer = gpuCurtains.createCurtainsRenderer({
    container: '#canvas-back',
  })

  // now the planes
  const vertexShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
      
      var transformed: vec3f = attributes.position;
      var planeDeformation: f32 = sin((attributes.position.x * 0.5 + 0.5) * 3.141592) * sin(deformation.strength / 15.0);
      transformed.z += planeDeformation;

      vsOutput.position = getOutputPosition(transformed);
      vsOutput.uv = getUVCover(attributes.uv, texturesMatrices.planeTexture.matrix);
    
      return vsOutput;
    }
  `

  const fragmentShader = /* wgsl */ `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {   
      var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);
      color.a = 0.85;  
      return color;
    }
  `

  const params = {
    widthSegments: 10,
    heightSegments: 10,
    shaders: {
      vertex: {
        code: vertexShader,
        entryPoint: 'main',
      },
      fragment: {
        code: fragmentShader,
        entryPoint: 'main',
      },
    },
    transparent: true,
    texturesOptions: {
      generateMips: true,
    },
    uniforms: {
      deformation: {
        label: 'Deformation',
        struct: {
          strength: {
            type: 'f32',
            value: 0,
          },
        },
      },
    },
  }

  // add the front planes
  const frontPlanes = document.querySelectorAll('.front-plane')
  frontPlanes.forEach((planeEl, index) => {
    params.label = 'Front plane ' + index
    // random placeholder color between pink and blue
    params.texturesOptions.placeholderColor = Math.random() > 0.5 ? [0, 255, 255, 255] : [255, 0, 255, 255]

    // notice that gpuCurtains.renderer matches the default renderer created by the GPUCurtains instance
    const plane = new Plane(gpuCurtains.renderer, planeEl, params)

    plane.position.z = Math.sqrt(Math.random()) * 2.5 // allow for an easy parallax effect

    plane.onRender(() => {
      // update the uniform
      plane.uniforms.deformation.strength.value = Math.abs(scrollEffect)
    })
  })

  // and then the back planes using our back renderer
  const backPlanes = document.querySelectorAll('.back-plane')
  backPlanes.forEach((planeEl, index) => {
    params.label = 'Back plane ' + index
    const plane = new Plane(backCurtainsRenderer, planeEl, params)

    plane.position.z = -2.5 * Math.sqrt(Math.random()) // allow for an easy parallax effect

    plane.onRender(() => {
      // update the uniform
      plane.uniforms.deformation.strength.value = -Math.abs(scrollEffect)
    })
  })
})
