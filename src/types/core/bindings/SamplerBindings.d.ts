import { BindingsParams } from './Bindings'

export type SamplerBindingResource = GPUSampler | null

export interface SamplerBindingsParams extends BindingsParams {
  resource: SamplerBindingResource
}
