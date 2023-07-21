import { DOMObject3D } from '../objects3D/DOMObject3D'
import { isCurtainsRenderer } from '../../utils/renderer-utils'
import MeshTransformedMixin from '../../core/meshes/MeshTransformedMixin'
import MeshBaseMixin from '../../core/meshes/MeshBaseMixin'

const defaultDOMMeshParams = {
  autoloadSources: true,
  watchScroll: true,
}

export class DOMMesh extends MeshTransformedMixin(MeshBaseMixin(DOMObject3D)) {
  constructor(renderer, element, parameters) {
    parameters = { ...defaultDOMMeshParams, ...parameters }

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCurtainsRenderer(renderer, 'DOMMesh')) {
      console.warn('DOMMesh fail')
      return
    }

    super(renderer, element, parameters)

    this.type = 'DOMMesh'

    const { autoloadSources } = parameters

    this.autoloadSources = autoloadSources

    this.setInitSources()

    this.renderer.domMeshes.push(this)
  }

  setInitSources() {
    let loaderSize = 0
    if (this.autoloadSources) {
      const images = this.domElement.element.querySelectorAll('img')
      const videos = this.domElement.element.querySelectorAll('video')
      const canvases = this.domElement.element.querySelectorAll('canvas')

      // load images
      if (images.length) {
        //this.loadImages(images);
        images.forEach((image) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: image.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          texture.loadImage(image.src)
        })
      }

      // load videos
      if (videos.length) {
        //this.loadVideos(videos);

        videos.forEach((video) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: video.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          //texture.loadSource(image.src)
          texture.loadVideo(video)
        })
      }

      // load canvases
      if (canvases.length) {
        //this.loadCanvases(canvases);

        canvases.forEach((canvas) => {
          //console.log(image.src)
          const texture = this.createTexture({
            // TODO index in texture for bindings
            name: canvas.getAttribute('data-name') ?? 'texture' + this.textures.length,
          })

          //texture.loadSource(image.src)
          texture.loadCanvas(canvas)
        })
      }

      loaderSize = images.length + videos.length + canvases.length
    }
  }
}
