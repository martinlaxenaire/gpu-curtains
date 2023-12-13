import { GPUCurtains, GPUCameraRenderer, BoxGeometry, SphereGeometry, Mesh } from '../../src'

window.addEventListener('DOMContentLoaded', async () => {
  // set up our WebGL context and append the canvas to our wrapper
  const gpuCurtains = new GPUCurtains({
    container: '#canvas-back',
    watchScroll: false, // no need to listen for the scroll in this example
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
  })

  await gpuCurtains.setDevice()

  console.log(gpuCurtains)

  gpuCurtains.addCameraRenderer({
    container: '#canvas-front',
  })

  const fragmentShader = `
    struct VSOutput {
      @builtin(position) position: vec4f,
      @location(0) uv: vec2f,
      @location(1) normal: vec3f,
    };
    
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
      // normals
      return vec4(fsInput.normal * 0.5 + 0.5, 0.8);
    }`

  for (let i = 0; i < gpuCurtains.renderers.length; i++) {
    const mesh = new Mesh(gpuCurtains.renderers[i], {
      geometry: new BoxGeometry(),
      shaders: {
        fragment: {
          code: fragmentShader,
        },
      },
      transparent: true,
    })

    mesh.position.x = i % 2 === 0 ? -1.5 : 1.5

    mesh.onRender(() => {
      mesh.rotation.y += 0.01
      mesh.rotation.z += 0.01
    })
  }

  // lose/restore context
  const loseCtxButton = document.querySelector('#lose-context-button')
  let isContextActive = true

  loseCtxButton.addEventListener('click', () => {
    if (isContextActive) {
      gpuCurtains.renderer.device?.destroy()
      loseCtxButton.textContent = 'Restore context'
      console.log('lost')
    } else {
      gpuCurtains.restoreContext()
      loseCtxButton.textContent = 'Lose context'
      console.log('restored')
    }

    isContextActive = !isContextActive
  })
})
