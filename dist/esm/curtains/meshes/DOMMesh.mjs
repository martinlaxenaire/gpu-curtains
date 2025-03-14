import { DOMObject3D } from '../objects3D/DOMObject3D.mjs';
import { isCurtainsRenderer } from '../../core/renderers/utils.mjs';
import { ProjectedMeshBaseMixin } from '../../core/meshes/mixins/ProjectedMeshBaseMixin.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { DOMTexture } from '../textures/DOMTexture.mjs';

const defaultDOMMeshParams = {
  autoloadSources: true,
  watchScroll: true,
  domTextures: []
};
class DOMMesh extends ProjectedMeshBaseMixin(DOMObject3D) {
  /**
   * DOMMesh constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
   * @param parameters - {@link DOMMeshParams | parameters} used to create this {@link DOMMesh}
   */
  constructor(renderer, element, parameters) {
    parameters = { ...defaultDOMMeshParams, ...parameters };
    const { autoloadSources, watchScroll, domTextures, ...projectedMeshParams } = parameters;
    super(renderer, element, parameters);
    // callbacks / events
    /** function assigned to the {@link onLoading} callback */
    this._onLoadingCallback = (texture) => {
    };
    isCurtainsRenderer(renderer, parameters.label ? parameters.label + " DOMMesh" : "DOMMesh");
    this.type = "DOMMesh";
    this.domTextures = [];
    domTextures.forEach((texture) => {
      this.addTexture(texture);
      this.onDOMTextureAdded(texture);
    });
    this.autoloadSources = autoloadSources;
    this.sourcesReady = false;
    this.setInitSources();
  }
  /**
   * Set or reset this {@link DOMMesh} {@link DOMMesh.renderer | renderer}.
   * @param renderer - New {@link GPUCurtainsRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    if (this.renderer) {
      this.renderer.domMeshes = this.renderer.domMeshes.filter((m) => m.uuid !== this.uuid);
    }
    renderer = isCurtainsRenderer(renderer, this.options.label + " DOMMesh");
    super.setRenderer(renderer);
    this.renderer = renderer;
    this.renderer.domMeshes.push(this);
  }
  /**
   * Get/set whether our {@link material} and {@link geometry} are ready.
   * @readonly
   */
  get ready() {
    return this._ready;
  }
  set ready(value) {
    if (value && !this._ready && this.sourcesReady) {
      this._onReadyCallback && this._onReadyCallback();
    }
    this._ready = value;
  }
  /**
   * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded.
   * @readonly
   */
  get sourcesReady() {
    return this._sourcesReady;
  }
  set sourcesReady(value) {
    if (value && !this._sourcesReady && this.ready) {
      this._onReadyCallback && this._onReadyCallback();
    }
    this._sourcesReady = value;
  }
  /**
   * Add a {@link DOMMesh} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
   * @param addToRenderer - whether to add this {@link DOMMesh} to the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}.
   */
  addToScene(addToRenderer = false) {
    super.addToScene(addToRenderer);
    if (addToRenderer) {
      this.renderer.domMeshes.push(this);
    }
  }
  /**
   * Remove a {@link DOMMesh} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
   * @param removeFromRenderer - whether to remove this {@link DOMMesh} from the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}.
   */
  removeFromScene(removeFromRenderer = false) {
    super.removeFromScene(removeFromRenderer);
    if (removeFromRenderer) {
      this.renderer.domMeshes = this.renderer.domMeshes.filter((m) => m.uuid !== this.uuid);
    }
  }
  /**
   * Resize the {@link textures} and {@link domTextures}.
   */
  resizeTextures() {
    super.resizeTextures();
    this.domTextures?.forEach((texture) => {
      texture.resize();
    });
  }
  /**
   * Apply scale and update {@link DOMTexture#modelMatrix | DOMTexture modelMatrix}.
   */
  applyScale() {
    super.applyScale();
    this.domTextures?.forEach((texture) => {
      texture.updateModelMatrix();
    });
  }
  /* DOM TEXTURES */
  /**
   * Create a new {@link DOMTexture}.
   * @param options - {@link DOMTextureParams | DOMTexture parameters}.
   * @returns - newly created {@link DOMTexture}.
   */
  createDOMTexture(options) {
    const defaultName = "texture" + this.textures.length;
    if (!options.label) {
      options.label = this.options.label + " " + (options.name ?? defaultName);
    }
    if (!options.name) {
      options.name = defaultName;
    }
    const { viewDimension, useTransform, ...domTextureParams } = this.options.texturesOptions;
    const texturesOptions = { ...options, ...domTextureParams };
    if (this.renderBundle) {
      texturesOptions.useExternalTextures = false;
    }
    const domTexture = new DOMTexture(this.renderer, texturesOptions);
    this.addTexture(domTexture);
    this.onDOMTextureAdded(domTexture);
    return domTexture;
  }
  /**
   * Callback run when a new {@link DOMTexture} has been added.
   * @param domTexture - newly created DOMTexture.
   */
  onDOMTextureAdded(domTexture) {
    domTexture.mesh = this;
    this.domTextures.push(domTexture);
  }
  /**
   * Load initial {@link DOMMesh} sources if needed and create associated {@link DOMTexture}.
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
          const texture = this.createDOMTexture({
            name: image.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
          });
          texture.onAllSourcesUploaded(() => onSourceUploaded(texture)).loadImage(image.src);
        });
      }
      if (videos.length) {
        videos.forEach((video) => {
          const texture = this.createDOMTexture({
            name: video.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
          });
          texture.onAllSourcesUploaded(() => onSourceUploaded(texture)).loadVideo(video);
        });
      }
      if (canvases.length) {
        canvases.forEach((canvas) => {
          const texture = this.createDOMTexture({
            name: canvas.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
          });
          texture.onAllSourcesUploaded(() => onSourceUploaded(texture)).loadCanvas(canvas);
        });
      }
    } else {
      this.sourcesReady = true;
    }
  }
  /**
   * Reset/change the {@link domElement | DOM Element}.
   * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
   */
  resetDOMElement(element) {
    if (!!element) {
      super.resetDOMElement(element);
      this.domTextures.forEach((texture) => texture.resize());
    } else if (!element && !this.renderer.production) {
      throwWarning(
        `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
      );
    }
  }
  /**
   * Get our {@link DOMMesh#domElement | DOM Element} {@link core/DOM/DOMElement.DOMElement#boundingRect | bounding rectangle} accounting for current {@link core/renderers/GPURenderer.GPURenderer#pixelRatio | renderer pixel ratio}.
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
  /**
   * Compute the Mesh geometry if needed.
   */
  computeGeometry() {
    super.computeGeometry();
    this.boundingBox.copy(this.geometry.boundingBox);
  }
  /* EVENTS */
  /**
   * Called each time one of the initial sources associated {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU.
   * @param callback - callback to call each time a {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU.
   * @returns - our {@link DOMMesh}.
   */
  onLoading(callback) {
    if (callback) {
      this._onLoadingCallback = callback;
    }
    return this;
  }
}

export { DOMMesh };
