import { Bindings } from './Bindings'

export class SamplerBindings extends Bindings {
  constructor({ label = 'Sampler', name = 'Texture', resource, bindingType, bindIndex = 0, visibility }) {
    bindingType = bindingType ?? 'sampler'

    super({ label, name, bindIndex, bindingType, visibility })

    this.resource = resource // should be a sampler

    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslGroupFragment = [`var ${this.name}: ${this.bindingType};`]
  }
}
