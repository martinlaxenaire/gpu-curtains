import { Vec3 } from '../../math/Vec3'
import { CameraRenderer, isCameraRenderer } from '../renderers/utils'
import { BufferBinding } from '../bindings/BufferBinding'

export type LightsType = 'ambientLights' | 'directionalLights' | 'pointLights'

export interface LightBaseParams {
  color?: Vec3
  intensity?: number
}

export interface LightParams extends LightBaseParams {
  index?: number
}

export class Light {
  type: string | LightsType
  index: number
  renderer: CameraRenderer

  color: Vec3
  #intensity: number
  #intensityColor: Vec3

  rendererBinding: BufferBinding | null

  constructor(renderer: CameraRenderer, { color = new Vec3(1), intensity = 1, index = 0 } = {} as LightParams) {
    this.type = 'light'

    Object.defineProperty(this as Light, 'index', { value: index })

    renderer = isCameraRenderer(renderer, this.constructor.name)

    this.renderer = renderer

    this.rendererBinding = null // should be explicitly set by inheriting classes
  }

  init({ color, intensity }) {
    this.color = color
    this.#intensityColor = this.color.clone()
    this.color.onChange(() =>
      this.onPropertyChanged('color', this.#intensityColor.copy(this.color).multiplyScalar(this.intensity))
    )

    this.intensity = intensity
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

        this.rendererBinding.inputs[propertyKey].shouldUpdate = true
      } else {
        this.rendererBinding.inputs[propertyKey].value[this.index] = value
        this.rendererBinding.inputs[propertyKey].shouldUpdate = true
      }

      this.renderer.shouldUpdateCameraLightsBindGroup()
    }
  }

  onMaxLightOverflow(lightsType: LightsType) {
    if (this.rendererBinding) {
      this.renderer.onMaxLightOverflow(lightsType)
      this.rendererBinding = this.renderer.lightsBufferBindings[lightsType]
    }
  }
}
