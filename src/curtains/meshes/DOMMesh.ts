import { DOMObject3D } from '../objects3D/DOMObject3D'
import { isCurtainsRenderer } from '../../core/renderers/utils'
import MeshTransformedMixin, { MeshTransformedBaseClass } from '../../core/meshes/MeshTransformedMixin'
import MeshBaseMixin, { MeshBaseParams, MeshBaseRenderParams } from '../../core/meshes/MeshBaseMixin'
import { throwWarning } from '../../utils/utils'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../GPUCurtains'
import { Texture } from '../../core/textures/Texture'
import { AllowedGeometries } from '../../types/Materials'

/**
 * Base parameters to create a {@link DOMMesh}
 */
export interface DOMMeshBaseParams extends MeshBaseRenderParams {
  /** Whether to automatically create a {@link Texture} for all [images]{@link HTMLImageElement}, [videos]{@link HTMLVideoElement} and [canvases]{@link HTMLCanvasElement} child of the specified {@link DOMMesh} {@link HTMLElement} */
  autoloadSources?: boolean
  /** Whether to automatically update the {@link DOMMesh} position on scroll */
  watchScroll?: boolean
}

/**
 * Parameters to create a {@link DOMMesh}
 */
export interface DOMMeshParams extends DOMMeshBaseParams {
  /** {@link Geometry} to use with the {@link DOMMesh} */
  geometry: AllowedGeometries
}

/** @const - default {@link DOMMesh} parameters */
const defaultDOMMeshParams = {
  autoloadSources: true,
  watchScroll: true,
} as DOMMeshBaseParams

/**
 * DOMMesh class:
 * Create a {@link Mesh} based on a {@link DOMObject3D}, which allow the {@link Mesh} to be scaled and positioned based on a {@link HTMLElement} [bounding rectangle]{@link DOMElementBoundingRect}
 * TODO!
 * @extends MeshTransformedMixin
 * @mixes {MeshBaseMixin}
 */
export class DOMMesh extends MeshTransformedMixin(DOMObject3D) {
  /** Whether to automatically create a {@link Texture} for all [images]{@link HTMLImageElement}, [videos]{@link HTMLVideoElement} and [canvases]{@link HTMLCanvasElement} child of the specified {@link DOMMesh} {@link HTMLElement} */
  autoloadSources: boolean
  /** Whether all the sources have been successfully loaded */
  _sourcesReady: boolean

  // callbacks / events
  /** function assigned to the [onLoading]{@link DOMMesh#onLoading} callback */
  _onLoadingCallback = (texture: Texture): void => {
    /* allow empty callback */
  }

  /**
   * DOMMesh constructor
   * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
   * @param parameters - [parameters]{@link DOMMeshParams} used to create this {@link DOMMesh}
   */
  constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: string | HTMLElement, parameters: DOMMeshParams) {
    super(renderer, element, { ...defaultDOMMeshParams, ...parameters })

    parameters = { ...defaultDOMMeshParams, ...parameters }

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as GPUCurtainsRenderer)

    isCurtainsRenderer(renderer, parameters.label ? parameters.label + ' DOMMesh' : 'DOMMesh')

    this.type = 'DOMMesh'

    const { autoloadSources } = parameters

    this.autoloadSources = autoloadSources

    this.sourcesReady = false
    this.setInitSources()
  }

  /**
   * Get/set whether our [material]{@link DOMMesh#material} and [geometry]{@link DOMMesh#geometry} are ready
   * @readonly
   */
  get ready(): boolean {
    return this._ready
  }

  set ready(value: boolean) {
    this._ready = value

    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback()
    }
  }

  /**
   * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded
   * @readonly
   */
  get sourcesReady(): boolean {
    return this._sourcesReady
  }

  set sourcesReady(value: boolean) {
    this._sourcesReady = value

    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback()
    }
  }

  /**
   * Get whether our {@link DOMMesh} is ready. A {@link DOMMesh} is ready when its [sources are ready]{@link DOMMesh#sourcesReady} and its [material]{@link DOMMesh#material} and [geometry]{@link DOMMesh#geometry} are ready.
   * @readonly
   */
  get DOMMeshReady(): boolean {
    return this.ready && this.sourcesReady
  }

  /**
   * Add a {@link DOMMesh} to the renderer and the {@link Scene}
   */
  addToScene() {
    super.addToScene()
    ;(this.renderer as GPUCurtainsRenderer).domMeshes.push(this)
  }

  /**
   * Remove a {@link DOMMesh} from the renderer and the {@link Scene}
   */
  removeFromScene() {
    super.removeFromScene()
    ;(this.renderer as GPUCurtainsRenderer).domMeshes = (this.renderer as GPUCurtainsRenderer).domMeshes.filter(
      (m) => m.uuid !== this.uuid
    )
  }

  /**
   * Load initial {@link DOMMesh} sources if needed and create associated [textures]{@link Texture}
   */
  setInitSources() {
    let loaderSize = 0
    let sourcesLoaded = 0

    if (this.autoloadSources) {
      const images = this.domElement.element.querySelectorAll('img')
      const videos = this.domElement.element.querySelectorAll('video')
      const canvases = this.domElement.element.querySelectorAll('canvas')

      loaderSize = images.length + videos.length + canvases.length

      const onSourceUploaded = (texture) => {
        sourcesLoaded++

        this._onLoadingCallback && this._onLoadingCallback(texture)

        if (sourcesLoaded === loaderSize) {
          this.sourcesReady = true
        }
      }

      if (!loaderSize) {
        this.sourcesReady = true
      }

      // load images
      if (images.length) {
        images.forEach((image) => {
          const texture = this.createTexture({
            name: image.getAttribute('data-texture-name') ?? 'texture' + this.textures.length,
          })

          texture.onSourceUploaded(() => onSourceUploaded(texture)).loadImage(image.src)
        })
      }

      // load videos
      if (videos.length) {
        videos.forEach((video) => {
          const texture = this.createTexture({
            name: video.getAttribute('data-texture-name') ?? 'texture' + this.textures.length,
          })

          texture.onSourceUploaded(() => onSourceUploaded(texture)).loadVideo(video)
        })
      }

      // load canvases
      if (canvases.length) {
        canvases.forEach((canvas) => {
          const texture = this.createTexture({
            name: canvas.getAttribute('data-texture-name') ?? 'texture' + this.textures.length,
          })

          texture.onSourceUploaded(() => onSourceUploaded(texture)).loadCanvas(canvas)
        })
      }
    } else {
      this.sourcesReady = true
    }
  }

  /**
   * Reset/change a [DOMMesh element]{@link DOMMesh#domElement}
   * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
   */
  resetDOMElement(element: string | HTMLElement) {
    if (!!element) {
      super.resetDOMElement(element)
    } else if (!element && !this.renderer.production) {
      throwWarning(
        `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
      )
    }
  }

  /* EVENTS */

  /**
   * Called each time one of the initial sources associated [texture]{@link Texture} has been uploaded to the GPU
   * @param callback - callback to call each time a [texture]{@link Texture} has been uploaded to the GPU
   * @returns - our {@link DOMMesh}
   */
  onLoading(callback: (texture: Texture) => void): DOMMesh {
    if (callback) {
      this._onLoadingCallback = callback
    }

    return this
  }
}
