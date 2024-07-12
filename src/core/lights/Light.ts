import { Vec3 } from '../../math/Vec3'
import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { BufferBinding } from '../bindings/BufferBinding'
import { Object3D } from '../objects3D/Object3D'
import { generateUUID } from '../../utils/utils'
import { DirectionalLight } from './DirectionalLight'
import { PointLight } from './PointLight'

export type LightsType = 'ambientLights' | 'directionalLights' | 'pointLights'
export type ShadowCastingLights = DirectionalLight | PointLight

export interface LightBaseParams {
  color?: Vec3
  intensity?: number
}

export interface LightParams extends LightBaseParams {
  index?: number
  type?: string | LightsType
}

export class Light extends Object3D {
  type: string | LightsType
  uuid: string
  index: number
  renderer: CameraRenderer

  options: LightBaseParams

  color: Vec3
  #intensity: number
  #intensityColor: Vec3

  rendererBinding: BufferBinding | null

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

  setRendererBinding() {
    if (this.renderer.bindings[this.type]) {
      this.rendererBinding = this.renderer.bindings[this.type]
    }
  }

  reset() {
    this.setRendererBinding()
    this.onPropertyChanged('color', this.#intensityColor.copy(this.color).multiplyScalar(this.intensity))
  }

  get intensity(): number {
    return this.#intensity
  }

  set intensity(value: number) {
    this.#intensity = value
    this.onPropertyChanged('color', this.#intensityColor.copy(this.color).multiplyScalar(this.intensity))
  }

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

  onMaxLightOverflow(lightsType: LightsType) {
    if (this.rendererBinding) {
      this.renderer.onMaxLightOverflow(lightsType)
      this.rendererBinding = this.renderer.bindings[lightsType]
    }
  }

  remove() {
    this.renderer.removeLight(this)
  }

  destroy() {
    this.parent = null
  }
}
