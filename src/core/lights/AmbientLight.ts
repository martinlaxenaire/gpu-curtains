import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'
import { CameraRenderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * Create an ambient light that equally illuminates all objects in the scene.
 *
 * This light cannot cast shadows.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 * const ambientLight = new AmbientLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 0.1,
 * })
 * ```
 */
export class AmbientLight extends Light {
  /**
   * AmbientLight constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link AmbientLight}.
   * @param parameters - {@link LightBaseParams | parameters} used to create this {@link AmbientLight}.
   */
  constructor(
    renderer: CameraRenderer | GPUCurtains,
    { label = 'AmbientLight', color = new Vec3(1), intensity = 0.1 } = {} as LightBaseParams
  ) {
    const type = 'ambientLights'
    super(renderer, { label, color, intensity, type })
  }

  // explicitly disable all kinds of transformations

  /** @ignore */
  applyRotation() {}

  /** @ignore */
  applyPosition() {}

  /** @ignore */
  applyScale() {}

  /** @ignore */
  applyTransformOrigin() {}
}
