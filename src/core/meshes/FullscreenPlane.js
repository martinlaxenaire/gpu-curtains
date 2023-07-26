import MeshBaseMixin from './MeshBaseMixin'
import { isRenderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { DOMElement } from '../DOMElement'
import default_vsWgsl from '../shaders/chunks/default_vs.wgsl'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'

export class FullscreenPlane extends MeshBaseMixin(class {}) {
  constructor(renderer, parameters = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? parameters.label + ' FullscreenQuadMesh' : 'FullscreenQuadMesh')

    // can we get a cached geometry?
    let geometry = cacheManager.getPlaneGeometryByID(2) // 1 * 1 + 1

    if (!geometry) {
      // we need to create a new plane geometry
      geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 })
      cacheManager.addPlaneGeometry(geometry)
    }

    if (!parameters.shaders.vertex || !parameters.shaders.vertex.code) {
      parameters.shaders.vertex = {
        code: default_vsWgsl,
        entryPoint: 'main',
      }
    }

    super(renderer, null, { geometry, ...parameters })

    this.size = {
      document: {
        width: 0,
        height: 0,
        top: 0,
        left: 0,
      },
    }

    this.domElement = new DOMElement({
      element: this.renderer.domElement.element,
      onSizeChanged: (boundingRect) => this.resize(boundingRect),
    })

    this.type = 'FullscreenQuadMesh'
  }

  resize(boundingRect) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()

    super.resize(boundingRect)
  }

  mouseToPlaneCoords(mouseCoords = new Vec2()) {
    // mouse position conversion from document to plane space
    return new Vec2(
      ((mouseCoords.x - this.size.document.left) / this.size.document.width) * 2 - 1,
      1 - ((mouseCoords.y - this.size.document.top) / this.size.document.height) * 2
    )
  }
}
