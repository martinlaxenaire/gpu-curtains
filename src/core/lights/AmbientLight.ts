import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'

let ambientLightIndex = 0

export class AmbientLight extends Light {
  constructor(renderer, { color = new Vec3(1), intensity = 0.1 } = {} as LightBaseParams) {
    super(renderer, { color, intensity, index: ambientLightIndex++ })

    this.type = 'ambientLights'

    this.rendererBinding = this.renderer.lightsBufferBindings[this.type]

    if (this.index + 1 > this.renderer.lightsBufferBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.init({ color, intensity })
  }

  init({ color, intensity }) {
    this.rendererBinding.inputs.count.value = ambientLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    super.init({ color, intensity })
  }
}
