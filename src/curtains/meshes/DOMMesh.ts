import { DOMObject3D } from '../objects3D/DOMObject3D'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import MeshTransformedMixin from '../../core/meshes/MeshTransformedMixin'
import MeshBaseMixin from '../../core/meshes/MeshBaseMixin'
import { MeshBaseParams } from '../../types/core/meshes/MeshBaseMixin'
import { throwWarning } from '../../utils/utils'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../GPUCurtains'
import { Texture } from '../../core/textures/Texture'
import { AllowedGeometries } from '../../types/core/materials/RenderMaterial'

export interface DOMMeshBaseParams extends MeshBaseParams {
  autoloadSources?: boolean
  watchScroll?: boolean
}

export interface DOMMeshParams extends DOMMeshBaseParams {
  geometry: AllowedGeometries
}

const defaultDOMMeshParams = {
  autoloadSources: true,
  watchScroll: true,
} as DOMMeshBaseParams

export class DOMMesh extends MeshTransformedMixin(MeshBaseMixin(DOMObject3D)) {
  autoloadSources: boolean
  _sourcesReady: boolean

  // callbacks / events
  _onLoadingCallback = (texture: Texture): void => {
    /* allow empty callback */
  }

  constructor(renderer: GPUCurtainsRenderer | GPUCurtains, element: string | HTMLElement, parameters: DOMMeshParams) {
    super(renderer, element, parameters)

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

  get ready(): boolean {
    return this._ready
  }

  set ready(value: boolean) {
    this._ready = value

    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback()
    }
  }

  get sourcesReady(): boolean {
    return this._sourcesReady
  }

  set sourcesReady(value: boolean) {
    this._sourcesReady = value

    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback()
    }
  }

  get DOMMeshReady(): boolean {
    return this.ready && this.sourcesReady
  }

  addToScene() {
    super.addToScene()
    this.renderer.domMeshes.push(this)
  }

  removeFromScene() {
    super.removeFromScene()
    this.renderer.domMeshes = this.renderer.domMeshes.filter((m) => m.uuid !== this.uuid)
  }

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

  resetDOMElement(element: string | HTMLElement) {
    if (!!element) {
      super.resetDOMElement(element)
    } else if (!element && !this.renderer.production) {
      throwWarning(
        `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
      )
    }
  }

  /** EVENTS **/

  onLoading(callback: (texture: Texture) => void): DOMMesh {
    if (callback) {
      this._onLoadingCallback = callback
    }

    return this
  }
}
