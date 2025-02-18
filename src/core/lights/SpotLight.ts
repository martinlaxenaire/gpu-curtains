import { Light, LightBaseParams, LightsType } from './Light'
import { CameraRenderer } from '../renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Vec3 } from '../../math/Vec3'
import { SpotShadow } from '../shadows/SpotShadow'
import { ShadowBaseParams } from '../shadows/Shadow'

/**
 * Base parameters used to create a {@link SpotLight}.
 */
export interface SpotLightBaseParams extends LightBaseParams {
  /** The {@link SpotLight} {@link Vec3 | position}. Default to `Vec3(1)`. */
  position?: Vec3
  /** The {@link SpotLight} {@link Vec3 | target}. Default to `Vec3(0)`. */
  target?: Vec3
  /** Maximum angle of light dispersion from its direction whose upper bound is `PI / 2`. Default to `PI / 3`. */
  angle?: number
  /** Percent of the spotlight cone that is attenuated due to penumbra. Takes values between `0` and `1`. Default is `0`. */
  penumbra?: number
  /** The {@link SpotLight} range, used to compute the {@link SpotLight} attenuation over distance. Default to `0`. */
  range?: number
  /** The {@link SpotLight} shadow parameters used to create a {@link SpotShadow}. If not set, the {@link SpotShadow} won't be set as active and won't cast any shadows. On the other hand, if anything is passed (even an empty object), the {@link SpotShadow} will start casting shadows, so use with caution. Default to `null` (which means the {@link SpotLight} will not cast shadows). */
  shadow?: ShadowBaseParams // TODO
}

/**
 * Create a spot light, that is emitted from a single point in one direction, along a cone that increases in size the further from the light it gets.
 *
 * This light can cast {@link SpotShadow}.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid Camera renderer
 *
 * // this spot light will not cast any shadows
 * const spotLight = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(5, 2, 3),
 *   penumbra: 0.5,
 * })
 *
 * // this spot light will cast shadows
 * const spotLightWithShadows = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(-10, 10, -5),
 *   target: new Vec3(0, 0.5, 0),
 *   shadow: {
 *     intensity: 1,
 *   },
 * })
 *
 * // this spot light will ALSO cast shadows!
 * const anotherSpotLightWithShadows = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 2,
 *   position: new Vec3(12, 0.5, 5),
 *   target: new Vec3(3),
 *   shadow: {}, // that's enough to start casting shadows
 * })
 *
 * // this spot light will cast shadows as well...
 * const lastSpotLightWithShadows = new SpotLight(renderer, {
 *   color: new Vec3(1),
 *   intensity: 1,
 *   position: new Vec3(10),
 * })
 *
 * // ... because we're telling it here to start casting shadows
 * lastSpotLightWithShadows.shadow.cast()
 * ```
 */
export class SpotLight extends Light {
  /** The {@link SpotLight} {@link Vec3 | target}. */
  target: Vec3
  /**
   * The {@link Vec3 | direction} of the {@link SpotLight} is the {@link target} minus the actual {@link position}.
   * @private
   */
  #direction: Vec3

  /** @ignore */
  #angle: number
  /** @ignore */
  #penumbra: number
  /** @ignore */
  #range: number

  /** Options used to create this {@link SpotLight}. */
  options: SpotLightBaseParams
  /** {@link SpotShadow} associated with this {@link SpotLight}. */
  shadow: SpotShadow

  constructor(
    renderer: CameraRenderer | GPUCurtains,
    {
      label = 'SpotLight',
      color = new Vec3(1),
      intensity = 1,
      position = new Vec3(1),
      target = new Vec3(),
      angle = Math.PI / 3,
      penumbra = 0,
      range = 0,
      shadow = null,
    } = {} as SpotLightBaseParams
  ) {
    const type = 'spotLights'
    super(renderer, { label, color, intensity, type })

    this.options = {
      ...this.options,
      position,
      range,
      angle,
      penumbra,
      target,
      shadow,
    }

    this.#direction = new Vec3()

    this.position.copy(position)

    this.target = new Vec3()
    this.target.onChange(() => {
      this.lookAt(this.target)
    })
    this.target.copy(target)

    this.angle = angle
    this.penumbra = penumbra
    this.range = range

    this.parent = this.renderer.scene

    this.shadow = new SpotShadow(this.renderer, {
      autoRender: false, // will be set by calling cast()
      light: this,
    })

    if (shadow) {
      this.shadow.cast(shadow)
    }

    this.shouldUpdateModelMatrix()
  }

  /**
   * Set or reset this {@link SpotLight} {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: CameraRenderer | GPUCurtains) {
    super.setRenderer(renderer)

    if (this.shadow) {
      //this.shadow.updateIndex(this.index)
      this.shadow.setRenderer(renderer)
    }
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link SpotLight} has been overflowed or when updating the {@link SpotLight} {@link renderer}.
   * @param resetShadow - Whether to reset the {@link SpotLight} shadow if any. Set to `true` when the {@link renderer} number of {@link SpotLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
   */
  reset(resetShadow = true) {
    super.reset()
    this.onPropertyChanged('range', this.range)
    this.onPropertyChanged('coneCos', Math.cos(this.angle))
    this.onPropertyChanged('penumbraCos', Math.cos(this.angle * (1 - this.penumbra)))
    this.onPropertyChanged('position', this.actualPosition)
    this.onPropertyChanged('direction', this.#direction)

    if (this.shadow && resetShadow) {
      this.shadow.reset()
    }
  }

  /**
   * Set the {@link SpotLight} position and direction based on the {@link target} and the {@link worldMatrix} translation and update the {@link SpotShadow} view matrix.
   */
  setPositionDirection() {
    this.onPropertyChanged('position', this.actualPosition)

    this.#direction.copy(this.target).sub(this.actualPosition).normalize()
    this.onPropertyChanged('direction', this.#direction)
  }

  /**
   * Get this {@link SpotLight} angle.
   * @returns - The {@link SpotLight} angle.
   */
  get angle(): number {
    return this.#angle
  }

  /**
   * Set this {@link SpotLight} angle and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link SpotLight} angle in the `[0, PI / 2]` range.
   */
  set angle(value: number) {
    this.#angle = Math.min(Math.PI / 2, Math.max(0, value))
    this.onPropertyChanged('coneCos', Math.cos(this.angle))
    this.onPropertyChanged('penumbraCos', Math.cos(this.angle * (1 - this.penumbra)))

    this.shadow?.setCameraFov()
  }

  /**
   * Get this {@link SpotLight} penumbra.
   * @returns - The {@link SpotLight} penumbra.
   */
  get penumbra(): number {
    return this.#penumbra
  }

  /**
   * Set this {@link SpotLight} penumbra and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link SpotLight} penumbra in the `[0, 1]` range.
   */
  set penumbra(value: number) {
    this.#penumbra = Math.min(1, Math.max(0, value))
    this.onPropertyChanged('penumbraCos', Math.cos(this.angle * (1 - this.penumbra)))
  }

  /**
   * Get this {@link SpotLight} range.
   * @returns - The {@link SpotLight} range.
   */
  get range(): number {
    return this.#range
  }

  /**
   * Set this {@link SpotLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link SpotLight} range.
   */
  set range(value: number) {
    this.#range = Math.max(0, value)
    this.onPropertyChanged('range', this.range)

    if (this.shadow) {
      this.shadow.camera.far = this.range !== 0 ? this.range : 150
    }
  }

  // explicitly disable scale and transform origin transformations

  /** @ignore */
  applyScale() {}

  /** @ignore */
  applyTransformOrigin() {}

  /**
   * Rotate this {@link SpotLight} so it looks at the {@link Vec3 | target}.
   * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
   */
  lookAt(target: Vec3 = new Vec3()) {
    this.updateModelMatrix()
    this.updateWorldMatrix(true, false)

    if (this.actualPosition.x === 0 && this.actualPosition.y !== 0 && this.actualPosition.z === 0) {
      this.up.set(0, 0, 1)
    } else {
      this.up.set(0, 1, 0)
    }

    // since we know it's a light, inverse position and target
    this.applyLookAt(this.actualPosition, target)
  }

  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the {@link worldMatrix} translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.setPositionDirection()
    }
  }

  /**
   * Tell the {@link renderer} that the maximum number of {@link SpotLight} has been overflown.
   * @param lightsType - {@link type} of this light.
   */
  onMaxLightOverflow(lightsType: LightsType) {
    super.onMaxLightOverflow(lightsType)
    this.shadow?.setRendererBinding()
  }

  /**
   * Destroy this {@link SpotLight} and associated {@link SpotShadow}.
   */
  destroy() {
    super.destroy()
    this.shadow.destroy()
  }
}
