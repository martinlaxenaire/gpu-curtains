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
  position: Vec3
  #range: number
  #actualPosition: Vec3

  shadow: PointShadow

  constructor(
    renderer,
    { color = new Vec3(1), intensity = 1, position = new Vec3(), range = 0, shadow = null } = {} as PointLightBaseParams
  ) {
    super(renderer, { color, intensity, index: pointLightIndex++ })

    this.type = 'pointLights'

    this.rendererBinding = this.renderer.bindings[this.type]

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.parent = this.renderer.scene

    this.init({ color, intensity, position, range })

    this.shadow = new PointShadow(this.renderer, { light: this })

    if (shadow) {
      this.shadow.setParameters(shadow)
    }
  }

  init({ color, intensity, position, range }: PointLightBaseParams) {
    super.init({ color, intensity })

    this.rendererBinding.inputs.count.value = pointLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.#actualPosition = new Vec3()
    this.position.copy(position)

    this.range = range
  }

  get range(): number {
    return this.#range
  }

  set range(value: number) {
    this.#range = value
    this.onPropertyChanged('range', this.range)
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
      this.onPropertyChanged('position', this.worldMatrix.getTranslation(this.#actualPosition))
      this.shadow.updateViewMatrices(this.#actualPosition)
    }
  }

  destroy() {
    super.destroy()
    this.shadow.destroy()
  }
}
