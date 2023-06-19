import { Bindings, BindingsParams } from './Bindings'

type SamplerBindingResource = GPUSampler | null

interface SamplerBindingsParams extends BindingsParams {
  resource: SamplerBindingResource
}

export class SamplerBindings extends Bindings {
  resource: SamplerBindingResource
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, resource, visibility }: SamplerBindingsParams)
}
