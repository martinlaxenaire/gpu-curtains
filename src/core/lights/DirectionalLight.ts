import { Light, LightBaseParams, LightsType } from './Light'
import { Vec3 } from '../../math/Vec3'
import { DirectionalShadow, DirectionalShadowParams } from '../shadows/DirectionalShadow'

let directionalLightIndex = 0

export interface DirectionalLightBaseParams extends LightBaseParams {
  position?: Vec3
  target?: Vec3
  shadow?: DirectionalShadowParams
}

export class DirectionalLight extends Light {
  target: Vec3
  #direction: Vec3
  #actualPosition: Vec3

  options: DirectionalLightBaseParams

  shadow: DirectionalShadow

  constructor(
    renderer,
    {
      color = new Vec3(1),
      intensity = 1,
      position = new Vec3(),
      target = new Vec3(),
      shadow = null,
    } = {} as DirectionalLightBaseParams
  ) {
    super(renderer, { color, intensity, index: directionalLightIndex++, type: 'directionalLights' })

    this.options = {
      ...this.options,
      position,
      target,
      shadow,
    }

    this.#direction = new Vec3()
    this.#actualPosition = new Vec3()
    this.target = target
    this.target.onChange(() => this.setDirection())
    this.position.copy(position)

    this.parent = this.renderer.scene

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.rendererBinding.inputs.count.value = directionalLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.shadow = new DirectionalShadow(this.renderer, { light: this })

    if (shadow) {
      this.shadow.cast(shadow)
    }
  }

  reset() {
    super.reset()
    this.setDirection()

    this.shadow?.reset()
  }

  setDirection() {
    this.#direction.copy(this.target).sub(this.worldMatrix.getTranslation(this.#actualPosition))
    this.onPropertyChanged('direction', this.#direction)

    this.shadow?.updateViewMatrix(this.#actualPosition, this.target)
  }

  // explicitly disable scale and transform origin transformations

  /** @ignore */
  applyScale() {}

  /** @ignore */
  applyTransformOrigin() {}

  /**
   * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the matrix translation.
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.setDirection()
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
