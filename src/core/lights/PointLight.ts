import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'

let pointLightIndex = 0

export interface PointLightBaseParams extends LightBaseParams {
  position?: Vec3
  range?: number
}

export class PointLight extends Light {
  position: Vec3
  #range: number

  constructor(
    renderer,
    { color = new Vec3(1), intensity = 1, position = new Vec3(), range = 0 } = {} as PointLightBaseParams
  ) {
    super(renderer, { color, intensity, index: pointLightIndex++ })

    this.type = 'pointLights'

    this.rendererBinding = this.renderer.lightsBufferBindings[this.type]

    if (this.index + 1 > this.renderer.lightsBufferBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.init({ color, intensity, position, range })
  }

  init({ color, intensity, position, range }) {
    super.init({ color, intensity })

    this.rendererBinding.inputs.count.value = pointLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.position = position
    this.position.onChange(() => this.onPropertyChanged('position', this.position))
    this.onPropertyChanged('position', this.position)

    this.range = range
  }

  get range(): number {
    return this.#range
  }

  set range(value: number) {
    this.#range = value
    this.onPropertyChanged('range', this.range)
  }
}
