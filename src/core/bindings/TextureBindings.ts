import { Bindings } from './Bindings'
import { TextureBindingResource, TextureBindingsParams } from '../../types/core/bindings/TextureBindings'
import { BindingType } from '../../types/core/bindings/Bindings'

export class TextureBindings extends Bindings {
  resource: TextureBindingResource
  wgslGroupFragment: string[]

  constructor({
    label = 'Texture',
    name = 'Texture',
    resource,
    bindingType,
    bindIndex = 0,
    visibility,
  }: TextureBindingsParams) {
    bindingType = bindingType ?? 'texture'

    super({ label, name, bindingType, bindIndex, visibility })

    this.resource = resource // should be a texture or an external texture

    this.setWGSLFragment()
  }

  setBindingType(bindingType: BindingType) {
    this.bindingType = bindingType
    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslGroupFragment = [
      this.bindingType === 'externalTexture'
        ? `var ${this.name}: texture_external;`
        : `var ${this.name}: texture_2d<f32>;`,
    ]
  }
}
