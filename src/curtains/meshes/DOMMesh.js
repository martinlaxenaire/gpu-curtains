import { DOMObject3D } from '../objects3D/DOMObject3D'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import MeshTransformedMixin from '../../core/meshes/MeshTransformedMixin'
import MeshBaseMixin from '../../core/meshes/MeshBaseMixin'
import { throwWarning } from '../../utils/utils'

const defaultDOMMeshParams = {
  autoloadSources: true,
  watchScroll: true,
}

export class DOMMesh extends MeshTransformedMixin(MeshBaseMixin(DOMObject3D)) {
  // callbacks / events
  _onLoadingCallback = () => {
    /* allow empty callback */
  }

  constructor(renderer, element, parameters) {
    parameters = { ...defaultDOMMeshParams, ...parameters }

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isCurtainsRenderer(renderer, parameters.label ? parameters.label + ' DOMMesh' : 'DOMMesh')

    super(renderer, element, parameters)

    this.type = 'DOMMesh'

    const { autoloadSources } = parameters

    this.autoloadSources = autoloadSources

    this.sourcesReady = false
    this.setInitSources()

    this.renderer.domMeshes.push(this)
  }

  get ready() {
    return this._ready
  }

  set ready(value) {
    this._ready = value

    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback()
    }
  }

  get sourcesReady() {
    return this._sourcesReady
  }

  set sourcesReady(value) {
    this._sourcesReady = value

    if (this.DOMMeshReady) {
      this._onReadyCallback && this._onReadyCallback()
    }
  }

  get DOMMeshReady() {
    return this.ready && this.sourcesReady
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

  resetDOMElement(element) {
    if (!!element) {
      super.resetDOMElement(element)
    } else if (!element && !this.renderer.production) {
      throwWarning(
        `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
      )
    }
  }

  /** EVENTS **/

  onLoading(callback) {
    if (callback) {
      this._onLoadingCallback = callback
    }

    return this
  }
}
