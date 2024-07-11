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
  position: Vec3
  target: Vec3
  #direction: Vec3
  #actualPosition: Vec3

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
    super(renderer, { color, intensity, index: directionalLightIndex++ })

    this.type = 'directionalLights'

    this.rendererBinding = this.renderer.bindings[this.type]

    if (this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
      this.onMaxLightOverflow(this.type as LightsType)
    }

    this.parent = this.renderer.scene

    this.init({ color, intensity, position, target })

    this.shadow = new DirectionalShadow(this.renderer, { light: this })

    if (shadow) {
      this.shadow.setParameters(shadow)
    }
  }

  init({ color, intensity, position, target }: DirectionalLightBaseParams) {
    super.init({ color, intensity })

    this.rendererBinding.inputs.count.value = directionalLightIndex
    this.rendererBinding.inputs.count.shouldUpdate = true

    this.#direction = new Vec3()
    this.#actualPosition = new Vec3()
    this.target = target
    this.target.onChange(() => this.setDirection())
    this.position.copy(position)
  }

  setDirection() {
    this.#direction.copy(this.target).sub(this.worldMatrix.getTranslation(this.#actualPosition))
    this.onPropertyChanged('direction', this.#direction)

    this.shadow.updateViewMatrix(this.#actualPosition, this.target)
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

  destroy() {
    super.destroy()
    this.shadow.destroy()
  }
}
