import { DOMObject3D } from '../objects3D/DOMObject3D.mjs';
import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { ProjectedMeshBaseMixin } from '../../core/meshes/mixins/ProjectedMeshBaseMixin.mjs';
import { throwWarning } from '../../utils/utils.mjs';

const defaultDOMMeshParams = {
  autoloadSources: true,
  watchScroll: true
};
class DOMMesh extends ProjectedMeshBaseMixin(DOMObject3D) {
  /**
   * DOMMesh constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
   * @param parameters - {@link DOMMeshParams | parameters} used to create this {@link DOMMesh}
   */
  constructor(renderer, element, parameters) {
    super(renderer, element, { ...defaultDOMMeshParams, ...parameters });
    // callbacks / events
    /** function assigned to the {@link onLoading} callback */
    this._onLoadingCallback = (texture) => {
    };
    parameters = { ...defaultDOMMeshParams, ...parameters };
    renderer = renderer && renderer.renderer || renderer;
    isCurtainsRenderer(renderer, parameters.label ? parameters.label + " DOMMesh" : "DOMMesh");
    this.type = "DOMMesh";
    const { autoloadSources } = parameters;
    this.autoloadSources = autoloadSources;
    this.sourcesReady = false;
    this.setInitSources();
  }
  /**
   * Get/set whether our {@link material} and {@link geometry} are ready
   * @readonly
   */
  get ready() {
    return this._ready;
  }
  set ready(value) {
    this._ready = value;
    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback();
    }
  }
  /**
   * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded
   * @readonly
   */
  get sourcesReady() {
    return this._sourcesReady;
  }
  set sourcesReady(value) {
    this._sourcesReady = value;
    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback();
    }
  }
  /**
   * Get whether our {@link DOMMesh} is ready. A {@link DOMMesh} is ready when its {@link sourcesReady | sources are ready} and its {@link material} and {@link geometry} are ready.
   * @readonly
   */
  get DOMMeshReady() {
    return this.ready && this.sourcesReady;
  }
  /**
   * Add a {@link DOMMesh} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    super.addToScene();
    this.renderer.domMeshes.push(this);
  }
  /**
   * Remove a {@link DOMMesh} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    super.removeFromScene();
    this.renderer.domMeshes = this.renderer.domMeshes.filter(
      (m) => m.uuid !== this.uuid
    );
  }
  /**
   * Load initial {@link DOMMesh} sources if needed and create associated {@link Texture}
   */
  setInitSources() {
    let loaderSize = 0;
    let sourcesLoaded = 0;
    if (this.autoloadSources) {
      const images = this.domElement.element.querySelectorAll("img");
      const videos = this.domElement.element.querySelectorAll("video");
      const canvases = this.domElement.element.querySelectorAll("canvas");
      loaderSize = images.length + videos.length + canvases.length;
      const onSourceUploaded = (texture) => {
        sourcesLoaded++;
        this._onLoadingCallback && this._onLoadingCallback(texture);
        if (sourcesLoaded === loaderSize) {
          this.sourcesReady = true;
        }
      };
      if (!loaderSize) {
        this.sourcesReady = true;
      }
      if (images.length) {
        images.forEach((image) => {
          const texture = this.createTexture({
            name: image.getAttribute("data-texture-name") ?? "texture" + this.textures.length
          });
          texture.onSourceUploaded(() => onSourceUploaded(texture)).loadImage(image.src);
        });
      }
      if (videos.length) {
        videos.forEach((video) => {
          const texture = this.createTexture({
            name: video.getAttribute("data-texture-name") ?? "texture" + this.textures.length
          });
          texture.onSourceUploaded(() => onSourceUploaded(texture)).loadVideo(video);
        });
      }
      if (canvases.length) {
        canvases.forEach((canvas) => {
          const texture = this.createTexture({
            name: canvas.getAttribute("data-texture-name") ?? "texture" + this.textures.length
          });
          texture.onSourceUploaded(() => onSourceUploaded(texture)).loadCanvas(canvas);
        });
      }
    } else {
      this.sourcesReady = true;
    }
  }
  /**
   * Reset/change the {@link domElement | DOM Element}
   * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  resetDOMElement(element) {
    if (!!element) {
      super.resetDOMElement(element);
    } else if (!element && !this.renderer.production) {
      throwWarning(
        `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
      );
    }
  }
  /**
   * Get our {@link DOMMesh#domElement | DOM Element} {@link core/DOM/DOMElement.DOMElement#boundingRect | bounding rectangle} accounting for current {@link core/renderers/GPURenderer.GPURenderer#pixelRatio | renderer pixel ratio}
   */
  get pixelRatioBoundingRect() {
    const devicePixelRatio = window.devicePixelRatio ?? 1;
    const scaleBoundingRect = this.renderer.pixelRatio / devicePixelRatio;
    return Object.keys(this.domElement.boundingRect).reduce(
      (a, key) => ({ ...a, [key]: this.domElement.boundingRect[key] * scaleBoundingRect }),
      {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    );
  }
  /* EVENTS */
  /**
   * Called each time one of the initial sources associated {@link Texture#texture | GPU texture} has been uploaded to the GPU
   * @param callback - callback to call each time a {@link Texture#texture | GPU texture} has been uploaded to the GPU
   * @returns - our {@link DOMMesh}
   */
  onLoading(callback) {
    if (callback) {
      this._onLoadingCallback = callback;
    }
    return this;
  }
}

export { DOMMesh };
//# sourceMappingURL=DOMMesh.mjs.map
