import { isCurtainsRenderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../geometry/PlaneGeometry'
import { DOMMesh } from './DOMMesh'
import { Vec3 } from '../../math/Vec3'

const defaultPlaneParams = {
  label: 'Plane',

  // geometry
  widthSegments: 1,
  heightSegments: 1,

  // Plane specific params
  alwaysDraw: false,
  //transparent = false,
  drawCheckMargins: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  autoloadSources: true,
  watchScroll: true,
}

export class Plane extends DOMMesh {
  constructor(renderer, element, parameters = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isCurtainsRenderer(renderer, 'Plane')) {
      console.warn('Plane fail')
      return
    }

    // assign default params if needed
    const params = { ...defaultPlaneParams, ...parameters }

    const {
      widthSegments,
      heightSegments,
      alwaysDraw,
      drawCheckMargins,
      autoloadSources,
      watchScroll,
      ...domMeshParams
    } = params

    // create a plane geometry first
    const geometry = new PlaneGeometry({ widthSegments, heightSegments })

    // get DOMMesh params
    super(renderer, element, { geometry, ...domMeshParams })

    this.type = 'Plane'

    // this.options = {
    //   label,
    // }

    this.alwaysDraw = alwaysDraw
    this.autoloadSources = autoloadSources
    this.watchScroll = watchScroll

    this.setInitSources()

    this.renderer.planes.push(this)
  }

  resize(boundingRect = null) {
    super.resize(boundingRect)

    // TODO should be handled by meshes?
    // this.textures && this.textures.forEach((texture) => texture.resize())

    // TODO onAfterResize callback
  }

  applyScale() {
    this.transforms.scale.z = 1
    super.applyScale()
  }

  /***
   This will set our plane position by adding plane computed bounding box values and computed relative position values
   ***/
  applyPosition() {
    // avoid unnecessary calculations if we don't have a users set relative position
    let worldPosition = new Vec3(0, 0, 0)
    if (!this.documentPosition.equals(worldPosition)) {
      worldPosition = this.documentToWorldSpace(this.documentPosition)
    }

    this.position.set(
      this.size.world.left + worldPosition.x,
      this.size.world.top + worldPosition.y,
      -this.documentPosition.z / this.camera.CSSPerspective
    )

    super.applyPosition()
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
