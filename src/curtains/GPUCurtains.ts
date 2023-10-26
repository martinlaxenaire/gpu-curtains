import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { resizeManager } from '../utils/ResizeManager'
import { Vec3 } from '../math/Vec3'
import { GPUCurtainsOptions, GPUCurtainsParams } from '../types/curtains/GPUCurtains'
import { PingPongPlane } from './meshes/PingPongPlane'
import { ShaderPass } from '../core/renderPasses/ShaderPass'
import { MeshType } from '../types/core/renderers/GPURenderer'
import { DOMMesh } from './meshes/DOMMesh'
import { Plane } from './meshes/Plane'
import { ComputePass } from '../core/computePasses/ComputePass'
import { Camera } from '../core/camera/Camera'
import { DOMElementBoundingRect } from '../types/core/DOM/DOMElement'
import { ScrollManagerParams } from '../utils/ScrollManager'

export class GPUCurtains {
  type: string
  options: GPUCurtainsOptions
  container: HTMLElement

  renderer: GPUCurtainsRenderer
  canvas: GPUCurtainsRenderer['canvas']

  scrollManager: ScrollManager

  animationFrameID: null | number

  // callbacks / events
  _onRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  _onScrollCallback: () => void = () => {
    /* allow empty callback */
  }
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }
  _onErrorCallback: () => void = () => {
    /* allow empty callback */
  }

  constructor({
    container,
    pixelRatio = window.devicePixelRatio ?? 1,
    sampleCount = 4,
    preferredFormat,
    production = false,
    camera,
    autoRender = true,
    autoResize = true,
    watchScroll = true,
  }: GPUCurtainsParams) {
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
  setContainer(container: string | HTMLElement) {
    if (!container) {
      const container = document.createElement('div')
      container.setAttribute('id', 'curtains-gpu-canvas')
      document.body.appendChild(container)
      this.options.container = container
    } else {
      if (typeof container === 'string') {
        container = document.getElementById(container)

        if (!container) {
          const container = document.createElement('div')
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

    this.container = this.options.container as HTMLElement

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
      onError: () => this._onErrorCallback && this._onErrorCallback(),
    })

    this.canvas = this.renderer.canvas
  }

  async setRendererContext(): Promise<void> {
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

  get pingPongPlanes(): PingPongPlane[] {
    return this.renderer?.pingPongPlanes
  }

  get shaderPasses(): ShaderPass[] {
    return this.renderer?.shaderPasses
  }

  get meshes(): MeshType[] {
    return this.renderer?.meshes
  }

  get domMeshes(): DOMMesh[] {
    return this.renderer?.domMeshes
  }

  get planes(): Plane[] {
    return this.renderer?.domMeshes.filter((domMesh) => domMesh.type === 'Plane') as Plane[]
  }

  get computePass(): ComputePass[] {
    return this.renderer?.computePasses
  }

  get camera(): Camera {
    return this.renderer?.camera
  }

  setPerspective(fov = 50, near = 0.01, far = 50) {
    this.renderer?.setPerspective(fov, near, far)
  }

  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
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

  get boundingRect(): DOMElementBoundingRect {
    return this.renderer?.boundingRect
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
    } as ScrollManagerParams)
  }

  updateScroll(lastXDelta = 0, lastYDelta = 0) {
    this.renderer.domMeshes.forEach((mesh) => {
      if (mesh.domElement) {
        mesh.updateScrollPosition(lastXDelta, lastYDelta)
      }
    })

    this._onScrollCallback && this._onScrollCallback()
  }

  getScrollDeltas(): { x: number; y: number } {
    return {
      x: this.scrollManager.lastXDelta,
      y: this.scrollManager.lastYDelta,
    }
  }

  getScrollValues(): { x: number; y: number } {
    return {
      x: this.scrollManager.xOffset,
      y: this.scrollManager.yOffset,
    }
  }

  /** EVENTS **/

  onRender(callback: () => void): GPUCurtains {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  onScroll(callback: () => void): GPUCurtains {
    if (callback) {
      this._onScrollCallback = callback
    }

    return this
  }

  onAfterResize(callback: () => void): GPUCurtains {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  onError(callback: () => void): GPUCurtains {
    if (callback) {
      this._onErrorCallback = callback
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
    resizeManager.destroy()
  }
}
