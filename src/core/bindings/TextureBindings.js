import { Bindings } from './Bindings'

export class TextureBindings extends Bindings {
  constructor({ label = 'Texture', name = 'Texture', resource, bindingType, bindIndex = 0, visibility }) {
    bindingType = bindingType ?? 'texture'

    super({ label, name, bindingType, bindIndex, visibility })

    this.resource = resource // should be a texture or an external texture

    this.setWGSLFragment()
  }

  setBindingType(bindingType) {
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
