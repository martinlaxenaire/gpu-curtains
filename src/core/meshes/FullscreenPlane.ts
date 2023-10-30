import MeshBaseMixin, { MeshBaseParams } from './MeshBaseMixin'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { DOMElement } from '../DOM/DOMElement'
import default_vsWgsl from '../shaders/chunks/default_vs.wgsl'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMElementBoundingRect, RectBBox } from '../DOM/DOMElement'

/**
 * FullscreenPlane class:
 * Create a fullscreen quad, useful for post processing or background effects.
 * TODO!
 * @extends MeshBaseMixin
 * @mixes {class {}}
 */
export class FullscreenPlane extends MeshBaseMixin(class {}) {
  type: string
  size: {
    document: RectBBox
  }
  domElement: DOMElement

  /**
   * FullscreenPlane constructor
   * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
   * @param {MeshBaseParams} parameters - our Mesh base parameters
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = {} as MeshBaseParams) {
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

    // @ts-ignore
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

  /**
   * Resize our FullscreenPlane
   * @param {?DOMElementBoundingRect} boundingRect - the new bounding rectangle
   */
  resize(boundingRect: DOMElementBoundingRect | null = null) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()

    super.resize(boundingRect)
  }

  /**
   * Convert a mouse coordinate to plane coordinates ranging from [-1, 1]
   * @param {?Vec2} mouseCoords - mouse or pointer coordinates as a Vec2
   * @returns {Vec2} - the mapped coordinates in the [-1, 1] range
   */
  mouseToPlaneCoords(mouseCoords: Vec2 = new Vec2()): Vec2 {
    // mouse position conversion from document to plane space
    return new Vec2(
      ((mouseCoords.x - this.size.document.left) / this.size.document.width) * 2 - 1,
      1 - ((mouseCoords.y - this.size.document.top) / this.size.document.height) * 2
    )
  }
}
