import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer.mjs';
import { ScrollManager } from '../utils/ScrollManager.mjs';
import { GPURenderer } from '../core/renderers/GPURenderer.mjs';
import { Plane } from './meshes/Plane.mjs';
import { GPUCameraRenderer } from '../core/renderers/GPUCameraRenderer.mjs';
import { GPUDeviceManager } from '../core/renderers/GPUDeviceManager.mjs';

class GPUCurtains {
  /**
   * GPUCurtains constructor
   * @param parameters - {@link GPUCurtainsParams | parameters} used to create this {@link GPUCurtains}.
   */
  constructor({
    container,
    label,
    pixelRatio = window.devicePixelRatio ?? 1,
    context = {},
    production = false,
    adapterOptions = {},
    renderPass,
    camera,
    lights,
    autoRender = true,
    autoResize = true,
    watchScroll = true
  } = {}) {
    // callbacks / events
    /** function assigned to the {@link onScroll} callback. */
    this._onScrollCallback = () => {
    };
    /** function assigned to the {@link onError} callback. */
    this._onErrorCallback = () => {
    };
    /** function assigned to the {@link onContextLost} callback. */
    this._onContextLostCallback = () => {
    };
    /** function assigned to the {@link onContextLost} callback. */
    this._onContextDestroyedCallback = () => {
    };
    this.type = "CurtainsGPU";
    this.options = {
      container,
      label,
      pixelRatio,
      camera,
      lights,
      production,
      adapterOptions,
      context,
      renderPass,
      autoRender,
      autoResize,
      watchScroll
    };
    this.setDeviceManager();
    if (container) {
      this.setContainer(container);
    }
    this.initScroll();
  }
  /**
   * Set the {@link GPUCurtains.container | container}.
   * @param container - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
   */
  setContainer(container) {
    if (!container) {
      const container2 = document.createElement("div");
      container2.setAttribute("id", "curtains-gpu-canvas");
      document.body.appendChild(container2);
      this.options.container = container2;
    } else {
      if (typeof container === "string") {
        container = document.querySelector(container);
        if (!container) {
          const container2 = document.createElement("div");
          container2.setAttribute("id", "curtains-gpu-canvas");
          document.body.appendChild(container2);
          this.options.container = container2;
        } else {
          this.options.container = container;
        }
      } else if (container instanceof Element) {
        this.options.container = container;
      }
    }
    this.container = this.options.container;
    this.setMainRenderer();
  }
  /**
   * Set the default {@link GPUCurtainsRenderer | renderer}.
   */
  setMainRenderer() {
    this.createCurtainsRenderer({
      // TODO ...this.options?
      label: this.options.label || "GPUCurtains main GPUCurtainsRenderer",
      container: this.options.container,
      pixelRatio: this.options.pixelRatio,
      autoResize: this.options.autoResize,
      context: this.options.context,
      renderPass: this.options.renderPass,
      camera: this.options.camera,
      lights: this.options.lights
    });
  }
  /**
   * Patch the options with default values before creating a {@link Renderer}.
   * @param parameters - Parameters to patch.
   */
  patchRendererOptions(parameters) {
    if (parameters.pixelRatio === void 0) parameters.pixelRatio = this.options.pixelRatio;
    if (parameters.autoResize === void 0) parameters.autoResize = this.options.autoResize;
    return parameters;
  }
  /**
   * Create a new {@link GPURenderer} instance.
   * @param parameters - {@link GPURendererParams | parameters} to use.
   */
  createRenderer(parameters) {
    parameters = this.patchRendererOptions(parameters);
    return new GPURenderer({ ...parameters, deviceManager: this.deviceManager });
  }
  /**
   * Create a new {@link GPUCameraRenderer} instance.
   * @param parameters - {@link GPUCameraRendererParams | parameters} to use.
   */
  createCameraRenderer(parameters) {
    parameters = this.patchRendererOptions(parameters);
    return new GPUCameraRenderer({ ...parameters, deviceManager: this.deviceManager });
  }
  /**
   * Create a new {@link GPUCurtainsRenderer} instance.
   * @param parameters - {@link GPUCameraRendererParams | parameters} to use.
   */
  createCurtainsRenderer(parameters) {
    parameters = this.patchRendererOptions(parameters);
    return new GPUCurtainsRenderer({ ...parameters, deviceManager: this.deviceManager });
  }
  /**
   * Set our {@link GPUDeviceManager}.
   */
  setDeviceManager() {
    this.deviceManager = new GPUDeviceManager({
      label: "GPUCurtains default device",
      production: this.options.production,
      adapterOptions: this.options.adapterOptions,
      autoRender: this.options.autoRender,
      onError: () => setTimeout(() => {
        this._onErrorCallback && this._onErrorCallback();
      }, 0),
      onDeviceLost: (info) => this._onContextLostCallback && this._onContextLostCallback(info),
      onDeviceDestroyed: (info) => this._onContextDestroyedCallback && this._onContextDestroyedCallback(info)
    });
  }
  /**
   * Get all created {@link Renderer}.
   * @readonly
   */
  get renderers() {
    return this.deviceManager.renderers;
  }
  /**
   * Get the first created {@link Renderer} if any.
   * @readonly
   */
  get renderer() {
    return this.renderers[0];
  }
  /**
   * Set the {@link GPUDeviceManager} {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} if possible, then set all created {@link Renderer} contexts.
   * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
   */
  async setDevice({ adapter = null, device = null } = {}) {
    await this.deviceManager.init({ adapter, device });
  }
  /**
   * Restore the {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device}.
   */
  async restoreContext() {
    await this.deviceManager.restoreDevice();
  }
  /* RENDERER TRACKED OBJECTS */
  /**
   * Get all the created {@link PingPongPlane}.
   * @readonly
   */
  get pingPongPlanes() {
    return this.renderers?.map((renderer) => renderer.pingPongPlanes).flat();
  }
  /**
   * Get all the created {@link ShaderPass}.
   * @readonly
   */
  get shaderPasses() {
    return this.renderers?.map((renderer) => renderer.shaderPasses).flat();
  }
  /**
   * Get all the created {@link SceneStackedMesh | meshes}.
   * @readonly
   */
  get meshes() {
    return this.renderers?.map((renderer) => renderer.meshes).flat();
  }
  /**
   * Get all the created {@link DOMMesh | DOM Meshes} (including {@link Plane | planes}).
   * @readonly
   */
  get domMeshes() {
    return this.renderers?.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domMeshes).flat();
  }
  /**
   * Get all created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll.
   * @readonly
   */
  get domObjects() {
    return this.renderers?.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domObjects).flat();
  }
  /**
   * Get all the created {@link Plane | planes}.
   * @readonly
   */
  get planes() {
    return this.domMeshes.filter((domMesh) => domMesh instanceof Plane);
  }
  /**
   * Get all the created {@link ComputePass | compute passes}.
   * @readonly
   */
  get computePasses() {
    return this.renderers?.map((renderer) => renderer.computePasses).flat();
  }
  /**
   * Get our {@link GPUCurtainsRenderer#boundingRect | default GPUCurtainsRenderer bounding rectangle}.
   */
  get boundingRect() {
    return this.renderer?.boundingRect;
  }
  /* SCROLL */
  /**
   * Set the {@link scrollManager}.
   */
  initScroll() {
    this.scrollManager = new ScrollManager({
      // init values
      scroll: {
        x: window.pageXOffset,
        y: window.pageYOffset
      },
      delta: {
        x: 0,
        y: 0
      },
      shouldWatch: this.options.watchScroll,
      onScroll: (delta) => this.updateScroll(delta)
    });
  }
  /**
   * Update all {@link DOMMesh#updateScrollPosition | DOMMesh scroll positions}.
   * @param delta - Last {@link ScrollManager#delta | scroll delta values}.
   */
  updateScroll(delta = { x: 0, y: 0 }) {
    this.domObjects.forEach((domObject) => {
      if (domObject.domElement && domObject.watchScroll) {
        domObject.updateScrollPosition(delta);
      }
    });
    this._onScrollCallback && this._onScrollCallback();
  }
  /**
   * Update our {@link ScrollManager#scroll | scrollManager scroll values}. Called each time the scroll has changed if {@link GPUCurtains#options.watchScroll | watchScroll option} is set to true. Could be called externally as well.
   * @param scroll - New {@link DOMPosition | scroll values}.
   */
  updateScrollValues(scroll = { x: 0, y: 0 }) {
    this.scrollManager.updateScrollValues(scroll);
  }
  /**
   * Get our {@link ScrollManager#delta | scrollManager delta values}.
   * @readonly
   */
  get scrollDelta() {
    return this.scrollManager.delta;
  }
  /**
   * Get our {@link ScrollManager#scroll | scrollManager scroll values}.
   * @readonly
   */
  get scrollValues() {
    return this.scrollManager.scroll;
  }
  /* EVENTS */
  /**
   * Called each frame before rendering.
   * @param callback - callback to run at each render.
   * @returns - our {@link GPUCurtains}.
   */
  onBeforeRender(callback) {
    this.deviceManager.onBeforeRender(callback);
    return this;
  }
  /**
   * Called each frame after rendering.
   * @param callback - callback to run at each render.
   * @returns - our {@link GPUCurtains}.
   */
  onAfterRender(callback) {
    this.deviceManager.onAfterRender(callback);
    return this;
  }
  /**
   * Called each time the {@link ScrollManager#scroll | scrollManager scroll values} changed.
   * @param callback - callback to run each time the {@link ScrollManager#scroll | scrollManager scroll values} changed.
   * @returns - our {@link GPUCurtains}.
   */
  onScroll(callback) {
    if (callback) {
      this._onScrollCallback = callback;
    }
    return this;
  }
  /**
   * Called if there's been an error while trying to create the {@link GPUDeviceManager#device | device}.
   * @param callback - callback to run if there's been an error while trying to create the {@link GPUDeviceManager#device | device}.
   * @returns - our {@link GPUCurtains}.
   */
  onError(callback) {
    if (callback) {
      this._onErrorCallback = callback;
    }
    return this;
  }
  /**
   * Called whenever the {@link GPUDeviceManager#device | device} is lost.
   * @param callback - callback to run whenever the {@link GPUDeviceManager#device | device} is lost.
   * @returns - our {@link GPUCurtains}.
   */
  onContextLost(callback) {
    if (callback) {
      this._onContextLostCallback = callback;
    }
    return this;
  }
  /**
   * Called whenever the {@link GPUDeviceManager#device | device} has been intentionally destroyed.
   * @param callback - callback to run whenever the {@link GPUDeviceManager#device | device} has been destroyed.
   * @returns - our {@link GPUCurtains}.
   */
  onContextDestroyed(callback) {
    if (callback) {
      this._onContextDestroyedCallback = callback;
    }
    return this;
  }
  /**
   * Render our {@link GPUDeviceManager}.
   */
  render() {
    this.deviceManager.render();
  }
  /**
   * Destroy our {@link GPUCurtains} and {@link GPUDeviceManager}.
   */
  destroy() {
    this.deviceManager.destroy();
    this.scrollManager?.destroy();
  }
}

export { GPUCurtains };
