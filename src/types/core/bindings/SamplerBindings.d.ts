//import { Bindings, BindingsParams } from './Bindings'
import { BindingsParams } from './Bindings'

export type SamplerBindingResource = GPUSampler | null

export interface SamplerBindingsParams extends BindingsParams {
  resource: SamplerBindingResource
}

// export class SamplerBindings extends Bindings {
//   resource: SamplerBindingResource
//   wgslGroupFragment: string[]
//
//   constructor({ label, name, bindingType, bindIndex, resource, visibility }: SamplerBindingsParams)
// }
