import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'
import { DirectionalShadow, DirectionalShadowParams } from '../shadows/DirectionalShadow'
import { CameraRenderer } from '../renderers/utils'

let directionalLightIndex = 0

/**
 * Base parameters used to create a {@link DirectionalLight}.
 */
export interface DirectionalLightBaseParams extends LightBaseParams {
  /** The {@link DirectionalLight} {@link Vec3 | position}. Default to `Vec3(1)`. */
  position?: Vec3
  /** The {@link DirectionalLight} {@link Vec3 | target}. Default to `Vec3(0)`. */
  target?: Vec3
  /** The {@link DirectionalLight} shadow parameters used to create a {@link DirectionalShadow}. If not set, the {@link DirectionalShadow} won't be set as active and won't cast any shadows. On the other hand, if anything is passed (even an empty object), the {@link DirectionalShadow} will start casting shadows, so use with caution. Default to `null` (which means the {@link DirectionalLight} will not cast shadows). */
  shadow?: DirectionalShadowParams
}

/**
 * Create a directional light, that is emitted in a single direction without any attenuation. A common use case for this type of light is to simulate the sun.
 *
 * This light can cast {@link DirectionalShadow}.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 *
 * // this directional light will not cast any shadows
 * const directionalLight = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(5, 2, 3),
 * })
 *
 * // this directional light will cast shadows
 * const directionalLightWithShadows = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(-10, 10, -5),
 *   shadow: {
 *     intensity: 1
 *   },
 * })
 *
 * // this directional light will ALSO cast shadows!
 * const anotherDirectionalLightWithShadows = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 2,
 *   position: new Vec3(12, 0.5, 5),
 *   target: new Vec3(3),
 *   shadow: {}, // that's enough to start casting shadows
 * })
 *
 * // this directional light will cast shadows as well...
 * const lastDirectionalLightWithShadows = new DirectionalLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(10),
 * })
 *
 * // ... because we're telling it here to start casting shadows
 * lastDirectionalLightWithShadows.shadow.cast()
 * ```
 */
export class DirectionalLight extends Light {
  /** The {@link DirectionalLight} {@link Vec3 | target}. */
  target: Vec3
  /** @ignore */
  #actualPosition: Vec3
  /**
   * The {@link Vec3 | direction} of the {@link DirectionalLight} is the {@link target} minus the actual {@link position}.
   * @private
   */
  #direction: Vec3

  /** Options used to create this {@link DirectionalLight}. */
  options: DirectionalLightBaseParams
  /** {@link DirectionalShadow} associated with this {@link DirectionalLight}. */
  shadow: DirectionalShadow

  /**
   * DirectionalLight constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link DirectionalLight}.
   * @param parameters - {@link DirectionalLightBaseParams | parameters} used to create this {@link DirectionalLight}.
   */
  constructor(
    renderer: CameraRenderer,
    {
      color = new Vec3(1),
      intensity = 1,
      position = new Vec3(1),
      target = new Vec3(),
      shadow = null,
    } = {} as DirectionalLightBaseParams
  ) {
    super(renderer, { color, intensity, index: directionalLightIndex++, type: 'directionalLights' })

    this.options = {
      ...this.options,
      position,
      target,
      shadow,
    }

    this.#direction = new Vec3()
    this.#actualPosition = new Vec3()
    this.target = target
    this.target.onChange(() => this.setDirection())
    this.position.copy(position)

    this.parent = this.renderer.scene

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.rendererBinding.inputs.count.value = directionalLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.shadow = new DirectionalShadow(this.renderer, { light: this })

    if (shadow) {
      this.shadow.cast(shadow)
    }
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link DirectionalLight} has been overflowed.
   */
  reset() {
    super.reset()
    this.setDirection()

    this.shadow?.reset()
  }

  /**
   * Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation and update the {@link DirectionalShadow} view matrix.
   */
  setDirection() {
    this.#direction.copy(this.target).sub(this.worldMatrix.getTranslation(this.#actualPosition))
    this.onPropertyChanged('direction', this.#direction)

    this.shadow?.updateViewMatrix(this.#actualPosition, this.target)
  }

  // explicitly disable scale and transform origin transformations

  /** @ignore */
  applyScale() {}

  /** @ignore */
  applyTransformOrigin() {}

  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the {@link worldMatrix} translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.setDirection()
    }
  }

  /**
   * Tell the {@link renderer} that the maximum number of {@link DirectionalLight} has been overflown.
   * @param lightsType - {@link type} of this light.
   */
  onMaxLightOverflow(lightsType: LightsType) {
    super.onMaxLightOverflow(lightsType)
    this.shadow?.setRendererBinding()
  }

  /**
   * Destroy this {@link DirectionalLight} and associated {@link DirectionalShadow}.
   */
  destroy() {
    super.destroy()
    this.shadow.destroy()
  }
}
