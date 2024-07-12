import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'

let ambientLightIndex = 0

export class AmbientLight extends Light {
  constructor(renderer, { color = new Vec3(1), intensity = 0.1 } = {} as LightBaseParams) {
    super(renderer, { color, intensity, index: ambientLightIndex++, type: 'ambientLights' })

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.rendererBinding.inputs.count.value = ambientLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true
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
