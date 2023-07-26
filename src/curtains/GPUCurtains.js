import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { resizeManager } from '../utils/ResizeManager'
import { Vec3 } from '../math/Vec3'

export class GPUCurtains {
  // callbacks / events
  _onRenderCallback = () => {
    /* allow empty callback */
  }
  _onScrollCallback = () => {
    /* allow empty callback */
  }
  _onAfterResizeCallback = () => {
    /* allow empty callback */
  }

  constructor({
    container,
    pixelRatio = window.devicePixelRatio ?? 1,
    sampleCount = 4,
    preferredFormat,
    camera,
    production = false,
    autoRender = true,
    autoResize = true,
    watchScroll = true,
    onError = () => {
      /* allow empty callbacks */
    },
  }) {
    this.type = 'CurtainsGPU'

    this.options = {
      pixelRatio,
      sampleCount,
      camera,
      production,
      preferredFormat,
      autoRender,
      autoResize,
      watchScroll,
      onError,
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
      preferredFormat: this.options.preferredFormat,
      camera: this.options.camera,
      production: this.options.production,
      onError: this.options.onError,
    })

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
    if (this.options.autoRender) {
      this.animate()
    }
  }

  /** Renderer objects **/

  get pingPongPlanes() {
    return this.renderer?.pingPongPlanes
  }

  get shaderPasses() {
    return this.renderer?.shaderPasses
  }

  get meshes() {
    return this.renderer?.meshes
  }

  get domMeshes() {
    return this.renderer?.domMeshes
  }

  get planes() {
    return this.renderer?.domMeshes.filter((domMesh) => domMesh.type === 'Plane')
  }

  setPerspective(fov = 50, near = 0.01, far = 50) {
    this.renderer?.setPerspective(fov, near, far)
  }

  setCameraPosition(position = new Vec3(0, 0, 1)) {
    this.renderer?.setCameraPosition(position)
  }

  initEvents() {
    resizeManager.useObserver(this.options.autoResize)

    if (this.options.watchScroll) {
      this.initScroll()
    }
  }

  // called only if autoResize is set to false
  resize() {
    this.renderer?.resize()

    this._onAfterResizeCallback && this._onAfterResizeCallback()
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

    this._onScrollCallback && this._onScrollCallback()
  }

  getScrollDeltas() {
    return {
      x: this.scrollManager.lastXDelta,
      y: this.scrollManager.lastYDelta,
    }
  }

  getScrollValues() {
    return {
      x: this.scrollManager.xOffset,
      y: this.scrollManager.yOffset,
    }
  }

  /** EVENTS **/

  onRender(callback) {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  onScroll(callback) {
    if (callback) {
      this._onScrollCallback = callback
    }

    return this
  }

  onAfterResize(callback) {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  /***
   This just handles our drawing animation frame
   ***/
  animate() {
    this.render()
    this.animationFrameID = window.requestAnimationFrame(this.animate.bind(this))
  }

  render() {
    this._onRenderCallback && this._onRenderCallback()

    this.renderer?.render()
  }

  destroy() {
    if (this.animationFrameID) {
      window.cancelAnimationFrame(this.animationFrameID)
    }

    this.renderer?.destroy()
    this.scrollManager?.destroy()
  }
}
