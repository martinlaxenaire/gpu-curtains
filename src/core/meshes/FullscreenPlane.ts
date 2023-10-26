import MeshBaseMixin from './MeshBaseMixin'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { DOMElement } from '../DOM/DOMElement'
import default_vsWgsl from '../shaders/chunks/default_vs.wgsl'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseParams } from '../../types/core/meshes/MeshBaseMixin'
import { DOMElementBoundingRect, RectBBox } from '../../types/core/DOM/DOMElement'

export class FullscreenPlane extends MeshBaseMixin(class {}) {
  type: string
  size: {
    document: RectBBox
  }
  domElement: DOMElement

  constructor(renderer: Renderer | GPUCurtains, parameters: MeshBaseParams = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

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

  resize(boundingRect: DOMElementBoundingRect) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()

    super.resize(boundingRect)
  }

  mouseToPlaneCoords(mouseCoords: Vec2 = new Vec2()): Vec2 {
    // mouse position conversion from document to plane space
    return new Vec2(
      ((mouseCoords.x - this.size.document.left) / this.size.document.width) * 2 - 1,
      1 - ((mouseCoords.y - this.size.document.top) / this.size.document.height) * 2
    )
  }
}
