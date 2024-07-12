import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'
import { PointShadow, PointShadowParams } from '../shadows/PointShadow'

let pointLightIndex = 0

export interface PointLightBaseParams extends LightBaseParams {
  position?: Vec3
  range?: number
  shadow?: PointShadowParams
}

export class PointLight extends Light {
  #range: number
  #actualPosition: Vec3

  options: PointLightBaseParams

  shadow: PointShadow

  constructor(
    renderer,
    { color = new Vec3(1), intensity = 1, position = new Vec3(), range = 0, shadow = null } = {} as PointLightBaseParams
  ) {
    super(renderer, { color, intensity, index: pointLightIndex++, type: 'pointLights' })

    this.options = {
      ...this.options,
      position,
      range,
      shadow,
    }

    this.#actualPosition = new Vec3()
    this.position.copy(position)

    this.range = range

    this.parent = this.renderer.scene

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.rendererBinding.inputs.count.value = pointLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.shadow = new PointShadow(this.renderer, { light: this })

    if (shadow) {
      this.shadow.cast(shadow)
    }
  }

  reset() {
    super.reset()
    this.onPropertyChanged('range', this.range)
    this.setPosition()

    this.shadow?.reset()
  }

  get range(): number {
    return this.#range
  }

  set range(value: number) {
    this.#range = value
    this.onPropertyChanged('range', this.range)
  }

  setPosition() {
    this.onPropertyChanged('position', this.worldMatrix.getTranslation(this.#actualPosition))
    this.shadow?.updateViewMatrices(this.#actualPosition)
  }

  // explicitly disable scale and transform origin transformations

  /** @ignore */
  applyScale() {}

  /** @ignore */
  applyTransformOrigin() {}

  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new position from the matrix translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.setPosition()
    }
  }

  onMaxLightOverflow(lightsType: LightsType) {
    super.onMaxLightOverflow(lightsType)
    this.shadow?.setRendererBinding()
  }

  destroy() {
    super.destroy()
    this.shadow.destroy()
  }
}
