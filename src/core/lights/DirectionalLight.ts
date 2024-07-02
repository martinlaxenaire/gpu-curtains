import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'

let directionalLightIndex = 0

export interface DirectionalLightBaseParams extends LightBaseParams {
  position?: Vec3
}

export class DirectionalLight extends Light {
  position: Vec3

  constructor(
    renderer,
    { color = new Vec3(1), intensity = 1, position = new Vec3() } = {} as DirectionalLightBaseParams
  ) {
    super(renderer, { color, intensity, index: directionalLightIndex++ })

    this.type = 'directionalLights'

    this.rendererBinding = this.renderer.lightsBufferBindings[this.type]

    if (this.index + 1 > this.renderer.lightsBufferBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.init({ color, intensity, position })
  }

  init({ color, intensity, position }) {
    super.init({ color, intensity })

    this.rendererBinding.inputs.count.value = directionalLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.position = position
    this.position.onChange(() => this.onPropertyChanged('position', this.position))
    this.onPropertyChanged('position', this.position)
  }

  // onColorChanged() {
  //   this.rendererBinding.inputs.color.value[this.index * 3] = this.color.x
  //   this.rendererBinding.inputs.color.value[this.index * 3 + 1] = this.color.y
  //   this.rendererBinding.inputs.color.value[this.index * 3 + 2] = this.color.z
  //
  //   this.rendererBinding.inputs.color.shouldUpdate = true
  // }
  //
  // onIntensityChanged() {
  //   this.rendererBinding.inputs.intensity.value[this.index] = this.intensity
  //   this.rendererBinding.inputs.intensity.shouldUpdate = true
  // }

  // onPositionChanged() {
  //   this.rendererBinding.inputs.position.value[this.index * 3] = this.position.x
  //   this.rendererBinding.inputs.position.value[this.index * 3 + 1] = this.position.y
  //   this.rendererBinding.inputs.position.value[this.index * 3 + 2] = this.position.z
  //
  //   this.rendererBinding.inputs.position.shouldUpdate = true
  // }
}
