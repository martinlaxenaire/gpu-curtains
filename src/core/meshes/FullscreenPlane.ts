import MeshBaseMixin, { MeshBaseRenderParams } from './MeshBaseMixin'
import { isRenderer, Renderer } from '../renderers/utils'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { DOMElement, DOMElementBoundingRect, RectBBox } from '../DOM/DOMElement'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * FullscreenPlane class:
 * Create a fullscreen quad, useful for post processing or background effects.
 * TODO!
 * @extends MeshBaseMixin
 * @mixes {class {}}
 */
export class FullscreenPlane extends MeshBaseMixin(class {}) {
  /** The type of the {@link FullscreenPlane} */
  type: string
  /** Object defining the  {@link FullscreenPlane} size */
  size: {
    /** document HTML size */
    document: RectBBox
  }
  /** DOM Element (in fact, the renderer [DOM Element]{@link GPURenderer#domElement}) used to set the [document size]{@link FullscreenPlane#size.document} */
  domElement: DOMElement

  /**
   * FullscreenPlane constructor
   * @param renderer- [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
   * @param parameters - [parameters]{@link MeshBaseRenderParams} use to create this {@link FullscreenPlane}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = {} as MeshBaseRenderParams) {
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
   * @param boundingRect - the new bounding rectangle
   */
  resize(boundingRect: DOMElementBoundingRect | null = null) {
    if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return

    this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect()

    super.resize(boundingRect)
  }

  /**
   * Take the pointer [vector]{@link Vec2} position relative to the document and returns it relative to our {@link FullscreenPlane}
   * It ranges from -1 to 1 on both axis
   * @param mouseCoords - pointer [vector]{@link Vec2} coordinates
   * @returns - the mapped [vector]{@link Vec2} coordinates in the [-1, 1] range
   */
  mouseToPlaneCoords(mouseCoords: Vec2 = new Vec2()): Vec2 {
    // mouse position conversion from document to plane space
    return new Vec2(
      ((mouseCoords.x - this.size.document.left) / this.size.document.width) * 2 - 1,
      1 - ((mouseCoords.y - this.size.document.top) / this.size.document.height) * 2
    )
  }
}
