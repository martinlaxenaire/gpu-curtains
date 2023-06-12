import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../geometry/PlaneGeometry'
import { DOMMesh } from './DOMMesh'

export class Plane extends DOMMesh {
  constructor(
    renderer,
    element,
    {
      label = 'Plane',

      // material
      shaders = {},
      bindings = [],

      // geometry
      widthSegments = 1,
      heightSegments = 1,

      // Plane specific params
      alwaysDraw = false,
      visible = true,
      //transparent = false,
      drawCheckMargins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      autoloadSources = true,
      watchScroll = true,

      // events
      onRender = () => {
        /* allow empty callback */
      },
    } = {}
  ) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCurtainsRenderer(renderer, 'Plane')) {
      console.warn('Plane fail')
      return
    }

    //super(renderer, element)
    const geometry = new PlaneGeometry({
      widthSegments,
      heightSegments,
    })

    super(renderer, element, { label, shaders, geometry, bindings })

    this.type = 'Plane'

    // this.options = {
    //   label,
    // }

    //this.renderer = renderer

    // TODO should be handled by meshes
    //this.textures = []

    this.alwaysDraw = alwaysDraw
    this.visible = visible

    this.autoloadSources = autoloadSources

    this.watchScroll = watchScroll

    this.setInitSources()

    // callbacks
    this.onRender = onRender

    this.renderer.planes.push(this)
  }

  resize(boundingRect = null) {
    super.resize(boundingRect)

    // TODO should be handled by meshes?
    this.textures && this.textures.forEach((texture) => texture.resize())

    // TODO onAfterResize callback
  }

  // updateModelMatrixStack() {
  //   super.updateModelMatrixStack()
  //
  //   // TODO ugly
  //   // if (sizeChanged) {
  //   //   this.textures?.forEach((texture) => texture.resize())
  //   // }
  // }

  // updateProjectionMatrixStack() {
  //   super.updateProjectionMatrixStack()
  //
  //   //this.matrixUniformBinding?.shouldUpdateUniform('view')
  //   //this.matrixUniformBinding?.shouldUpdateUniform('projection')
  // }

  /** SOURCES **/

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

  onTextureCreated(texture) {
    super.onTextureCreated(texture)
    texture.parent = this
  }

  render(pass) {
    // no point to render if the WebGPU device is not ready
    if (!this.renderer.ready) return

    this.textures.forEach((texture) => {
      texture.textureMatrix.onBeforeRender()
    })

    super.render(pass)

    this.onRender()
  }

  destroy() {
    this.material?.destroy()
  }
}
