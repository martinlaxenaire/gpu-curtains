import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'
import { PointShadow, PointShadowParams } from '../shadows/PointShadow'
import { CameraRenderer } from '../renderers/utils'

let pointLightIndex = 0

/**
 * Base parameters used to create a {@link PointLight}.
 */
export interface PointLightBaseParams extends LightBaseParams {
  /** The {@link PointLight} {@link Vec3 | position}. Default to `Vec3(0)`. */
  position?: Vec3
  /** The {@link PointLight} range, used to compute the {@link PointLight} attenuation over distance. Default to `0`. */
  range?: number
  /** The {@link PointLight} shadow parameters used to create a {@link PointShadow}. If not set, the {@link PointShadow} won't be set as active and won't cast any shadows. On the other hand, if anything is passed (even an empty object), the {@link PointShadow} will start casting shadows, so use with caution. Default to `null` (which means the {@link PointLight} will not cast shadows). */
  shadow?: PointShadowParams
}

/**
 * Create a point light, that is emitted from a point to all directions with an attenuation. A common use case for this type of light is to replicate the light emitted from a bare light bulb.
 *
 * This light can cast {@link PointShadow}.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 *
 * // this point light will not cast any shadows
 * const pointLight = new PointLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(5, 2, 3),
 * })
 *
 * // this point light will cast shadows
 * const pointLightWithShadows = new PointLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 10,
 *   range: 3,
 *   position: new Vec3(-10, 10, -5),
 *   shadow: {
 *     intensity: 1
 *   },
 * })
 *
 * // this point light will ALSO cast shadows!
 * const anotherPointLightWithShadows = new PointLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 5,
 *   range: 100,
 *   position: new Vec3(12, 0.5, 5),
 *   shadow: {}, // that's enough to start casting shadows
 * })
 *
 * // this point light will cast shadows as well...
 * const lastPointLightWithShadows = new PointLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(10),
 * })
 *
 * // ... because we're telling it here to start casting shadows
 * lastPointLightWithShadows.shadow.cast()
 * ```
 */
export class PointLight extends Light {
  /** @ignore */
  #range: number
  /** @ignore */
  #actualPosition: Vec3

  /** Options used to create this {@link PointLight}. */
  options: PointLightBaseParams

  /** {@link PointShadow} associated with this {@link PointLight}. */
  shadow: PointShadow

  /**
   * PointLight constructor
   * @param renderer - {@link CameraRenderer | CameraRenderer} used to create this {@link PointLight}.
   * @param parameters - {@link PointLightBaseParams | parameters} used to create this {@link PointLight}.
   */
  constructor(
    renderer: CameraRenderer,
    { color = new Vec3(1), intensity = 1, position = new Vec3(), range = 0, shadow = null } = {} as PointLightBaseParams
  ) {
    super(renderer, { color, intensity, index: pointLightIndex++, type: 'pointLights' })

    this.options = {
      ...this.options,
      position,
      range,
      shadow,
    }

    this.#actualPosition = new Vec3()
    this.position.copy(position)

    this.range = range

    this.parent = this.renderer.scene

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.rendererBinding.inputs.count.value = pointLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.shadow = new PointShadow(this.renderer, { light: this })

    if (shadow) {
      this.shadow.cast(shadow)
    }
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link PointLight} has been overflowed.
   */
  reset() {
    super.reset()
    this.onPropertyChanged('range', this.range)
    this.setPosition()

    this.shadow?.reset()
  }

  /**
   * Get this {@link PointLight} range.
   * @returns - The {@link PointLight} range.
   */
  get range(): number {
    return this.#range
  }

  /**
   * Set this {@link PointLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link PointLight} range.
   */
  set range(value: number) {
    this.#range = value
    this.onPropertyChanged('range', this.range)
  }

  /**
   * Set the {@link PointLight} position based on the {@link worldMatrix} translation and update the {@link PointShadow} view matrices.
   */
  setPosition() {
    this.onPropertyChanged('position', this.worldMatrix.getTranslation(this.#actualPosition))
    this.shadow?.updateViewMatrices(this.#actualPosition)
  }

  // explicitly disable scale and transform origin transformations

  /** @ignore */
  applyScale() {}

  /** @ignore */
  applyTransformOrigin() {}

  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new position from the {@link worldMatrix} translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.setPosition()
    }
  }

  /**
   * Tell the {@link renderer} that the maximum number of {@link PointLight} has been overflown.
   * @param lightsType - {@link type} of this light.
   */
  onMaxLightOverflow(lightsType: LightsType) {
    super.onMaxLightOverflow(lightsType)
    this.shadow?.setRendererBinding()
  }

  /**
   * Destroy this {@link PointLight} and associated {@link PointShadow}.
   */
  destroy() {
    super.destroy()
    this.shadow.destroy()
  }
}
