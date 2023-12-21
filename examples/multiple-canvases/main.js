import { GPUCurtains, PlaneGeometry, Sampler, Plane } from '../../dist/gpu-curtains.js'

window.addEventListener('DOMContentLoaded', async () => {
  // first dynamically build the planes elements
  const buildPlaneHTMLElement = (index) => {
    const isFront = Math.random() > 0.5
    return `<div class="plane ${isFront ? 'front-plane' : 'back-plane'}">
          <img
            src="https://source.unsplash.com/featured/720x720/?nature&${index}"
            crossorigin=""
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

  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas-front',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance,
  })

  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original images
    document.body.classList.add('no-curtains')
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

      vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
      vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);
    
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
  }

  // add the front planes
  const frontPlanes = document.querySelectorAll('.front-plane')
  frontPlanes.forEach((planeEl, index) => {
    params.label = 'Front plane ' + index
    // notice that gpuCurtains.renderer matches the default renderer created by the GPUCurtains instance
    const plane = new Plane(gpuCurtains.renderer, planeEl, params)

    plane.position.z = Math.random() * 4 // allow for an easy parallax effect
  })

  // and then the back planes using our back renderer
  const backPlanes = document.querySelectorAll('.back-plane')
  backPlanes.forEach((planeEl, index) => {
    params.label = 'Back plane ' + index
    const plane = new Plane(backCurtainsRenderer, planeEl, params)

    plane.position.z = -4 * Math.random() // allow for an easy parallax effect
  })
})
