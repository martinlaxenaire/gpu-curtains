import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer'
import { ScrollManager } from '../utils/ScrollManager'
import { resizeManager } from '../utils/ResizeManager'
import { Vec3 } from '../math/Vec3'
import { PingPongPlane } from './meshes/PingPongPlane'
import { ShaderPass } from '../core/renderPasses/ShaderPass'
import { GPURenderer, GPURendererParams, ProjectedMesh } from '../core/renderers/GPURenderer'
import { DOMMesh } from './meshes/DOMMesh'
import { Plane } from './meshes/Plane'
import { ComputePass } from '../core/computePasses/ComputePass'
import { Camera, CameraBasePerspectiveOptions } from '../core/camera/Camera'
import { DOMElement, DOMElementBoundingRect, DOMElementParams, DOMPosition } from '../core/DOM/DOMElement'
import { GPUCameraRenderer, GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer'
import { GPUDeviceManager } from '../core/renderers/GPUDeviceManager'
import { Renderer } from '../core/renderers/utils'

/**
 * Options used to create a {@link GPUCurtains}
 */
interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'deviceManager'> {
  /** Whether {@link GPUCurtains} should create its own requestAnimationFrame loop to render or not */
  autoRender?: boolean
  /** Whether {@link GPUCurtains} should handle all resizing by itself or not */
  autoResize?: boolean
  /** Whether {@link GPUCurtains} should listen to scroll event or not */
  watchScroll?: boolean
  /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
  production: GPUDeviceManager['production']
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

  /** {@link GPUDeviceManager} used to handle the {@link GPUAdapter} and {@link GPUDevice} */
  deviceManager: GPUDeviceManager

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

    this.setDeviceManager()

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
   * Set the default [curtains renderer]{@link GPUCurtainsRenderer}
   */
  setMainRenderer() {
    this.createCurtainsRenderer({
      deviceManager: this.deviceManager,
      // TODO ...this.options?
      container: this.options.container,
      pixelRatio: this.options.pixelRatio,
      sampleCount: this.options.sampleCount,
      preferredFormat: this.options.preferredFormat,
      alphaMode: this.options.alphaMode,
      camera: this.options.camera,
    })
  }

  /**
   * Patch the options with default values before creating a [renderer]{@link Renderer}
   * @param options - options to patch
   */
  patchRendererOptions<T extends GPURendererParams | GPUCameraRendererParams>(options: T): T {
    if (options.pixelRatio === undefined) options.pixelRatio = this.options.pixelRatio
    if (options.sampleCount === undefined) options.sampleCount = this.options.sampleCount

    return options
  }

  /**
   * Create a new {@link GPURenderer} instance
   * @param options - [options]{@link GPURendererParams} to use
   */
  createRenderer(options: GPURendererParams): GPURenderer {
    options = this.patchRendererOptions(options)

    return new GPURenderer({ ...options, deviceManager: this.deviceManager })
  }

  /**
   * Create a new {@link GPUCameraRenderer} instance
   * @param options - [options]{@link GPUCameraRendererParams} to use
   */
  createCameraRenderer(options: GPUCameraRendererParams): GPUCameraRenderer {
    options = this.patchRendererOptions(options)

    return new GPUCameraRenderer({ ...options, deviceManager: this.deviceManager })
  }

  /**
   * Create a new {@link GPUCurtainsRenderer} instance
   * @param options - [options]{@link GPUCameraRendererParams} to use
   */
  createCurtainsRenderer(options: GPUCameraRendererParams): GPUCurtainsRenderer {
    options = this.patchRendererOptions(options)

    return new GPUCurtainsRenderer({ ...options, deviceManager: this.deviceManager })
  }

  /**
   * Set our [device manager]{@link GPUDeviceManager}
   */
  setDeviceManager() {
    this.deviceManager = new GPUDeviceManager({
      label: 'GPUCurtains default device',
      production: this.options.production,
      onError: () => this._onErrorCallback && this._onErrorCallback(),
      onDeviceLost: (info) => this._onContextLostCallback && this._onContextLostCallback(info),
    })
  }

  /**
   * Get all created [renderers]{@link Renderer}
   * @readonly
   */
  get renderers(): Renderer[] {
    return this.deviceManager.renderers
  }

  /**
   * Get the default {@link GPUCurtainsRenderer} created
   * @readonly
   */
  get renderer(): GPUCurtainsRenderer {
    return this.renderers[0] as GPUCurtainsRenderer
  }

  /**
   * Set the [device manager]{@link GPUDeviceManager} [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} if possible, then set all created [renderers]{@link Renderer} contexts
   */
  async setDevice() {
    await this.deviceManager.init()
  }

  /**
   * Restore the [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device}
   * @async
   */
  async restoreContext() {
    await this.deviceManager.restoreDevice()
  }

  /**
   * Set the various event listeners, set the [curtains renderer]{@link GPUCurtainsRenderer}, append the [canvas]{@link HTMLCanvasElement} to our [container]{@link GPUCurtains#container} and start rendering if needed
   */
  setCurtains() {
    this.initEvents()

    this.setMainRenderer()

    // only if auto render
    if (this.options.autoRender) {
      this.animate()
    }
  }

  /* RENDERER TRACKED OBJECTS */

  /**
   * Get all the created [ping pong planes]{@link PingPongPlane}
   * @readonly
   */
  get pingPongPlanes(): PingPongPlane[] {
    return this.renderers?.map((renderer) => renderer.pingPongPlanes).flat()
  }

  /**
   * Get all the created [shader passes]{@link ShaderPass}
   * @readonly
   */
  get shaderPasses(): ShaderPass[] {
    return this.renderers?.map((renderer) => renderer.shaderPasses).flat()
  }

  /**
   * Get all the created [meshes]{@link MeshBase}
   * @readonly
   */
  get meshes(): ProjectedMesh[] {
    return this.renderers?.map((renderer) => renderer.meshes).flat()
  }

  /**
   * Get all the created [DOM Meshes]{@link DOMMesh} (including [planes]{@link Plane})
   * @readonly
   */
  get domMeshes(): DOMMesh[] {
    return this.renderers
      ?.filter((renderer) => renderer instanceof GPUCurtainsRenderer)
      .map((renderer: GPUCurtainsRenderer) => renderer.domMeshes)
      .flat()
  }

  /**
   * Get all the created [planes]{@link Plane}
   * @readonly
   */
  get planes(): Plane[] {
    return this.domMeshes.filter((domMesh) => domMesh instanceof Plane) as Plane[]
  }

  /**
   * Get all the created [compute passes]{@link ComputePass}
   * @readonly
   */
  get computePasses(): ComputePass[] {
    return this.renderers?.map((renderer) => renderer.computePasses).flat()
  }

  /**
   * Get the [default curtains renderer camera]{@link GPUCurtainsRenderer#camera}
   * @readonly
   */
  get camera(): Camera {
    return this.renderer?.camera
  }

  /**
   * Set the [default curtains renderer camera perspective]{@link GPUCurtainsRenderer#setPerspective}
   * @param parameters - [parameters]{@link CameraBasePerspectiveOptions} to use for the perspective
   */
  setPerspective({ fov = 50, near = 0.01, far = 50 }: CameraBasePerspectiveOptions = {}) {
    this.renderer?.setPerspective({ fov, near, far })
  }

  /**
   * Set the default [curtains renderer camera position]{@link GPUCurtainsRenderer#setCameraPosition}
   * @param position - new [position]{@link Camera#position}
   */
  setCameraPosition(position: Vec3 = new Vec3(0, 0, 1)) {
    this.renderer?.setCameraPosition(position)
  }

  /**
   * Get our [default curtains renderer bounding rectangle]{@link GPUCurtainsRenderer#boundingRect}
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
    this.domMeshes.forEach((mesh) => {
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
   * Called if there's been an error while trying to create the [device]{@link GPUDeviceManager#device}
   * @param callback - callback to run if there's been an error while trying to create the [device]{@link GPUDeviceManager#device}
   * @returns - our {@link GPUCurtains}
   */
  onError(callback: () => void): GPUCurtains {
    if (callback) {
      this._onErrorCallback = callback
    }

    return this
  }

  /**
   * Called whenever the [device]{@link GPUDeviceManager#device} is lost
   * @param callback - callback to run whenever the [device]{@link GPUDeviceManager#device} is lost
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
   * Renderer our [renderers]{@link GPUCurtains#renderers}
   */
  render() {
    this._onRenderCallback && this._onRenderCallback()

    this.deviceManager.render()
  }

  /**
   * Destroy our {@link GPUCurtains} and [device manager]{@link GPUDeviceManager}
   */
  destroy() {
    if (this.animationFrameID) {
      window.cancelAnimationFrame(this.animationFrameID)
    }

    this.deviceManager.destroy()
    this.scrollManager?.destroy()
    resizeManager.destroy()
  }
}
