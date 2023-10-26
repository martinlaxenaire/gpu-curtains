//import { Bindings, BindingsParams } from './Bindings'
import { BindingsParams } from './Bindings'

export type TextureBindingResource = GPUTextureView | GPUExternalTexture | null

export interface TextureBindingsParams extends BindingsParams {
  resource: TextureBindingResource
}

// export class TextureBindings extends Bindings {
//   resource: TextureBindingResource
//   wgslGroupFragment: string[]
//
//   constructor({ label, name, bindingType, bindIndex, resource, visibility }: TextureBindingsParams)
// }
