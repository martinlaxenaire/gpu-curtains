import { Bindings } from './Bindings'
import { SamplerBindingResource, SamplerBindingsParams } from '../../types/core/bindings/SamplerBindings'

export class SamplerBindings extends Bindings {
  resource: SamplerBindingResource
  wgslGroupFragment: string[]

  constructor({
    label = 'Sampler',
    name = 'Texture',
    resource,
    bindingType,
    bindIndex = 0,
    visibility,
  }: SamplerBindingsParams) {
    bindingType = bindingType ?? 'sampler'

    super({ label, name, bindIndex, bindingType, visibility })

    this.resource = resource // should be a sampler

    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslGroupFragment = [`var ${this.name}: ${this.bindingType};`]
  }
}
