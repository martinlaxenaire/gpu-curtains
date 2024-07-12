import { Vec3 } from '../../math/Vec3'
import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { BufferBinding } from '../bindings/BufferBinding'
import { Object3D } from '../objects3D/Object3D'
import { generateUUID } from '../../utils/utils'
import { DirectionalLight } from './DirectionalLight'
import { PointLight } from './PointLight'

/** Defines all types of lights. */
export type LightsType = 'ambientLights' | 'directionalLights' | 'pointLights'
/** Defines all types of shadow casting lights. */
export type ShadowCastingLights = DirectionalLight | PointLight

/**
 * Base parameters used to create a {@link Light}.
 */
export interface LightBaseParams {
  /** The {@link Light} color. Default to `Vec3(1)`. */
  color?: Vec3
  /** The {@link Light} intensity. Default to `1`. */
  intensity?: number
}

/**
 * Parameters used to create a {@link Light}.
 */
export interface LightParams extends LightBaseParams {
  /** {@link LightsType | Type of the light}. */
  index?: number
  /** Index of this {@link Light}, i.e. the number of time a {@link Light} of this type has been created. */
  type?: string | LightsType
}

/**
 * Used as a base class to create a light.
 */
export class Light extends Object3D {
  /** {@link LightsType | Type of the light}. */
  type: string | LightsType
  /** The universal unique id of this {@link Light} */
  readonly uuid: string
  /** Index of this {@link Light}, i.e. the number of time a {@link Light} of this type has been created. */
  index: number
  /** {@link CameraRenderer} used by this {@link Light} */
  renderer: CameraRenderer

  /** Options used to create this {@link Light}. */
  options: LightBaseParams

  /** Current {@link Vec3 | color} of this {@link Light}. */
  color: Vec3
  /** @ignore */
  #intensity: number
  /**
   * A {@link Vec3} holding the {@link Light} {@link color} multiplied by its {@link intensity}.
   * @private
   */
  #intensityColor: Vec3

  /** {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} that holds all the bindings to send to the shaders. */
  rendererBinding: BufferBinding | null

  /**
   * Light constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Light}.
   * @param parameters - {@link LightParams | parameters} used to create this {@link Light}.
   */
  constructor(
    renderer: CameraRenderer,
    { color = new Vec3(1), intensity = 1, index = 0, type = 'lights' } = {} as LightParams
  ) {
    super()

    this.type = type

    Object.defineProperty(this as Light, 'index', { value: index })

    renderer = isCameraRenderer(renderer, this.constructor.name)

    this.renderer = renderer

    this.setRendererBinding()

    this.uuid = generateUUID()

    this.options = {
      color,
      intensity,
    }

    this.color = color
    this.#intensityColor = this.color.clone()
    this.color.onChange(() =>
      this.onPropertyChanged('color', this.#intensityColor.copy(this.color).multiplyScalar(this.intensity))
    )

    this.intensity = intensity

    this.renderer.addLight(this)
  }

  /**
   * Set or reset this {@link Light} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   */
  setRendererBinding() {
    if (this.renderer.bindings[this.type]) {
      this.rendererBinding = this.renderer.bindings[this.type]
    }
  }

  /**
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link Light} has been overflowed.
   */
  reset() {
    this.setRendererBinding()
    this.onPropertyChanged('color', this.#intensityColor.copy(this.color).multiplyScalar(this.intensity))
  }

  /**
   * Get this {@link Light} intensity.
   * @returns - The {@link Light} intensity.
   */
  get intensity(): number {
    return this.#intensity
  }

  /**
   * Set this {@link Light} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
   * @param value - The new {@link Light} intensity.
   */
  set intensity(value: number) {
    this.#intensity = value
    this.onPropertyChanged('color', this.#intensityColor.copy(this.color).multiplyScalar(this.intensity))
  }

  /**
   * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
   * @param propertyKey - name of the property to update.
   * @param value - new value of the property.
   */
  onPropertyChanged(propertyKey: string, value: Vec3 | number) {
    if (this.rendererBinding && this.rendererBinding.inputs[propertyKey]) {
      if (value instanceof Vec3) {
        this.rendererBinding.inputs[propertyKey].value[this.index * 3] = value.x
        this.rendererBinding.inputs[propertyKey].value[this.index * 3 + 1] = value.y
        this.rendererBinding.inputs[propertyKey].value[this.index * 3 + 2] = value.z
      } else {
        this.rendererBinding.inputs[propertyKey].value[this.index] = value
      }

      this.rendererBinding.inputs[propertyKey].shouldUpdate = true
      this.renderer.shouldUpdateCameraLightsBindGroup()
    }
  }

  /**
   * Tell the {@link renderer} that the maximum number for this {@link type} of light has been overflown.
   * @param lightsType - {@link type} of light.
   */
  onMaxLightOverflow(lightsType: LightsType) {
    if (this.rendererBinding) {
      this.renderer.onMaxLightOverflow(lightsType)
      this.rendererBinding = this.renderer.bindings[lightsType]
    }
  }

  /**
   * Remove this {@link Light} from the {@link renderer}.
   */
  remove() {
    this.renderer.removeLight(this)
  }

  /**
   * Destroy this {@link Light}.
   */
  destroy() {
    this.parent = null
  }
}
