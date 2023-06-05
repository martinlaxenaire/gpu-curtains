import { BindGroupBinding } from './BindGroupBinding'

export class BindGroupSamplerBinding extends BindGroupBinding {
  constructor({ label = 'Sampler', name = 'Texture', resource, bindingType = 'sampler', bindIndex = 0, visibility }) {
    super({ label, name, bindIndex, bindingType, visibility })

    this.resource = resource // should be a sampler

    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslGroupFragment = `var ${this.name}Sampler: ${this.bindingType};`
  }
}
