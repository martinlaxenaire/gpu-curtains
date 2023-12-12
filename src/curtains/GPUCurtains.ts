import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer'
import { ScrollManager, ScrollManagerParams } from '../utils/ScrollManager'
import { resizeManager } from '../utils/ResizeManager'
import { Vec3 } from '../math/Vec3'
import { PingPongPlane } from './meshes/PingPongPlane'
import { ShaderPass } from '../core/renderPasses/ShaderPass'
import { MeshType } from '../core/renderers/GPURenderer'
import { DOMMesh } from './meshes/DOMMesh'
import { Plane } from './meshes/Plane'
import { ComputePass } from '../core/computePasses/ComputePass'
import { Camera } from '../core/camera/Camera'
import { DOMElementBoundingRect, DOMElementParams, DOMPosition } from '../core/DOM/DOMElement'
import { GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer'

/**
 * Options used to create a {@link GPUCurtains}
 */
interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'onError'> {
  /** Whether {@link GPUCurtains} should create its own requestAnimationFrame loop to render or not */
  autoRender?: boolean
  /** Whether {@link GPUCurtains} should handle all resizing by itself or not */
  autoResize?: boolean
  /** Whether {@link GPUCurtains} should listen to scroll event or not */
  watchScroll?: boolean
}

/**
 * Parameters used to create a {@link GPUCurtains}
 */
interface GPUCurtainsParams extends Partial<Omit<GPUCurtainsOptions, 'container'>> {
  /** {@link HTMLElement} or string representing an {@link HTMLElement} selector that will hold the WebGPU [canvas]{@link HTMLCanvasElement}. Could be set later if not specified. */
  container?: string | HTMLElement | null
}

/**
 * GPUCurtains class:
 * Used as a global class to create a [Curtains renderer]{@link GPUCurtainsRenderer}, create all objects that need a reference to a renderer, listen to various events such as scroll and resize and render.
 */
export class GPUCurtains {
  /** The type of this {@link GPUCurtains} */
  type: string
  /** Options used to create this {@link GPUCurtains} */
  options: GPUCurtainsOptions
  /** {@link HTMLElement} that will hold the WebGPU [canvas]{@link HTMLCanvasElement} */
  container: HTMLElement

  /** [Curtains renderer]{@link GPUCurtainsRenderer} used to handle everything related to WebGPU */
  renderer: GPUCurtainsRenderer

  /** Tiny scroll event listener wrapper */
  scrollManager: ScrollManager

  /** [Request animation frame callback]{@link requestVideoFrameCallback} returned id if used */
  animationFrameID: null | number

  // callbacks / events
  /** function assigned to the [onRender]{@link GPUCurtains#onRender} callback */
  _onRenderCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onScroll]{@link GPUCurtains#onScroll} callback */
  _onScrollCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onAfterResize]{@link GPUCurtains#onAfterResize} callback */
  _onAfterResizeCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onError]{@link GPUCurtains#onError} callback */
  _onErrorCallback: () => void = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onContextLost]{@link GPUCurtains#onContextLost} callback */
  _onContextLostCallback: (info?: GPUDeviceLostInfo) => void = () => {
    /* allow empty callback */
  }

  /**
   * GPUCurtains constructor
   * @param parameters - [parameters]{@link GPUCurtainsParams} used to create this {@link GPUCurtains}
   */
  constructor({
    container,
    pixelRatio = window.devicePixelRatio ?? 1,
    sampleCount = 4,
    preferredFormat,
    alphaMode = 'premultiplied',
    production = false,
    camera,
    autoRender = true,
    autoResize = true,
    watchScroll = true,
  }: GPUCurtainsParams) {
    this.type = 'CurtainsGPU'

    this.options = {
      container,
      pixelRatio,
      sampleCount,
      camera,
      production,
      preferredFormat,
      alphaMode,
      autoRender,
      autoResize,
      watchScroll,
    }

    if (container) {
      this.setContainer(container)
    }
  }

  /**
   * Set the [container]{@link GPUCurtains#container}
   * @param container - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  setContainer(container: DOMElementParams['element']) {
    if (!container) {
      const container = document.createElement('div')
      container.setAttribute('id', 'curtains-gpu-canvas')
      document.body.appendChild(container)
      this.options.container = container
    } else {
      if (typeof container === 'string') {
        container = document.querySelector(container)

        if (!container) {
          const container = document.createElement('div')
          container.setAttribute('id', 'curtains-gpu-canvas')
          document.body.appendChild(container)
          this.options.container = container
        } else {
          this.options.container = container as HTMLElement
        }
      } else if (container instanceof Element) {
        this.options.container = container as HTMLElement
      }
    }

    this.container = this.options.container as HTMLElement

    this.setCurtains()
  }

  /**
   * Set the [curtains renderer]{@link GPUCurtainsRenderer}
   */
  setRenderer() {
    this.renderer = new GPUCurtainsRenderer({
      // TODO ...this.options?
      container: this.options.container,
      pixelRatio: this.options.pixelRatio,
      sampleCount: this.options.sampleCount,
      preferredFormat: this.options.preferredFormat,
      alphaMode: this.options.alphaMode,
      camera: this.options.camera,
      production: this.options.production,
      onError: () => this._onErrorCallback && this._onErrorCallback(),
      onContextLost: (info) => this._onContextLostCallback && this._onContextLostCallback(info),
    })
  }

  /**
   * Set the [curtains renderer context]{@link GPUCurtainsRenderer#setContext}
   * @async
   */
  async setRendererContext(): Promise<void> {
    await this.renderer.setContext()
  }

  /**
   * Restore the [renderer]{@link GPUCurtainsRenderer} context
   * @async
   */
  async restoreContext() {
    await this.renderer?.restoreContext()
  }

  /**
   * Set the various event listeners, set the [curtains renderer]{@link GPUCurtainsRenderer}, append the [canvas]{@link HTMLCanvasElement} to our [container]{@link GPUCurtains#container} and start rendering if needed
   */
  setCurtains() {
    this.initEvents()

    this.setRenderer()

    // only if auto render
    if (this.options.autoRender) {
      this.animate()
    }
  }

  /* RENDERER TRACKED OBJECTS */

  /**
   * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [ping pong planes]{@link PingPongPlane}
   */
  get pingPongPlanes(): PingPongPlane[] {
    return this.renderer?.pingPongPlanes
  }

  /**
   * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [shader passes]{@link ShaderPass}
   */
  get shaderPasses(): ShaderPass[] {
    return this.renderer?.shaderPasses
  }

  /**
   * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [meshes]{@link MeshBase}
   */
  get meshes(): MeshType[] {
    return this.renderer?.meshes
  }

  /**
   * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [DOM Meshes]{@link DOMMesh}
   */
  get domMeshes(): DOMMesh[] {
    return this.renderer?.domMeshes
  }

  /**
   * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [planes]{@link Plane}
   */
  get planes(): Plane[] {
    return this.renderer?.domMeshes.filter((domMesh) => domMesh.type === 'Plane') as Plane[]
  }

  /**
   * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [compute passes]{@link ComputePass}
   */
  get computePasses(): ComputePass[] {
    return this.renderer?.computePasses
  }

  /**
   * Get the [curtains renderer camera]{@link GPUCurtainsRenderer#camera}
   */
  get camera(): Camera {
    return this.renderer?.camera
  }

  /**
   * Set the [curtains renderer camera perspective]{@link GPUCurtainsRenderer#setPerspective}
   */
  setPerspective(fov = 50, near = 0.01, far = 50) {
    this.renderer?.setPerspective(fov, near, far)
  }

  /**
   * Set the [curtains renderer camera position]{@link GPUCurtainsRenderer#setCameraPosition}
   */
  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
    this.renderer?.setCameraPosition(position)
  }

  /* RESIZE */

  /**
   * Manually resize our [curtains renderer]{@link GPUCurtainsRenderer}
   */
  resize() {
    // TODO should be called when the renderer is resized instead?
    this.renderer?.resize()

    this._onAfterResizeCallback && this._onAfterResizeCallback()
  }

  /**
   * Get our [curtains renderer bounding rectangle]{@link GPUCurtainsRenderer#boundingRect}
   */
  get boundingRect(): DOMElementBoundingRect {
    return this.renderer?.boundingRect
  }

  /* SCROLL */

  /**
   * Set the [scroll manager]{@link GPUCurtains#scrollManager}
   */
  initScroll() {
    this.scrollManager = new ScrollManager({
      // init values
      scroll: {
        x: window.pageXOffset,
        y: window.pageYOffset,
      },
      delta: {
        x: 0,
        y: 0,
      },
      shouldWatch: this.options.watchScroll,
      onScroll: (delta) => this.updateScroll(delta),
    })
  }

  /**
   * Update all [DOMMeshes scroll position]{@link DOMMesh#updateScrollPosition}
   * @param delta - last [scroll delta values]{@link ScrollManager#delta}
   */
  updateScroll(delta: DOMPosition = { x: 0, y: 0 }) {
    this.renderer.domMeshes.forEach((mesh) => {
      if (mesh.domElement) {
        mesh.updateScrollPosition(delta)
      }
    })

    this._onScrollCallback && this._onScrollCallback()
  }

  /**
   * Update our [scrollManager scroll values]{@link ScrollManager#scroll}. Called each time the scroll has changed if [watchScroll]{@link GPUCurtainsOptions#watchScroll} is set to true. Could be called externally as well.
   * @param scroll
   */
  updateScrollValues(scroll: DOMPosition = { x: 0, y: 0 }) {
    this.scrollManager.updateScrollValues(scroll)
  }

  /**
   * Get our [scrollManager scroll deltas]{@link ScrollManager#delta}
   * @readonly
   */
  get scrollDelta(): DOMPosition {
    return this.scrollManager.delta
  }

  /**
   * Get our [scrollManager scroll values]{@link ScrollManager#scroll}
   * @readonly
   */
  get scrollValues(): DOMPosition {
    return this.scrollManager.scroll
  }

  /* EVENT LISTENERS */

  /**
   * Set the resize and scroll event listeners
   */
  initEvents() {
    resizeManager.useObserver(this.options.autoResize)

    this.initScroll()
  }

  /* EVENTS */

  /**
   * Called at each render frame
   * @param callback - callback to run at each render
   * @returns - our {@link GPUCurtains}
   */
  onRender(callback: () => void): GPUCurtains {
    if (callback) {
      this._onRenderCallback = callback
    }

    return this
  }

  /**
   * Called each time the [scroll values]{@link ScrollManager#scroll} changed
   * @param callback - callback to run each time the [scroll values]{@link ScrollManager#scroll} changed
   * @returns - our {@link GPUCurtains}
   */
  onScroll(callback: () => void): GPUCurtains {
    if (callback) {
      this._onScrollCallback = callback
    }

    return this
  }

  /**
   * Called each time the [resize]{@link GPUCurtains#resize} method has been called
   * @param callback - callback to run each time the [resize]{@link GPUCurtains#resize} method has been called
   * @returns - our {@link GPUCurtains}
   */
  onAfterResize(callback: () => void): GPUCurtains {
    if (callback) {
      this._onAfterResizeCallback = callback
    }

    return this
  }

  /**
   * Called if there's been an error while trying to set up the [curtains renderer]{@link GPUCurtainsRenderer} context
   * @param callback - callback to run if there's been an error while trying to set up the [curtains renderer]{@link GPUCurtainsRenderer} context
   * @returns - our {@link GPUCurtains}
   */
  onError(callback: () => void): GPUCurtains {
    if (callback) {
      this._onErrorCallback = callback
    }

    return this
  }

  /**
   * Called whenever the [curtains renderer]{@link GPUCurtainsRenderer} context is lost
   * @param callback - callback to run whenever the [curtains renderer]{@link GPUCurtainsRenderer} context is lost
   * @returns - our {@link GPUCurtains}
   */
  onContextLost(callback: (info?: GPUDeviceLostInfo) => void): GPUCurtains {
    if (callback) {
      this._onContextLostCallback = callback
    }

    return this
  }

  /**
   * Create a requestAnimationFrame loop and run it
   */
  animate() {
    this.render()
    this.animationFrameID = window.requestAnimationFrame(this.animate.bind(this))
  }

  /**
   * Renderer our [curtains renderer]{@link GPUCurtainsRenderer}
   */
  render() {
    this._onRenderCallback && this._onRenderCallback()

    this.renderer?.render()
  }

  /**
   * Destroy our {@link GPUCurtains} and [curtains renderer]{@link GPUCurtainsRenderer}
   */
  destroy() {
    if (this.animationFrameID) {
      window.cancelAnimationFrame(this.animationFrameID)
    }

    this.renderer?.destroy()
    this.scrollManager?.destroy()
    resizeManager.destroy()
  }
}
