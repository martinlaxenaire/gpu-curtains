import { BindGroupBinding, BindGroupBindingProps } from './BindGroupBinding'

type SamplerBindingResource = GPUSampler | null

interface BindGroupSamplerBindingProps extends BindGroupBindingProps {
  resource: SamplerBindingResource
}

export class BindGroupSamplerBinding extends BindGroupBinding {
  resource: SamplerBindingResource
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, resource, visibility }: BindGroupSamplerBindingProps)
}
