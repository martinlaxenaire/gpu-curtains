import { GPUCurtainsRenderer } from './renderer/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { resizeManager } from '../utils/ResizeManager'
import { Vec3 } from '../math/Vec3'

export class GPUCurtains {
  constructor({ container, pixelRatio = 1, sampleCount = 4, camera, production = false }) {
    this.type = 'CurtainsGPU'

    this.options = {
      pixelRatio,
      sampleCount,
      camera,
      production,
    }

    if (container) {
      this.setContainer(container)
    }
  }

  /**
   * Set container
   *
   * @param container
   */
  setContainer(container) {
    if (!container) {
      let container = document.createElement('div')
      container.setAttribute('id', 'curtains-gpu-canvas')
      document.body.appendChild(container)
      this.options.container = container
    } else {
      if (typeof container === 'string') {
        container = document.getElementById(container)

        if (!container) {
          let container = document.createElement('div')
          container.setAttribute('id', 'curtains-gpu-canvas')
          document.body.appendChild(container)
          this.options.container = container
        } else {
          this.options.container = container
        }
      } else if (container instanceof Element) {
        this.options.container = container
      }
    }

    this.container = this.options.container

    this.setCurtains()
  }

  /**
   * Set renderer
   */
  setRenderer() {
    this.renderer = new GPUCurtainsRenderer({
      // TODO ...this.options?
      container: this.options.container,
      pixelRatio: this.options.pixelRatio,
      sampleCount: this.options.sampleCount,
      camera: this.options.camera,
      production: this.options.production,
    })

    this.options.camera = this.renderer.camera
    this.canvas = this.renderer.canvas
  }

  async setRendererContext() {
    await this.renderer.setContext()
  }

  /**
   * Set Curtains
   */
  setCurtains() {
    this.initEvents()

    this.setRenderer()

    // we are ready to go
    this.container.appendChild(this.canvas)

    // only if auto render
    this.animate()
  }

  setPerspective(fov = 50, near = 0.01, far = 50) {
    this.renderer?.setPerspective(fov, near, far)
  }

  setCameraPosition(position = new Vec3(0, 0, 1)) {
    this.renderer?.setCameraPosition(position)
  }

  initEvents() {
    resizeManager.useObserver(true)

    this.initScroll()
  }

  // called only if autoResize is set to false
  resize() {
    this.renderer?.resize()
  }

  /**
   * SCROLL
   */

  initScroll() {
    this.scrollManager = new ScrollManager({
      // init values
      xOffset: window.pageXOffset,
      yOffset: window.pageYOffset,
      lastXDelta: 0,
      lastYDelta: 0,
      shouldWatch: true,

      onScroll: (lastXDelta, lastYDelta) => this.updateScroll(lastXDelta, lastYDelta),
    })
  }

  updateScroll(lastXDelta = 0, lastYDelta = 0) {
    this.renderer.domMeshes.forEach((mesh) => {
      if (mesh.domElement) {
        mesh.updateScrollPosition(lastXDelta, lastYDelta)
      }
    })
  }

  /***
   This just handles our drawing animation frame
   ***/
  animate() {
    this.render()
    this.animationFrameID = window.requestAnimationFrame(this.animate.bind(this))
  }

  render() {
    this.renderer?.render()
  }

  destroy() {
    this.renderer?.destroy()
    this.scrollManager?.destroy()
  }
}
