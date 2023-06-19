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

    const { widthSegments, heightSegments, alwaysDraw, drawCheckMargins, watchScroll, ...domMeshParams } = params

    // create a plane geometry first
    const geometry = new PlaneGeometry({ widthSegments, heightSegments })

    // get DOMMesh params
    super(renderer, element, { geometry, ...domMeshParams })

    this.type = 'Plane'

    // this.options = {
    //   label,
    // }

    this.alwaysDraw = alwaysDraw
    this.watchScroll = watchScroll

    //this.renderer.planes.push(/** @type {Plane} **/ this)
  }

  resize(boundingRect = null) {
    super.resize(boundingRect)
  }

  /** SOURCES **/

  // render(pass) {
  //   // no point to render if the WebGPU device is not ready
  //   if (!this.renderer.ready) return
  //
  //   this.textures.forEach((texture) => {
  //     texture.textureMatrix.onBeforeRender()
  //   })
  //
  //   super.render(pass)
  //
  //   //this.onRender()
  // }

  destroy() {
    this.material?.destroy()
  }
}
