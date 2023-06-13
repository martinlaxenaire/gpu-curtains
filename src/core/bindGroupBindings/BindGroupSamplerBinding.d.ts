import { BindGroupBinding, BindGroupBindingParams } from './BindGroupBinding'

type SamplerBindingResource = GPUSampler | null

interface BindGroupSamplerBindingParams extends BindGroupBindingParams {
  resource: SamplerBindingResource
}

export class BindGroupSamplerBinding extends BindGroupBinding {
  resource: SamplerBindingResource
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, resource, visibility }: BindGroupSamplerBindingParams)
}
