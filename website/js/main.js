import { GPUCurtains } from '../../dist/gpu-curtains.js'
import { CurtainsClothSim } from './components/CurtainsClothSim'
import { IntroDOMMeshes } from './components/IntroDOMMeshes'
import { TexturesPlanes } from './components/TexturesPlanes'
import { ComputeFeature } from './components/ComputeFeature'
import { ScrollObserver } from './utils/ScrollObserver.js'

window.addEventListener('load', async () => {
  // set up our GPUCurtains instance
  const gpuCurtains = new GPUCurtains({
    container: '#canvas',
    pixelRatio: Math.min(1.5, window.devicePixelRatio), // limit pixel ratio for performance
    autoRender: false,
    //watchScroll: false,
    camera: {
      fov: 35,
    },
  })

  const scrollObserver = new ScrollObserver()

  document.querySelectorAll('.section, .text-section').forEach((section) => {
    scrollObserver.observe({
      element: section,
      onElVisible: () => {
        section.classList.add('is-visible')
      },
    })
  })

  gsap.ticker.fps(60)
  gsap.ticker.add(() => gpuCurtains.render())

  const lenis = new Lenis()

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })

  gsap.ticker.lagSmoothing(0)

  lenis.on('scroll', (scroll) => {
    gpuCurtains.updateScrollValues({ x: 0, y: scroll.scroll })
  })

  document.querySelector('#header h1 a').addEventListener('click', (e) => {
    e.preventDefault()

    lenis.scrollTo(0)
  })

  // set WebGPU device and context
  await gpuCurtains.setDevice()

  gpuCurtains.onError(() => {
    // display original medias
    document.body.classList.add('no-curtains')
  })

  const cloth = document.querySelector('#cloth')
  if (cloth) {
    const clothSim = new CurtainsClothSim({
      gpuCurtains,
    })
  }

  const intro = document.querySelector('#intro')
  if (intro) {
    const intro = new IntroDOMMeshes({ gpuCurtains, scrollObserver })
  }

  const introPlaneEls = document.querySelectorAll('.textures-plane')
  if (introPlaneEls.length) {
    const introPlanes = new TexturesPlanes({ gpuCurtains })
  }

  const computeFeatureCanvas = document.querySelector('#compute-feature-canvas')
  if (computeFeatureCanvas) {
    const computeFeature = new ComputeFeature({ gpuCurtains, scrollObserver })
  }
})
