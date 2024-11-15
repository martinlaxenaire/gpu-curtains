import { isCurtainsRenderer } from '../../core/renderers/utils'
import { PlaneGeometry, PlaneGeometryParams } from '../../core/geometries/PlaneGeometry'
import { DOMMesh, DOMMeshBaseParams, DOMMeshParams } from './DOMMesh'
import { Vec3 } from '../../math/Vec3'
import { Vec2 } from '../../math/Vec2'
import { cacheManager } from '../../utils/CacheManager'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { GPUCurtains } from '../GPUCurtains'
import { DOMElementParams } from '../../core/DOM/DOMElement'

/**
 * Parameters used to create a {@link Plane}
 */
export interface PlaneParams extends DOMMeshBaseParams, PlaneGeometryParams {
  /** Optional {@link PlaneGeometry} to use */
  geometry?: PlaneGeometry
}

/** @const - default {@link Plane} parameters */
const defaultPlaneParams = {
  label: 'Plane',

  // geometry
  instancesCount: 1,
  vertexBuffers: [],
} as PlaneParams

/**
 * Used to create a special {@link DOMMesh} class object using a {@link PlaneGeometry}.
 * This means a quad that looks like an ordinary {@link HTMLElement} but with WebGPU rendering capabilities.
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
 * // create a Plane,
 * // assuming there's a HTML element with the "plane" ID in the DOM
 * // will use the normals colors as default shading
 * const plane = new Plane(gpuCurtains, '#plane', {
 *   label: 'My plane',
 * })
 * ```
 */
export class Plane extends DOMMesh {
  /**
   * Plane constructor
   * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
   * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
   * @param parameters - {@link PlaneParams | parameters} used to create this {@link Plane}
   */
  constructor(
    renderer: GPUCurtainsRenderer | GPUCurtains,
    element: DOMElementParams['element'],
    parameters = {} as PlaneParams
  ) {
    renderer = isCurtainsRenderer(renderer, parameters.label ? parameters.label + ' Plane' : 'Plane')

    // assign default params if needed
    const params = { ...defaultPlaneParams, ...parameters }

    let { geometry, widthSegments, heightSegments, ...DOMMeshParams } = params
    const { instancesCount, vertexBuffers, ...materialParams } = DOMMeshParams

    // can we get a cached geometry?
    if (!geometry || geometry.type !== 'PlaneGeometry') {
      widthSegments = widthSegments ?? 1
      heightSegments = heightSegments ?? 1

      const geometryID = widthSegments * heightSegments + widthSegments

      // if there's no additional vertex buffers, try to get a geometry from cache
      if (!vertexBuffers.length) {
        geometry = cacheManager.getPlaneGeometryByID(geometryID)
      }

      if (!geometry) {
        // no cached plane geometry, we need to create a new one
        geometry = new PlaneGeometry({ widthSegments, heightSegments, instancesCount, vertexBuffers })
        cacheManager.addPlaneGeometry(geometry as PlaneGeometry)
      } else {
        // if geometry comes from cache, force instances count
        geometry.instancesCount = instancesCount
      }
    }

    // get DOMMesh params
    super(renderer, element, { geometry, ...materialParams } as DOMMeshParams)

    this.type = 'Plane'
  }
}
