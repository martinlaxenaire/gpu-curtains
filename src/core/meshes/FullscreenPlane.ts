import { MeshBaseMixin, MeshBaseRenderParams } from './mixins/MeshBaseMixin'
import { isRenderer, Renderer } from '../renderers/utils'
import { PlaneGeometry } from '../geometries/PlaneGeometry'
import { DOMElementBoundingRect, RectBBox } from '../DOM/DOMElement'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * Create a 1x1 quad (or plane) covering the full viewport, useful for postprocessing or background effects.
 *
 * It consists of a {@link PlaneGeometry} and {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} and a few utilities method to help create {@link core/textures/Texture.Texture | Texture} and {@link core/textures/RenderTexture.RenderTexture | RenderTexture}.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a fullscreen plane
 * const fullscreenPlane = new FullscreenPlane(gpuCurtains, {
 *   label: 'My fullscreen plane',
 *   shaders: {
 *     fragment: {
 *       code: fragmentCode, // assume it is a valid WGSL fragment shader
 *     },
 *   },
 * })
 * ```
 */
export class FullscreenPlane extends MeshBaseMixin(class {}) {
  /** The type of the {@link FullscreenPlane} */
  type: string
  /** Object defining the  {@link FullscreenPlane} size */
  size: {
    /** document HTML size */
    document: RectBBox
  }

  /**
   * FullscreenPlane constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
   * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link FullscreenPlane}
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

    // no vertex shader? patch uniforms/storages visibility
    if (!parameters.shaders || !parameters.shaders.vertex) {
      ;['uniforms', 'storages'].forEach((bindingType) => {
        Object.keys(parameters[bindingType] ?? {}).forEach(
          (bindingKey) => (parameters[bindingType][bindingKey].visibility = 'fragment')
        )
      })
    }

    // we don't want to write to the depth buffer for fullscreen quads
    parameters.depthWriteEnabled = false

    // @ts-ignore
    super(renderer, null, { geometry, ...parameters })

    this.size = {
      document: {
        width: this.renderer.boundingRect.width,
        height: this.renderer.boundingRect.height,
        top: this.renderer.boundingRect.top,
        left: this.renderer.boundingRect.left,
      },
    }

    this.type = 'FullscreenQuadMesh'
  }

  /**
   * Resize our {@link FullscreenPlane}
   * @param boundingRect - the new bounding rectangle
   */
  resize(boundingRect: DOMElementBoundingRect | null = null) {
    this.size.document = boundingRect ?? this.renderer.boundingRect

    super.resize(boundingRect)
  }

  /**
   * Take the pointer {@link Vec2 | vector} position relative to the document and returns it relative to our {@link FullscreenPlane}
   * It ranges from -1 to 1 on both axis
   * @param mouseCoords - pointer {@link Vec2 | vector} coordinates
   * @returns - the mapped {@link Vec2 | vector} coordinates in the [-1, 1] range
   */
  mouseToPlaneCoords(mouseCoords: Vec2 = new Vec2()): Vec2 {
    // mouse position conversion from document to plane space
    return new Vec2(
      ((mouseCoords.x - this.size.document.left) / this.size.document.width) * 2 - 1,
      1 - ((mouseCoords.y - this.size.document.top) / this.size.document.height) * 2
    )
  }
}
