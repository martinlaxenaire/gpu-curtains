import { Vec3 } from '../../math/Vec3'
import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { BufferBinding } from '../bindings/BufferBinding'
import { Object3D } from '../objects3D/Object3D'
import { generateUUID } from '../../utils/utils'
import { DirectionalLight } from './DirectionalLight'
import { PointLight } from './PointLight'
import { SpotLight } from './SpotLight'
import type { GPUCurtains } from '../../curtains/GPUCurtains'
import { sRGBToLinear } from '../../math/color-utils'
import { ProjectedMeshBaseClass } from '../meshes/mixins/ProjectedMeshBaseMixin'

/** Defines all types of lights. */
export type LightsType = 'ambientLights' | 'directionalLights' | 'pointLights' | 'spotLights'
/** Defines all types of shadow casting lights. */
export type ShadowCastingLights = DirectionalLight | PointLight | SpotLight

/**
 * Base parameters used to create a {@link Light}.
 */
export interface LightBaseParams {
  /** Optional label of the {@link Light}. */
  label?: string
  /** The {@link Light} color. Default to `Vec3(1)`. */
  color?: Vec3
  /** The {@link Light} intensity. Default to `1`. */
  intensity?: number
}

/**
 * Parameters used to create a {@link Light}.
 */
export interface LightParams extends LightBaseParams {
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

  /** Empty object to store any additional data or custom properties into your {@link Light}. */
  userData: Record<string, unknown>

  /** function assigned to the {@link onBeforeRender} callback */
  _onBeforeRenderCallback: () => void

  /**
   * Light constructor
   * @param renderer - {@link CameraRenderer} used to create this {@link Light}.
   * @param parameters - {@link LightParams | parameters} used to create this {@link Light}.
   */
  constructor(
    renderer: CameraRenderer | GPUCurtains,
    { label = '', color = new Vec3(1), intensity = 1, type = 'lights' } = {} as LightParams
  ) {
    super()

    this.type = type

    this.setRenderer(renderer)

    this.uuid = generateUUID()

    this.options = {
      label,
      color,
      intensity,
    }

    this.color = color
    this.#intensityColor = this.color.clone()
    this.color.onChange(() => this.onPropertyChanged('color', this.actualColor))

    this.intensity = intensity

    this.userData = {}
  }

  /**
   * Set or reset this light {@link CameraRenderer}.
   * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: CameraRenderer | GPUCurtains) {
    const hasRenderer = !!this.renderer

    // if there's already a renderer, remove light
    if (this.renderer) {
      this.renderer.removeLight(this)
    }

    // set new renderer
    renderer = isCameraRenderer(renderer, this.constructor.name)
    this.renderer = renderer

    // set index only on first init
    if (this.index === undefined) {
      this.index = this.renderer.lights.filter((light) => light.type === this.type).length
    }

    // check for overflow
    if (!this.renderer.lightsBindingParams || this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    // add light back
    this.renderer.addLight(this)

    // reset binding
    this.setRendererBinding()

    if (hasRenderer) {
      this.reset(false)
    }
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
   * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link Light} has been overflowed or when updating the {@link Light} {@link renderer}.
   * @param resetShadow - Whether to reset the {@link Light} shadow if any.
   */
  reset(resetShadow = true) {
    this.setRendererBinding()
    this.onPropertyChanged('color', this.actualColor)
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
    this.onPropertyChanged('color', this.actualColor)
  }

  /**
   * Get the actual {@link Vec3} color used in the shader: convert {@link color} to linear space, then multiply by {@link intensity}.
   * @returns - Actual {@link Vec3} color used in the shader.
   */
  get actualColor(): Vec3 {
    return sRGBToLinear(this.#intensityColor.copy(this.color)).multiplyScalar(this.intensity)
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
    this.renderer.onMaxLightOverflow(lightsType, this.index)

    if (this.rendererBinding) {
      this.rendererBinding = this.renderer.bindings[lightsType]
    }
  }

  /**
   * Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
   */
  onBeforeRenderScene() {
    this._onBeforeRenderCallback && this._onBeforeRenderCallback()
  }

  /**
   * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the {@link Light} matrices. The callback won't be called if the {@link renderer} is not ready.
   * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
   * @returns - our {@link Light}
   */
  onBeforeRender(callback: () => void): this {
    if (callback) {
      this._onBeforeRenderCallback = callback
    }

    return this
  }

  /**
   * Remove this {@link Light} from the {@link renderer} and destroy it.
   */
  remove() {
    this.renderer.removeLight(this)
    this.destroy()
  }

  /**
   * Destroy this {@link Light}.
   */
  destroy() {
    super.destroy()
  }
}
